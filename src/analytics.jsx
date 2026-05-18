// Analytics dashboard for admin. Uses Recharts.
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Area, AreaChart, BarChart, Bar, PieChart, Pie, Cell, Legend,
  RadialBarChart, RadialBar,
} from 'recharts';
import { Icons } from './icons.jsx';
import { TopBar } from './menu.jsx';
import { analytics as analyticsApi, apiError } from './api.js';

function Analytics({ user, data, onLock, onBack }) {
  const [salesByDay, setSalesByDay] = React.useState(data.salesByDay);
  const [categoryRevenue, setCategoryRevenue] = React.useState(data.categoryRevenue);
  const [topEmployees, setTopEmployees] = React.useState(data.topEmployees);
  const [hourlyTraffic, setHourlyTraffic] = React.useState(data.hourlyTraffic);

  React.useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    Promise.allSettled([
      analyticsApi.salesByDay('30d'),
      analyticsApi.categoryRevenue('30d'),
      analyticsApi.topEmployees('30d'),
      analyticsApi.hourlyTraffic(today),
      analyticsApi.kpis('30d'),
    ]).then(([salesRes, catRes, empRes, hourlyRes, kpisRes]) => {
      if (salesRes.status === 'fulfilled') { setSalesByDay(salesRes.value.items); }
      if (catRes.status === 'fulfilled')   { setCategoryRevenue(catRes.value.items); }
      if (empRes.status === 'fulfilled')   { setTopEmployees(empRes.value.items); }
      if (hourlyRes.status === 'fulfilled'){ setHourlyTraffic(hourlyRes.value.items); }
    });
  }, []);

  const last7 = salesByDay.slice(-7);
  const last30 = salesByDay;
  const totalVentas = last30.reduce((s, d) => s + d.ventas, 0);
  const totalCostos = last30.reduce((s, d) => s + d.costos, 0);
  const totalUtilidad = totalVentas - totalCostos;
  const margen = ((totalUtilidad / totalVentas) * 100).toFixed(1);
  const ticketPromedio = (totalVentas / last30.reduce((s, d) => s + d.tickets, 0)).toFixed(2);

  const tooltipStyle = {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 10,
    padding: "8px 12px",
    fontSize: 12,
    color: "var(--ink)",
    boxShadow: "0 8px 24px rgba(0,0,0,.08)",
  };

  const TT = ({ active, payload, label, prefix = "$" }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={tooltipStyle}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
        {payload.map((p, i) => (
          <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", color: p.color }}>
            <span style={{ width: 8, height: 8, background: p.color, borderRadius: 8 }}/>
            <span style={{ color: "var(--ink-dim)" }}>{p.name}</span>
            <b style={{ color: "var(--ink)" }}>{prefix}{Number(p.value).toLocaleString()}</b>
          </div>
        ))}
      </div>
    );
  };

  const margenRadial = [
    { name: "Margen", value: +margen, fill: "#de0fab" },
  ];

  return (
    <div className="screen analytics-screen">
      <TopBar user={user} title="Analíticas" onLock={onLock} onBack={onBack} onLogout={onLock} />
      <div className="ana-body">
        <div className="ana-head">
          <div>
            <div className="ana-eyebrow">Resumen · Últimos 30 días</div>
            <h2 className="ana-title">Rentabilidad del salón</h2>
          </div>
          <div className="ana-range">
            <button className="range-pill">7 días</button>
            <button className="range-pill active">30 días</button>
            <button className="range-pill">90 días</button>
            <button className="range-pill">Año</button>
          </div>
        </div>

        <div className="kpis">
          <Kpi label="Ventas totales" value={`$${totalVentas.toLocaleString()}`} delta="+12.4%" tone="up"/>
          <Kpi label="Utilidad neta" value={`$${totalUtilidad.toLocaleString()}`} delta="+18.1%" tone="up"/>
          <Kpi label="Margen" value={`${margen}%`} delta="+1.6 pp" tone="up"/>
          <Kpi label="Ticket promedio" value={`$${ticketPromedio}`} delta="−2.1%" tone="down"/>
        </div>

        <div className="ana-grid">
          {/* LINE: Ventas vs costos vs utilidad — 30d */}
          <div className="card big">
            <div className="card-head">
              <div>
                <div className="card-eyebrow">Tendencia</div>
                <div className="card-title">Ventas, costos y utilidad</div>
              </div>
              <div className="legend">
                <span><i style={{background:"#de0fab"}}/>Ventas</span>
                <span><i style={{background:"#0fb0de"}}/>Costos</span>
                <span><i style={{background:"#10b981"}}/>Utilidad</span>
              </div>
            </div>
            <div style={{ height: 280 }}>
              <ResponsiveContainer>
                <LineChart data={last30} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false}/>
                  <XAxis dataKey="label" stroke="var(--ink-dim)" tick={{fontSize:11}} tickLine={false} axisLine={false}/>
                  <YAxis stroke="var(--ink-dim)" tick={{fontSize:11}} tickLine={false} axisLine={false} width={42}/>
                  <Tooltip content={<TT/>}/>
                  <Line type="monotone" dataKey="ventas" name="Ventas" stroke="#de0fab" strokeWidth={2.4} dot={false} activeDot={{r:5}}/>
                  <Line type="monotone" dataKey="costos" name="Costos" stroke="#0fb0de" strokeWidth={2} dot={false} activeDot={{r:4}}/>
                  <Line type="monotone" dataKey="utilidad" name="Utilidad" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{r:4}}/>
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* PIE: ingresos por categoría */}
          <div className="card">
            <div className="card-head">
              <div>
                <div className="card-eyebrow">Mix de ingresos</div>
                <div className="card-title">Por categoría</div>
              </div>
            </div>
            <div style={{ height: 240 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={categoryRevenue}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={52}
                    outerRadius={88}
                    paddingAngle={2}
                    stroke="var(--surface)"
                    strokeWidth={2}
                  >
                    {categoryRevenue.map((c) => (
                      <Cell key={c.name} fill={c.color}/>
                    ))}
                  </Pie>
                  <Tooltip content={<TT/>}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="pie-legend">
              {categoryRevenue.map((c) => (
                <div key={c.name} className="pl-row">
                  <i style={{ background: c.color }}/>
                  <span className="pl-name">{c.name}</span>
                  <span className="pl-val">${c.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* BAR: top empleadas */}
          <div className="card">
            <div className="card-head">
              <div>
                <div className="card-eyebrow">Equipo</div>
                <div className="card-title">Top empleadas del mes</div>
              </div>
            </div>
            <div style={{ height: 260 }}>
              <ResponsiveContainer>
                <BarChart data={topEmployees} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false}/>
                  <XAxis dataKey="name" stroke="var(--ink-dim)" tick={{fontSize:11}} tickLine={false} axisLine={false}/>
                  <YAxis stroke="var(--ink-dim)" tick={{fontSize:11}} tickLine={false} axisLine={false} width={42}/>
                  <Tooltip content={<TT/>}/>
                  <Bar dataKey="ventas" name="Ventas" fill="#de0fab" radius={[6,6,0,0]} maxBarSize={36}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* AREA: tráfico por hora */}
          <div className="card">
            <div className="card-head">
              <div>
                <div className="card-eyebrow">Operación</div>
                <div className="card-title">Clientas por hora (hoy)</div>
              </div>
            </div>
            <div style={{ height: 240 }}>
              <ResponsiveContainer>
                <AreaChart data={hourlyTraffic} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="trafficFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#de0fab" stopOpacity={0.35}/>
                      <stop offset="100%" stopColor="#de0fab" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false}/>
                  <XAxis dataKey="hour" stroke="var(--ink-dim)" tick={{fontSize:11}} tickLine={false} axisLine={false}/>
                  <YAxis stroke="var(--ink-dim)" tick={{fontSize:11}} tickLine={false} axisLine={false} width={28}/>
                  <Tooltip content={<TT prefix=""/>}/>
                  <Area type="monotone" dataKey="clientes" name="Clientas" stroke="#de0fab" strokeWidth={2.2} fill="url(#trafficFill)"/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* RADIAL: margen */}
          <div className="card">
            <div className="card-head">
              <div>
                <div className="card-eyebrow">Salud financiera</div>
                <div className="card-title">Margen vs. meta (40%)</div>
              </div>
            </div>
            <div className="radial-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  innerRadius="60%"
                  outerRadius="100%"
                  data={margenRadial}
                  startAngle={210}
                  endAngle={-30}
                >
                  <RadialBar minAngle={2} clockWise dataKey="value" cornerRadius={12} background={{ fill: "var(--border)" }}/>
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="radial-center">
                <div className="rc-val">{margen}%</div>
                <div className="rc-lbl">Margen actual</div>
              </div>
            </div>
            <div className="radial-foot">
              <span>Meta: <b>40%</b></span>
              <span style={{ color: "#10b981" }}>+{(+margen - 40).toFixed(1)} pp vs meta</span>
            </div>
          </div>

          {/* BAR: tickets/día últimos 7 */}
          <div className="card">
            <div className="card-head">
              <div>
                <div className="card-eyebrow">Volumen</div>
                <div className="card-title">Tickets · últimos 7 días</div>
              </div>
            </div>
            <div style={{ height: 200 }}>
              <ResponsiveContainer>
                <BarChart data={last7} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false}/>
                  <XAxis dataKey="label" stroke="var(--ink-dim)" tick={{fontSize:11}} tickLine={false} axisLine={false}/>
                  <YAxis stroke="var(--ink-dim)" tick={{fontSize:11}} tickLine={false} axisLine={false} width={28}/>
                  <Tooltip content={<TT prefix=""/>}/>
                  <Bar dataKey="tickets" name="Tickets" fill="#7b2cbf" radius={[6,6,0,0]} maxBarSize={28}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, delta, tone }) {
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      <div className={`kpi-delta ${tone}`}>
        {tone === "up" ? "↑" : "↓"} {delta}
      </div>
    </div>
  );
}

export { Analytics };
