import { useState, useEffect } from 'react';
import { Icons } from './icons.jsx';
import { auth, staff as staffApi, apiError } from './api.js';

function LockScreen({ onUnlock, onDeviceExpired, reason }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hints, setHints] = useState([]);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    staffApi.public()
      .then((items) => { if (Array.isArray(items)) setHints(items); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000 * 30);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (loading) return;
      if (e.key >= "0" && e.key <= "9") push(e.key);
      else if (e.key === "Backspace") back();
      else if (e.key === "Enter") submit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pin, loading]);

  const push = (d) => {
    if (pin.length >= 4 || loading) return;
    const next = pin + d;
    setPin(next);
    setError("");
    if (next.length === 4) setTimeout(() => trySubmit(next), 120);
  };

  const back = () => {
    if (loading) return;
    setPin((p) => p.slice(0, -1));
    setError("");
  };

  const submit = () => trySubmit(pin);

  const trySubmit = async (val) => {
    if (val.length !== 4 || loading) return;
    setLoading(true);
    try {
      const { token, user, monthStats } = await auth.unlock(val);
      onUnlock({ user: { ...user, monthStats }, token });
    } catch (err) {
      const status = err.response?.status;
      if (status === 403) {
        onDeviceExpired?.();
        return;
      }
      const msg =
        status === 429 ? "Demasiados intentos, espera 5 min" :
        status === 401 ? "PIN incorrecto" :
        apiError(err);
      setError(msg);
      setShake(true);
      setTimeout(() => setShake(false), 450);
      setTimeout(() => setPin(""), 250);
    } finally {
      setLoading(false);
    }
  };

  const timeStr = now.toLocaleTimeString("es-SV", { hour: "2-digit", minute: "2-digit", hour12: false });
  const dateStr = now.toLocaleDateString("es-SV", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="lock-root">
      {/* Desktop top status bar */}
      <div className="lock-statusbar">
        <div className="lock-statusbar-brand">
          <div className="lock-statusbar-logo">
            <img src="/assets/logo.jpg" alt="" />
          </div>
          <span>Ely's <span className="lock-statusbar-accent">Salón</span></span>
        </div>
        <div className="lock-statusbar-time">
          <span>{timeStr}</span>
          <span>·</span>
          <span>{dateStr}</span>
        </div>
      </div>

      {/* Mobile-only header shown above the card */}
      <div className="lock-above-card">
        <div className="lock-logo lock-logo-lg">
          <img src="/assets/logo.jpg" alt="Ely's Salón" />
        </div>
        <div className="lock-title">Bienvenida de vuelta</div>
        <div className="lock-sub">Ingresa tu PIN para continuar</div>
      </div>

      {/* Main glass card */}
      <div className="lock-card">
        {/* Inside card: logo + heading for desktop */}
        <div className="lock-card-header">
          <div className="lock-logo">
            <img src="/assets/logo.jpg" alt="Ely's Salón" />
          </div>
          <div className="lock-title">Bienvenida de vuelta</div>
          <div className="lock-sub">Ingresa tu PIN para continuar</div>
        </div>

        {reason && <div className="lock-reason">{reason}</div>}

        <div className={`pin-dots ${shake ? "shake" : ""} ${error ? "err" : ""}`}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`pin-dot ${pin.length > i ? "filled" : ""}`} />
          ))}
        </div>

        <div className="pin-error">{error || " "}</div>

        <div className="keypad">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
            <button key={d} className="key" onClick={() => push(d)} disabled={loading}>
              {d}
            </button>
          ))}
          <button className="key key-ghost" onClick={() => setPin("")} disabled={loading}>
            <Icons.X size={16}/>
          </button>
          <button className="key" onClick={() => push("0")} disabled={loading}>
            0
          </button>
          <button className="key key-ghost" onClick={back} disabled={loading}>
            <Icons.Backspace size={18}/>
          </button>
        </div>

        <div className="lock-foot">
          {loading
            ? <><Icons.Clock size={13}/> Verificando…</>
            : <><span className="lock-foot-dot"/>{" "}Terminal segura · Auto-bloqueo activo</>
          }
        </div>

        {import.meta.env.DEV && (
          <div className="lock-dev-hint">
            <span className="lock-dev-badge">DEV</span>
            admin <strong>1234</strong> · empleada <strong>2222</strong>
          </div>
        )}
      </div>

      {/* Desktop bottom user pills */}
      {hints.length > 0 && (
        <div className="lock-pills">
          {hints.map((u) => (
            <div className="lock-pill" key={u.id}>
              <div className="lock-pill-avatar" style={{ background: u.color }}>
                {u.initials}
              </div>
              <span className="lock-pill-name">{u.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export { LockScreen };
