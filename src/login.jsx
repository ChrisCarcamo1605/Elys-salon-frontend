import { useState } from 'react';
import { Icons } from './icons.jsx';
import { auth, setDeviceToken, apiError } from './api.js';

function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password || loading) return;
    setLoading(true);
    setError('');
    try {
      const data = await auth.login(email.trim(), password);
      setDeviceToken(data.deviceToken);
      onLogin({ user: { ...data.user, monthStats: data.monthStats }, token: data.token });
    } catch (err) {
      const status = err.response?.status;
      setError(
        status === 429 ? 'Demasiados intentos, espera 5 min' :
        status === 401 ? 'Correo o contraseña incorrectos' :
        apiError(err),
      );
    } finally {
      setLoading(false);
    }
  };

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
          <span>Terminal segura</span>
        </div>
      </div>

      {/* Main glass card */}
      <div className="lock-card login-card">
        <div className="lock-card-header">
          <div className="lock-logo">
            <img src="/assets/logo.jpg" alt="Ely's Salón" />
          </div>
          <div className="lock-title">Iniciar sesión</div>
          <div className="lock-sub">Ingresa tu correo y contraseña para activar este dispositivo</div>
        </div>

        <form className="login-form" onSubmit={submit} noValidate>
          <div className="login-field">
            <label className="login-label" htmlFor="login-email">Correo</label>
            <input
              id="login-email"
              className="login-input"
              type="email"
              autoComplete="email"
              placeholder="tu@correo.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              disabled={loading}
              autoFocus
            />
          </div>

          <div className="login-field">
            <label className="login-label" htmlFor="login-pw">Contraseña</label>
            <div className="login-pw-wrap">
              <input
                id="login-pw"
                className="login-input"
                type={showPw ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                disabled={loading}
              />
              <button
                type="button"
                className="login-pw-toggle"
                onClick={() => setShowPw((v) => !v)}
                tabIndex={-1}
                aria-label={showPw ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPw ? <Icons.EyeOff size={16} /> : <Icons.Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="login-error">{error || ' '}</div>

          <button
            className="login-btn"
            type="submit"
            disabled={loading || !email.trim() || !password}
          >
            {loading
              ? <><Icons.Clock size={15} /> Verificando…</>
              : 'Entrar'}
          </button>
        </form>

        <div className="lock-foot" style={{ marginTop: '20px' }}>
          <span className="lock-foot-dot" />
          {' '}Sesión activa por 30 días en este dispositivo
        </div>
      </div>
    </div>
  );
}

export { LoginScreen };
