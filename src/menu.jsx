// Top app bar shared across screens
import { Icons } from './icons.jsx';

function TopBar({ user, title, onLock, onLogout, onBack, right }) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        {onBack && (
          <button className="iconbtn" onClick={onBack} title="Volver">
            <Icons.ArrowLeft size={18} />
          </button>
        )}
        <div className="topbar-logo">
          <img src="assets/logo.jpg" alt="logo" />
        </div>
        <div className="topbar-titles">
          <div className="topbar-brand">
            Ely's <span style={{ color: "var(--magenta)" }}>Salón</span>
          </div>
          {title && <div className="topbar-sub">{title}</div>}
        </div>
      </div>
      <div className="topbar-right">
        {right}
        <div className="topbar-user">
          <div className="avatar" style={{ background: user.color }}>
            {user.initials}
          </div>
          <div className="user-meta">
            <div className="user-name">{user.name}</div>
            <div className="user-role">
              {user.role === "admin" ? "Administradora" : "Empleada"}
            </div>
          </div>
        </div>
        <button className="iconbtn" onClick={onLock} title="Bloquear">
          <Icons.Lock size={18} />
        </button>
        <button className="iconbtn" onClick={onLogout} title="Cerrar sesión">
          <Icons.Logout size={18} />
        </button>
      </div>
    </header>
  );
}

// Main menu — large cards. Items visible depend on role or explicit permission.
function MainMenu({ user, onNav, onLock, onLogout }) {
  const allItems = [
    {
      id: "sale",
      title: "Registrar venta",
      desc: "Cobrar productos y servicios",
      icon: <Icons.Cart size={28} />,
      roles: ["admin", "empleada"],
      featured: true,
    },
    {
      id: "timeclock",
      title: "Marcar entrada/salida",
      desc: "Checa tu jornada laboral",
      icon: <Icons.Clock size={28} />,
      roles: ["admin", "empleada"],
    },
    {
      id: "inventory",
      title: "Inventario",
      desc: "Stock de productos retail",
      icon: <Icons.Box size={28} />,
      roles: ["admin", "empleada"],
    },
    {
      id: "progress",
      title: "Mi progreso",
      desc: "Avance hacia tu bono",
      icon: <Icons.Trophy size={28} />,
      roles: ["empleada"],
    },
    {
      id: "analytics",
      title: "Analíticas",
      desc: "Rentabilidad del negocio",
      icon: <Icons.Chart size={28} />,
      roles: ["admin"],
      permission: "analytics.read",
    },
    {
      id: "staff",
      title: "Plantilla y nómina",
      desc: "Equipo, salarios y asistencia",
      icon: <Icons.Users size={28} />,
      roles: ["admin"],
      permission: "users.read",
    },
    {
      id: "reports",
      title: "Reportes y alertas",
      desc: "Stock bajo, descuentos y exports",
      icon: <Icons.Receipt size={28} />,
      roles: ["admin"],
      permission: "reports.read",
    },
    {
      id: "settings",
      title: "Ajustes",
      desc: "Catálogo, usuarios, negocio",
      icon: <Icons.Settings size={28} />,
      roles: ["admin"],
      permission: "products.write",
    },
  ];
  const items = allItems.filter((item) => {
    if (item.roles.includes(user.role)) return true;
    if (item.permission && user.permissions?.[item.permission] === true) return true;
    return false;
  });

  const greet = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Buenos días";
    if (h < 19) return "Buenas tardes";
    return "Buenas noches";
  })();

  return (
    <div className="screen menu-screen">
      <TopBar user={user} onLock={onLock} onLogout={onLogout} />
      <div className="menu-body">
        <div className="menu-hello">
          <div className="menu-hello-greet">{greet},</div>
          <div className="menu-hello-name">{user.name.split(" ")[0]}.</div>
          <div className="menu-hello-sub">
            {user.role === "admin"
              ? "Tienes el control total del salón."
              : "Listo para tu próxima clienta."}
          </div>
        </div>

        <div className="menu-grid">
          {items.map((it) => (
            <button
              key={it.id}
              className={`menu-card ${it.featured ? "featured" : ""}`}
              onClick={() => onNav(it.id)}
            >
              <div className="menu-card-icon">{it.icon}</div>
              <div className="menu-card-title">{it.title}</div>
              <div className="menu-card-desc">{it.desc}</div>
              <div className="menu-card-arrow">
                <Icons.ArrowRight size={18} />
              </div>
            </button>
          ))}
        </div>

        <div className="menu-foot">
          <div className="menu-foot-stat">
            <Icons.Clock size={14} /> Auto-bloqueo en 2 min de inactividad
          </div>
          <div className="menu-foot-stat">
            <Icons.Sparkle size={14} /> {new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}
          </div>
        </div>
      </div>
    </div>
  );
}

export { TopBar, MainMenu };
