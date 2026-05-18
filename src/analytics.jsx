// Analytics dashboard for admin. Uses Recharts.
import React from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Area, AreaChart, BarChart, Bar, PieChart, Pie, Cell, Legend,
  RadialBarChart, RadialBar,
} from 'recharts';
import { Icons } from './icons.jsx';
import { TopBar } from './menu.jsx';
import { analytics as analyticsApi, apiError } from './api.js';

const RANGES = [
  { key: '7d', label: '7 días' },
  { key: '30d', label: '30 días' },
  { key: '90d', label: '90 días' },
  { key: '365d', label: 'Año' },
];

function Analytics({ user, onLock, onBack }) {
  const [range, setRange] = React.useState('30d');
  const [loading, setLoading] = React.useState(false);
  const [salesByDay, setSalesByDay] = React.useState([]);
  const [categoryRevenue, setCategoryRevenue] = React.useState([]);
  const [topEmployees, setTopEmployees] = React.useState([]);
  const [hourlyTraffic, setHourlyTraffic] = React.useState([]);
  const [kpis, setKpis] = React.useState(null);

  React.useEffect(() => {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];
    Promise.allSettled([
      analyticsApi.salesByDay(range),
      analyticsApi.categoryRevenue(range),
      analyticsApi.topEmployees(range),
      analyticsApi.hourlyTraffic(today),
      analyticsApi.kpis(range),
    ]).then(([salesRes, catRes, empRes, hourlyRes, kpisRes]) => {
      if (salesRes.status === 'fulfilled') { setSalesByDay(salesRes.value.items); }
      if (catRes.status === 'fulfilled')   { setCategoryRevenue(catRes.value.items); }
      if (empRes.status === 'fulfilled')   { setTopEmployees(empRes.value.items); }
      if (hourlyRes.status === 'fulfilled'){ setHourlyTraffic(hourlyRes.value.items); }
      if (kpisRes.status === 'fulfilled')  { setKpis(kpisRes.value); }
    }).finally(() => setLoading(false));
  }, [range]);

  const days = parseInt(range) || 30;
  const rangeLabel = RANGES.find(r => r.key === range)?.label ?? `${days} días`;

  const safeSales = Array.isArray(salesByDay) ? salesByDay : [];
  const last7 = safeSales.slice(-7);
  const lastN = safeSales;
  const totalVentas = lastN.reduce((s, d) => s + (d.ventas ?? 0), 0);
  const totalCostos = lastN.reduce((s, d) => s + (d.costos ?? 0), 0);
  const totalUtilidad = totalVentas - totalCostos;
  const margen = kpis?.margin != null ? Number(kpis.margin).toFixed(1) : (totalVentas > 0 ? ((totalUtilidad / totalVentas) * 100).toFixed(1) : "0.0");
  const totalTickets = kpis?.ticketCount ?? lastN.reduce((s, d) => s + (d.tickets ?? 0), 0);
  const ticketPromedio = kpis?.avgTicket != null ? Number(kpis.avgTicket).toFixed(2) : (totalTickets > 0 ? (totalVentas / totalTickets).toFixed(2) : "0.00");
  const ventasDelta = kpis?.salesDelta != null ? kpis.salesDelta : 0;
  const ventasDeltaPct = Number(ventasDelta).toFixed(1);

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
            <div className="ana-eyebrow">{loading ? 'Cargando…' : `Resumen · Últimos ${rangeLabel}`}</div>
            <h2 className="ana-title">Rentabilidad del salón</h2>
          </div>
          <div className="ana-range">
            {RANGES.map(r => (
              <button key={r.key} className={`range-pill${r.key === range ? ' active' : ''}`} onClick={() => setRange(r.key)}>{r.label}</button>
            ))}
          </div>
        </div>

        <div className={`kpis${loading ? ' kpis-loading' : ''}`}>
          <Kpi label="Ventas totales" value={`$${totalVentas.toLocaleString()}`} delta={`${ventasDeltaPct >= 0 ? '+' : ''}${ventasDeltaPct}%`} tone={ventasDeltaPct >= 0 ? 'up' : 'down'}/>
          <Kpi label="Utilidad neta" value={`$${totalUtilidad.toLocaleString()}`} delta={kpis?.totalProfit != null ? '' : ''} tone="up"/>
          <Kpi label="Margen" value={`${margen}%`} delta="" tone="up"/>
          <Kpi label="Ticket promedio" value={`$${ticketPromedio}`} delta="" tone="up"/>
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
                <LineChart data={lastN} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
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
      {delta ? <div className={`kpi-delta ${tone}`}>
        {tone === "up" ? "↑" : "↓"} {delta}
      </div> : null}
    </div>
  );
}

export { Analytics };
