// Lock screen with PIN entry. Big logo, numeric keypad.
const { useState, useEffect, useRef } = React;

function LockScreen({ users, onUnlock, reason }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000 * 30);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key >= "0" && e.key <= "9") push(e.key);
      else if (e.key === "Backspace") back();
      else if (e.key === "Enter") submit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pin]);

  const push = (d) => {
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    setError("");
    if (next.length === 4) setTimeout(() => trySubmit(next), 120);
  };
  const back = () => {
    setPin((p) => p.slice(0, -1));
    setError("");
  };
  const submit = () => trySubmit(pin);

  const trySubmit = (val) => {
    const u = users.find((u) => u.pin === val);
    if (u) {
      onUnlock(u);
    } else {
      setError("PIN incorrecto");
      setShake(true);
      setTimeout(() => setShake(false), 450);
      setTimeout(() => setPin(""), 250);
    }
  };

  const timeStr = now.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false });
  const dateStr = now.toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="lock-root">
      <div className="lock-side">
        <div className="lock-side-top">
          <div className="lock-clock">{timeStr}</div>
          <div className="lock-date">{dateStr}</div>

          <div className="lock-tagline">
            <div className="lock-tagline-eyebrow">
              <Icons.Sparkle size={11}/> Ely's Salón
            </div>
            <div className="lock-tagline-text">
              Belleza profesional, <b>desde el primer detalle.</b>
            </div>
          </div>
        </div>

        <div className="lock-hints">
          <div className="lock-hint-title">Usuarios disponibles</div>
          {users.map((u) => (
            <div className="lock-hint" key={u.id}>
              <div className="lock-hint-avatar" style={{ background: u.color }}>
                {u.initials}
              </div>
              <div>
                <div className="lock-hint-name">{u.name}</div>
                <div className="lock-hint-role">
                  {u.role === "admin" ? "Administradora" : "Empleada"} · PIN <b>{u.pin}</b>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="lock-card">
        <div className="lock-logo">
          <img src="assets/logo.jpg" alt="Ely's Salón" />
        </div>
        <div className="lock-brand-name">
          <span style={{ color: "#26c6da" }}>Ely's</span>{" "}
          <span style={{ color: "var(--magenta)" }}>Salón</span>
        </div>
        <div className="lock-sub">Ingresa tu PIN para continuar</div>

        {reason && <div className="lock-reason">{reason}</div>}

        <div className={`pin-dots ${shake ? "shake" : ""} ${error ? "err" : ""}`}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`pin-dot ${pin.length > i ? "filled" : ""}`} />
          ))}
        </div>

        <div className="pin-error">{error || "\u00A0"}</div>

        <div className="keypad">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
            <button key={d} className="key" onClick={() => push(d)}>
              {d}
            </button>
          ))}
          <button className="key key-ghost" onClick={() => setPin("")}>
            Limpiar
          </button>
          <button className="key" onClick={() => push("0")}>
            0
          </button>
          <button className="key key-ghost" onClick={back}>
            ←
          </button>
        </div>

        <div className="lock-foot">
          <Icons.Lock size={14} /> Sesión bloqueada · Salón cerrado
        </div>
      </div>
    </div>
  );
}

window.LockScreen = LockScreen;
