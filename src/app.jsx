import { useState, useEffect, useRef, useCallback } from 'react';
import { useTweaks, TweaksPanel, TweakSection, TweakToggle, TweakColor, TweakRadio, TweakSlider, TweakButton } from './tweaks-panel.jsx';
import { Icons } from './icons.jsx';
import { LockScreen } from './lockscreen.jsx';
import { setToken, clearToken, auth, settings as settingsApi } from './api.js';
import { TopBar, MainMenu } from './menu.jsx';
import { SaleScreen } from './sales.jsx';
import { Analytics } from './analytics.jsx';
import { Staff, TimeClock } from './staff.jsx';
import { Reports } from './reports.jsx';
import { Inventory, Progress, Team, Settings } from './screens.jsx';


// Cookie helpers — persist appearance settings across sessions.
const APP_COOKIE = "elys_prefs";
const readCookie = () => {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${APP_COOKIE}=([^;]*)`));
  if (!m) return null;
  try { return JSON.parse(decodeURIComponent(m[1])); } catch (e) { return null; }
};
const writeCookie = (obj) => {
  if (typeof document === "undefined") return;
  const value = encodeURIComponent(JSON.stringify(obj));
  const exp = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${APP_COOKIE}=${value}; expires=${exp}; path=/; SameSite=Lax`;
};

const TWEAK_DEFAULTS = {
  "darkMode": false,
  "accent": "#de0fab",
  "density": "comfortable",
  "lockTimeoutSec": 120,
  "lockAfterSale": true,
  "lockOnSwitch": true,
};

