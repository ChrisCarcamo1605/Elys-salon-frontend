import { useState, useEffect, useRef, useCallback } from 'react';
import { useTweaks, TweaksPanel, TweakSection, TweakToggle, TweakColor, TweakRadio, TweakSlider, TweakButton } from './tweaks-panel.jsx';
import { Icons } from './icons.jsx';
import { LockScreen } from './lockscreen.jsx';
import { LoginScreen } from './login.jsx';
import { setToken, clearToken, getDeviceToken, setDeviceToken, clearDeviceToken, auth, staff as staffApi, settings as settingsApi } from './api.js';
import { fmtMoney } from './utils.js';
import { TopBar, MainMenu } from './menu.jsx';
import { SaleScreen } from './sales.jsx';
import { Analytics } from './analytics.jsx';
import { Staff, TimeClock } from './staff.jsx';
import { Reports } from './reports.jsx';
import { Inventory, Progress, Team, Settings } from './screens.jsx';


// Hash-based router — keeps browser/mobile back button working within the app.
function useHashRouter() {
  const parse = () => window.location.hash.replace(/^#\/?/, '') || 'menu';
  const [route, setRouteState] = useState(parse);

  useEffect(() => {
    const onPop = () => setRouteState(parse());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((name, { replace = false } = {}) => {
    const hash = name === 'menu' ? '#/' : `#/${name}`;
    if (replace) history.replaceState(null, '', hash);
    else history.pushState(null, '', hash);
    setRouteState(name);
    window.scrollTo(0, 0);
  }, []);

  return [route, navigate];
}

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
  "darkMode": true,
  "accent": "#de0fab",
  "density": "comfortable",
  "lockTimeoutSec": 120,
  "lockAfterSale": true,
  "lockOnSwitch": true,
};

const BYPASS_AUTH = import.meta.env.VITE_BYPASS_AUTH === 'true';

function WakeUpScreen({ waking }) {
  return (
    <div className="wakeup-root">
      <div className="wakeup-card">
        <div className="wakeup-logo">
          <img src="/assets/logo.jpg" alt="Ely's Salón" />
        </div>
        <div className="wakeup-spinner" />
        <div className="wakeup-title">
          {waking ? 'Iniciando servicio…' : 'Conectando…'}
        </div>
        {waking && (
          <div className="wakeup-sub">
            El servidor está despertando, esto puede tomar unos segundos.
          </div>
        )}
      </div>
    </div>
  );
}
const DEV_USER = {
  id: 0, name: 'Dev Admin', role: 'admin',
  color: '#de0fab', initials: 'DA', permissions: {},
  monthStats: { totalSales: 0, retailSales: 0, servicesDone: 0, newClients: 0, tipsCollected: 0 },
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
  const [hasDeviceToken, setHasDeviceToken] = useState(
    () => BYPASS_AUTH || import.meta.env.DEV || !!getDeviceToken(),
  );
  const [route, setRoute] = useHashRouter();
  const [lockReason, setLockReason] = useState("");
  const [toast, setToast] = useState(null);
  const [apiStatus, setApiStatus] = useState('checking'); // 'checking' | 'waking' | 'ready'
  const [staffHints, setStaffHints] = useState([]);
  const inactivityRef = useRef(null);
  const setTweakRef = useRef(setTweak);
  setTweakRef.current = setTweak;

  // Ping backend on mount; show wake-up screen if cold-starting
  useEffect(() => {
    let cancelled = false;
    let wakingTimer = null;

    const ping = () => {
      staffApi.public()
        .then((items) => {
          if (cancelled) return;
          clearTimeout(wakingTimer);
          setStaffHints(Array.isArray(items) ? items : []);
          setApiStatus('ready');
        })
        .catch(() => {
          if (cancelled) return;
          setTimeout(ping, 4000);
        });
    };

    // Show waking screen only after 500ms to avoid flicker on fast backends
    wakingTimer = setTimeout(() => {
      if (!cancelled) setApiStatus('waking');
    }, 500);

    ping();

    return () => { cancelled = true; clearTimeout(wakingTimer); };
  }, []);

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
    const evts = ["mousemove", "mousedown", "keydown", "touchstart", "touchmove", "scroll"];
    evts.forEach((e) => window.addEventListener(e, reset, { passive: true, capture: true }));
    reset();
    return () => {
      clearTimeout(inactivityRef.current);
      evts.forEach((e) => window.removeEventListener(e, reset, { capture: true }));
    };
  }, [user, t.lockTimeoutSec]);

  // Listen for session expiry (401 from api.js)
  useEffect(() => {
    if (BYPASS_AUTH) return;
    const onExpired = () => lock("Sesión expirada — vuelve a ingresar tu PIN");
    window.addEventListener('elys:session-expired', onExpired);
    return () => window.removeEventListener('elys:session-expired', onExpired);
  }, []);

  // Dark mode toggle from TopBar button
  useEffect(() => {
    const handler = () => setTweak("darkMode", document.documentElement.dataset.theme !== "dark");
    window.addEventListener('elys:toggle-dark', handler);
    return () => window.removeEventListener('elys:toggle-dark', handler);
  }, [setTweak]);

  const lock = (reason = "") => {
    auth.lock();
    clearToken();
    setLockReason(reason);
    setUser(null);
    setRoute("menu", { replace: true });
  };

  const logout = () => {
    auth.logout();
    clearToken();
    clearDeviceToken();
    setHasDeviceToken(false);
    setLockReason("");
    setUser(null);
    setRoute("menu", { replace: true });
  };

  const completeSale = ({ total, items }) => {
    const willLock = t.lockAfterSale !== false;
    setToast({
      title: "Venta cobrada",
      sub: `${items} ${items === 1 ? "ítem" : "ítems"} · ${fmtMoney(total)}${willLock ? " · Terminal bloqueada" : ""}`,
    });
    setTimeout(() => setToast(null), 3800);
    if (willLock) lock("Bloqueo automático tras cobro");
    else setRoute("menu", { replace: true });
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
    const onUnlock = ({ user, token }) => {
      setToken(token);
      setUser(user);
      setLockReason("");
    };

    const onLogin = ({ user, token }) => {
      setToken(token);
      setUser(user);
      setHasDeviceToken(true);
      setLockReason("");
    };

    const onDeviceExpired = () => {
      clearDeviceToken();
      setHasDeviceToken(false);
    };

    if (apiStatus !== 'ready') {
      return <WakeUpScreen waking={apiStatus === 'waking'} />;
    }

    return (
      <>
        {hasDeviceToken
          ? (
            <LockScreen
              onUnlock={onUnlock}
              onDeviceExpired={onDeviceExpired}
              reason={lockReason}
              hints={staffHints}
            />
          )
          : (
            <LoginScreen onLogin={onLogin} />
          )
        }
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
          onBack={() => setRoute("menu", { replace: true })}
          onComplete={completeSale}
          lockAfterSale={t.lockAfterSale}
        />
      );
      break;
    case "analytics":
      content = <Analytics user={user} onLock={lockBtn} onBack={() => setRoute("menu", { replace: true })}/>;
      break;
    case "inventory":
      content = <Inventory user={user} onLock={lockBtn} onBack={() => setRoute("menu", { replace: true })}/>;
      break;
    case "progress":
      content = <Progress user={user} onLock={lockBtn} onBack={() => setRoute("menu", { replace: true })}/>;
      break;
    case "staff":
      content = <Staff user={user} onLock={lockBtn} onBack={() => setRoute("menu", { replace: true })}/>;
      break;
    case "reports":
      content = <Reports user={user} onLock={lockBtn} onBack={() => setRoute("menu", { replace: true })} onNav={setRoute}/>;
      break;
    case "timeclock":
      content = <TimeClock user={user} onLock={lockBtn} onBack={() => setRoute("menu", { replace: true })}/>;
      break;
    case "settings":
      content = <Settings user={user} onLock={lockBtn} onBack={() => setRoute("menu", { replace: true })} onLogout={logout}/>;
      break;
    default:
      content = (
        <MainMenu
          user={user}
          onNav={setRoute}
          onLock={lockBtn}
          onLogout={logout}
          lockTimeoutSec={t.lockTimeoutSec}
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