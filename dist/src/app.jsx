// App shell — auth + navigation + auto-lock + tweaks
const { useState: uS, useEffect: uE, useRef: uR } = React;

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
  // 1 year, root path, lax
  const exp = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${APP_COOKIE}=${value}; expires=${exp}; path=/; SameSite=Lax`;
};

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "darkMode": false,
  "accent": "#de0fab",
  "density": "comfortable",
  "lockTimeoutSec": 120
}/*EDITMODE-END*/;

function App() {
  const data = window.ElysData;

  // Merge cookie prefs over file defaults, so the user's last appearance
  // choice wins even before Tweaks initialises.
  const cookiePrefs = readCookie() || {};
  const mergedDefaults = { ...TWEAK_DEFAULTS, ...cookiePrefs };
  const [t, setTweakRaw] = window.useTweaks(mergedDefaults);

  // Wrap setTweak so every change also persists to a cookie. This guarantees
  // the UI keeps the user's appearance across reloads even when the editor's
  // EDITMODE rewrite is unavailable (e.g. production deployment).
  const setTweak = React.useCallback((keyOrEdits, val) => {
    const edits = (keyOrEdits && typeof keyOrEdits === "object")
      ? keyOrEdits : { [keyOrEdits]: val };
    setTweakRaw(edits);
    const prev = readCookie() || {};
    writeCookie({ ...prev, ...edits });
  }, [setTweakRaw]);

  const [user, setUser] = uS(null);
  const [route, setRoute] = uS("menu");
  const [lockReason, setLockReason] = uS("");
  const [toast, setToast] = uS(null);
  const inactivityRef = uR(null);

  // Apply dark mode + accent + density
  uE(() => {
    document.documentElement.dataset.theme = t.darkMode ? "dark" : "light";
    document.documentElement.style.setProperty("--magenta", t.accent || "#de0fab");
    document.documentElement.dataset.density = t.density || "comfortable";
  }, [t.darkMode, t.accent, t.density]);

  // Auto-lock after inactivity
  uE(() => {
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

  const lock = (reason = "") => {
    setLockReason(reason);
    setUser(null);
    setRoute("menu");
  };

  const completeSale = ({ total, items }) => {
    setToast({
      title: "Venta cobrada",
      sub: `${items} ${items === 1 ? "ítem" : "ítems"} · $${total.toFixed(2)} · Terminal bloqueada`,
    });
    setTimeout(() => setToast(null), 3800);
    lock("Bloqueo automático tras cobro");
  };

  const TweaksUI = (
    <window.TweaksPanel title="Tweaks · Ely's Salón">
      <window.TweakSection label="Apariencia"/>
      <window.TweakToggle
        label="Modo oscuro"
        value={t.darkMode}
        onChange={(v) => setTweak("darkMode", v)}
      />
      <window.TweakColor
        label="Color de acento"
        value={t.accent}
        options={["#de0fab", "#7b2cbf", "#0fb0de", "#10b981", "#f59e0b"]}
        onChange={(v) => setTweak("accent", v)}
      />
      <window.TweakRadio
        label="Densidad"
        value={t.density}
        options={["compact", "comfortable"]}
        onChange={(v) => setTweak("density", v)}
      />
      <window.TweakSection label="Seguridad"/>
      <window.TweakSlider
        label="Bloqueo por inactividad"
        unit="s"
        min={30}
        max={600}
        step={30}
        value={t.lockTimeoutSec}
        onChange={(v) => setTweak("lockTimeoutSec", v)}
      />
      {user && (
        <window.TweakButton
          label="Bloquear ahora"
          onClick={() => lock("Sesión bloqueada manualmente")}
        />
      )}
    </window.TweaksPanel>
  );

  if (!user) {
    return (
      <>
        <LockScreen
          users={data.users}
          onUnlock={(u) => {
            setUser(u);
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
          data={data}
          onLock={lockBtn}
          onBack={() => setRoute("menu")}
          onComplete={completeSale}
        />
      );
      break;
    case "analytics":
      content = <Analytics user={user} data={data} onLock={lockBtn} onBack={() => setRoute("menu")}/>;
      break;
    case "inventory":
      content = <Inventory user={user} data={data} onLock={lockBtn} onBack={() => setRoute("menu")}/>;
      break;
    case "progress":
      content = <Progress user={user} data={data} onLock={lockBtn} onBack={() => setRoute("menu")}/>;
      break;
    case "staff":
      content = <Staff user={user} data={data} onLock={lockBtn} onBack={() => setRoute("menu")}/>;
      break;
    case "reports":
      content = <Reports user={user} data={data} onLock={lockBtn} onBack={() => setRoute("menu")} onNav={setRoute}/>;
      break;
    case "timeclock":
      content = <TimeClock user={user} data={data} onLock={lockBtn} onBack={() => setRoute("menu")}/>;
      break;
    case "settings":
      content = <Settings user={user} data={data} onLock={lockBtn} onBack={() => setRoute("menu")}/>;
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

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