function App() {
  const cookiePrefs = readCookie() || {};
  const mergedDefaults = { ...TWEAK_DEFAULTS, ...cookiePrefs };
  const [t, setTweakRaw] = useTweaks(mergedDefaults);

  const setTweak = useCallback((keyOrEdits, val) => {
    const edits = (keyOrEdits && typeof keyOrEdits === "object")
      ? keyOrEdits : { [keyOrEdits]: val };
    setTweakRaw(edits);
    const prev = readCookie() || {};
    writeCookie({ ...prev, ...edits });
  }, [setTweakRaw]);

  const [user, setUser] = useState(null);
  const [route, setRoute] = useState("menu");
  const [lockReason, setLockReason] = useState("");
  const [toast, setToast] = useState(null);
  const inactivityRef = useRef(null);
  const setTweakRef = useRef(setTweak);
  setTweakRef.current = setTweak;

  // Load persisted lock settings from API and sync on updates
  useEffect(() => {
    const applyLock = (lock) => {
      if (!lock || typeof lock !== 'object') return;
      const updates = {};
      if (lock.timeoutSec !== undefined) updates.lockTimeoutSec = lock.timeoutSec;
      if (lock.lockAfterSale !== undefined) updates.lockAfterSale = lock.lockAfterSale;
      if (lock.lockOnSwitch !== undefined) updates.lockOnSwitch = lock.lockOnSwitch;
      if (Object.keys(updates).length > 0) setTweakRef.current(updates);
    };
    settingsApi.get().then((r) => applyLock(r.lock)).catch(() => {});
    const handler = (e) => applyLock(e.detail?.lock);
    window.addEventListener('elys:settings-updated', handler);
    return () => window.removeEventListener('elys:settings-updated', handler);
  }, []);

  // Apply dark mode + accent + density
  useEffect(() => {
    document.documentElement.dataset.theme = t.darkMode ? "dark" : "light";
    document.documentElement.style.setProperty("--magenta", t.accent || "#de0fab");
    document.documentElement.dataset.density = t.density || "comfortable";
  }, [t.darkMode, t.accent, t.density]);

  // Auto-lock after inactivity
  useEffect(() => {
    if (!user) return;
    const reset = () => {
      clearTimeout(inactivityRef.current);
      inactivityRef.current = setTimeout(() => {
        setLockReason(
          `Bloqueo automático tras ${Math.round((t.lockTimeoutSec || 120) / 60)} min de inactividad`
        );
        setUser(null);
      }, (t.lockTimeoutSec || 120) * 1000);
    };
    const evts = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
    evts.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      clearTimeout(inactivityRef.current);
      evts.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [user, t.lockTimeoutSec]);

  // Listen for session expiry (401 from api.js)
  useEffect(() => {
    const onExpired = () => lock("Sesión expirada — vuelve a ingresar tu PIN");
    window.addEventListener('elys:session-expired', onExpired);
    return () => window.removeEventListener('elys:session-expired', onExpired);
  }, []);

  const lock = (reason = "") => {
    auth.lock(); // auditoría en backend, fire-and-forget
    clearToken();
    setLockReason(reason);
    setUser(null);
    setRoute("menu");
  };

  const completeSale = ({ total, items }) => {
    const willLock = t.lockAfterSale !== false;
    setToast({
      title: "Venta cobrada",
      sub: `${items} ${items === 1 ? "ítem" : "ítems"} · $${total.toFixed(2)}${willLock ? " · Terminal bloqueada" : ""}`,
    });
    setTimeout(() => setToast(null), 3800);
    if (willLock) lock("Bloqueo automático tras cobro");
  };

  const TweaksUI = (
    <TweaksPanel title="Tweaks · Ely's Salón">
      <TweakSection label="Apariencia"/>
      <TweakToggle
        label="Modo oscuro"
        value={t.darkMode}
        onChange={(v) => setTweak("darkMode", v)}
      />
      <TweakColor
        label="Color de acento"
        value={t.accent}
        options={["#de0fab", "#7b2cbf", "#0fb0de", "#10b981", "#f59e0b"]}
        onChange={(v) => setTweak("accent", v)}
      />
      <TweakRadio
        label="Densidad"
        value={t.density}
        options={["compact", "comfortable"]}
        onChange={(v) => setTweak("density", v)}
      />
      <TweakSection label="Seguridad"/>
      <TweakSlider
        label="Bloqueo por inactividad"
        unit="s"
        min={30}
        max={600}
        step={30}
        value={t.lockTimeoutSec}
        onChange={(v) => setTweak("lockTimeoutSec", v)}
      />
      {user && (
        <TweakButton
          label="Bloquear ahora"
          onClick={() => lock("Sesión bloqueada manualmente")}
        />
      )}
    </TweaksPanel>
  );

  if (!user) {
    return (
      <>
        <LockScreen
          onUnlock={({ user, token }) => {
            setToken(token);
            setUser(user);
            setLockReason("");
          }}
          reason={lockReason}
        />
        {toast && (
          <div className="toast">
            <div className="toast-ico">
              <Icons.Check size={16}/>
            </div>
            <div>
              <div className="toast-title">{toast.title}</div>
              <div className="toast-sub">{toast.sub}</div>
            </div>
          </div>
        )}
        {TweaksUI}
      </>
    );
  }

  const lockBtn = () => lock("Sesión bloqueada manualmente");

  let content;
  switch (route) {
    case "sale":
      content = (
        <SaleScreen
          user={user}
          onLock={lockBtn}
          onBack={() => setRoute("menu")}
          onComplete={completeSale}
        />
      );
      break;
    case "analytics":
      content = <Analytics user={user} onLock={lockBtn} onBack={() => setRoute("menu")}/>;
      break;
    case "inventory":
      content = <Inventory user={user} onLock={lockBtn} onBack={() => setRoute("menu")}/>;
      break;
    case "progress":
      content = <Progress user={user} onLock={lockBtn} onBack={() => setRoute("menu")}/>;
      break;
    case "staff":
      content = <Staff user={user} onLock={lockBtn} onBack={() => setRoute("menu")}/>;
      break;
    case "reports":
      content = <Reports user={user} onLock={lockBtn} onBack={() => setRoute("menu")} onNav={setRoute}/>;
      break;
    case "timeclock":
      content = <TimeClock user={user} onLock={lockBtn} onBack={() => setRoute("menu")}/>;
      break;
    case "settings":
      content = <Settings user={user} onLock={lockBtn} onBack={() => setRoute("menu")}/>;
      break;
    default:
      content = (
        <MainMenu
          user={user}
          onNav={setRoute}
          onLock={lockBtn}
          onLogout={() => lock("Sesión cerrada")}
        />
      );
  }

  return (
    <>
      {content}
      {TweaksUI}
    </>
  );
}

export default App;