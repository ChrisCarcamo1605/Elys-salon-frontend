// Plantilla y nómina + Marcar entrada/salida

import React from 'react';
import { Icons } from './icons.jsx';
import { TopBar } from './menu.jsx';
import { exportUtils } from './reports.jsx';
import { staff as staffApi, timeclock as timeclockApi, payroll as payrollApi, apiError } from './api.js';
import { fmtMoney } from './utils.js';

// Permisos otorgables individualmente a empleados
const GRANTABLE_PERMS = [
  { key: 'tickets.discount',    label: 'Aplicar descuentos',       desc: 'Puede modificar precios y descuentos al cobrar' },
  { key: 'tickets.void',        label: 'Anular ventas',            desc: 'Puede cancelar tickets ya cobrados' },
  { key: 'tickets.read',        label: 'Ver historial de ventas',  desc: 'Puede consultar ventas pasadas' },
  { key: 'reports.read',        label: 'Ver reportes y alertas',   desc: 'Acceso a la pantalla de reportes' },
  { key: 'analytics.read',      label: 'Ver analíticas',           desc: 'Acceso a gráficas de rentabilidad' },
  { key: 'inventory.create',    label: 'Añadir entradas de stock', desc: 'Puede registrar compras de inventario' },
  { key: 'inventory.adjust',    label: 'Ajustar inventario',       desc: 'Puede editar cantidades de stock' },
  { key: 'users.read',          label: 'Ver plantilla y nómina',   desc: 'Puede ver el equipo y horas trabajadas' },
  { key: 'payroll.read',        label: 'Ver nómina',               desc: 'Puede consultar la nómina del equipo' },
  { key: 'attendance.read_all', label: 'Ver asistencia completa',  desc: 'Ve el historial de todos los empleados' },
  { key: 'bonuses.manage',      label: 'Gestionar metas y bonos',  desc: 'Puede crear y editar metas' },
  { key: 'offers.write',        label: 'Gestionar promociones',    desc: 'Puede crear y editar promociones' },
];

// ============================================================
//   STAFF — Plantilla, salarios, asistencia
// ============================================================

function Staff({ user, onLock, onBack }) {
  const [tab, setTab] = React.useState("roster");
  const [employees, setEmployees] = React.useState([]);
  const [editEmp, setEditEmp] = React.useState(null);
  const [confirmDelete, setConfirmDelete] = React.useState(null);
  const [toast, setToast] = React.useState(null);

  const showToast = (title, sub) => {
    setToast({ title, sub });
    setTimeout(() => setToast(null), 2600);
  };

  React.useEffect(() => {
    staffApi.list().then((items) => setEmployees(items)).catch(() => {});
  }, []);

  const tabs = [
    { id: "roster", label: "Plantilla", icon: "Users" },
    { id: "schedule", label: "Asistencia hoy", icon: "Clock" },
    { id: "hours", label: "Horas trabajadas", icon: "Chart" },
    { id: "payroll", label: "Nómina y bonos", icon: "Cash" },
  ];

  const saveEmployee = (emp) => {
    const isNew = !employees.some((e) => e.id === emp.id);
    const apiCall = isNew ? staffApi.create(emp) : staffApi.update(emp.id, emp);
    apiCall
      .then((saved) => {
        setEmployees((es) => {
          const idx = es.findIndex((e) => e.id === saved.id);
          if (idx === -1) return [...es, saved];
          const copy = [...es];
          copy[idx] = saved;
          return copy;
        });
        setEditEmp(null);
        showToast("Cambios guardados", saved.name);
      })
      .catch((err) => {
        showToast("Error", apiError(err));
      });
  };

  const changeEmployeePin = (id, pin) => {
    staffApi.changePin(id, pin)
      .then(() => showToast("PIN actualizado", "Cambios listos"))
      .catch((err) => showToast("Error", apiError(err)));
  };

  const savePermissions = (id, permissions) => {
    staffApi.updatePermissions(id, { permissions })
      .then((saved) => {
        setEmployees((es) => {
          const idx = es.findIndex((e) => e.id === saved.id);
          if (idx === -1) return es;
          const copy = [...es];
          copy[idx] = saved;
          return copy;
        });
        showToast("Permisos actualizados", saved.name);
      })
      .catch((err) => showToast("Error", apiError(err)));
  };

  const deleteEmployee = (id) => {
    const emp = employees.find((e) => e.id === id);
    staffApi.remove(id)
      .then(() => {
        setEmployees((es) => es.filter((e) => e.id !== id));
        setConfirmDelete(null);
        showToast("Empleado eliminada", emp?.name);
      })
      .catch((err) => {
        setConfirmDelete(null);
        showToast("Error", apiError(err));
      });
  };

  return (
    <div className="screen">
      <TopBar user={user} title="Plantilla y nómina" onLock={onLock} onBack={onBack}/>
      <div className="ana-body">
        <div className="ana-head">
          <div>
            <div className="ana-eyebrow">Equipo · {employees.length} integrantes</div>
            <h2 className="ana-title">Plantilla y nómina</h2>
          </div>
          {tab === "roster" && (
            <button
              className="btn-primary"
              onClick={() =>
                setEditEmp({
                  id: `u_new_${Date.now()}`,
                  name: "",
                  position: "",
                  role: "empleado",
                  status: "activa",
                  hireDate: new Date().toISOString().slice(0, 10),
                  phone: "",
                  email: "",
                  birthday: "",
                  schedule: "",
                  payType: "salario",
                  salary: 0,
                  commissionRate: 0,
                  pin: "",
                  avatarHue: Math.floor(Math.random() * 360),
                })
              }
            >
              <Icons.Plus size={14}/> Nueva empleado
            </button>
          )}
        </div>

        <div className="tabs" style={{ marginBottom: 20, padding: 0 }}>
          {tabs.map((t) => {
            const IconComp = Icons[t.icon];
            return (
              <button
                key={t.id}
                className={`tab ${tab === t.id ? "active" : ""}`}
                onClick={() => setTab(t.id)}
              >
                <IconComp size={13}/>
                <span style={{ marginLeft: 6 }}>{t.label}</span>
              </button>
            );
          })}
        </div>

        {tab === "roster" && (
          <StaffRoster employees={employees} onEdit={setEditEmp} onDelete={setConfirmDelete}/>
        )}
        {tab === "schedule" && (
          <StaffSchedule employees={employees}/>
        )}
        {tab === "hours" && (
          <StaffHours employees={employees}/>
        )}
        {tab === "payroll" && (
          <StaffPayroll employees={employees}/>
        )}
      </div>

      {editEmp && (
        <EmployeeModal
          employee={editEmp}
          onClose={() => setEditEmp(null)}
          onSave={saveEmployee}
          onChangePin={changeEmployeePin}
          onSavePermissions={savePermissions}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          title="¿Eliminar empleado?"
          message={`Vas a eliminar a ${confirmDelete.name} de la plantilla. Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          danger
          onClose={() => setConfirmDelete(null)}
          onConfirm={() => deleteEmployee(confirmDelete.id)}
        />
      )}

      {toast && (
        <div className="toast">
          <div className="toast-ico"><Icons.Check size={16}/></div>
          <div>
            <div className="toast-title">{toast.title}</div>
            <div className="toast-sub">{toast.sub}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function StaffRoster({ employees, onEdit, onDelete }) {
  const statusTone = {
    activa: { dot: "#10b981", label: "Activa" },
    vacaciones: { dot: "#f59e0b", label: "Vacaciones" },
    inactiva: { dot: "#94a3b8", label: "Inactiva" },
  };
  return (
    <div className="roster-grid">
      {employees.map((e) => {
        const st = statusTone[e.status] || statusTone.activa;
        const initials = e.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
        const biweekly = (e.salary || 0) / 2;
        return (
          <div className="roster-card" key={e.id}>
            <div className="roster-head">
              <div className="avatar lg" style={{ background: `hsl(${e.avatarHue} 70% 55%)` }}>
                {initials}
              </div>
              <div className="roster-name-block">
                <div className="roster-name">{e.name}</div>
                <div className="roster-pos">{e.position}</div>
              </div>
              <div className="roster-status">
                <span className="status-dot" style={{ background: st.dot }}/>
                {st.label}
              </div>
            </div>

            <div className="roster-info">
              <div>
                <div className="info-label">Esquema</div>
                <div className="info-val">{e.payType}</div>
              </div>
              <div>
                <div className="info-label">Sueldo quincenal</div>
                <div className="info-val">${biweekly.toLocaleString()}</div>
              </div>
              <div>
                <div className="info-label">Sueldo mensual</div>
                <div className="info-val small">${(e.salary || 0).toLocaleString()}</div>
              </div>
              <div>
                <div className="info-label">Comisión</div>
                <div className="info-val">{e.commissionRate}%</div>
              </div>
              <div>
                <div className="info-label">Horario</div>
                <div className="info-val small">{e.schedule}</div>
              </div>
              <div>
                <div className="info-label">Antigüedad</div>
                <div className="info-val small">{relativeHire(e.hireDate)}</div>
              </div>
            </div>

            <div className="roster-foot">
              <button className="btn-ghost btn-sm" onClick={() => onDelete(e)}>
                <Icons.Trash size={12}/> Eliminar
              </button>
              <button className="btn-primary btn-sm" onClick={() => onEdit(e)}>
                Editar perfil
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function relativeHire(date) {
  const d = new Date(date);
  const now = new Date();
  const months = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
  if (months < 12) return `${months} mes${months === 1 ? "" : "es"}`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  return rem ? `${years}a ${rem}m` : `${years} año${years === 1 ? "" : "s"}`;
}

function StaffSchedule({ employees }) {
  const [timeEntries, setTimeEntries] = React.useState([]);
  React.useEffect(() => {
    timeclockApi.today().then((data) => {
      if (data && Array.isArray(data.entries)) setTimeEntries(data.entries);
    }).catch(() => {});
  }, []);
  const today = new Date().toISOString().slice(0, 10);
  const todayEntries = timeEntries;

  const empState = employees.map((e) => {
    const entries = todayEntries.filter((t) => t.userId === e.id);
    const open = entries.find((t) => !t.out);
    const totalMins = entries.reduce((s, t) => {
      if (!t.in) return s;
      const [ih, im] = t.in.split(":").map(Number);
      const [oh, om] = (t.out || nowHM()).split(":").map(Number);
      return s + (oh * 60 + om - (ih * 60 + im));
    }, 0);
    return {
      employee: e,
      entries,
      isWorking: !!open,
      lastIn: open?.in || entries[entries.length - 1]?.in,
      totalMins,
    };
  });

  return (
    <div>
      <div className="kpis" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <div className="kpi">
          <div className="kpi-label">En el salón ahora</div>
          <div className="kpi-value">
            {empState.filter((e) => e.isWorking).length}
            <span style={{ fontSize: 14, color: "var(--ink-dim)", fontWeight: 500 }}>
              {" / "}{employees.length}
            </span>
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Horas trabajadas hoy</div>
          <div className="kpi-value">
            {fmtHours(empState.reduce((s, e) => s + e.totalMins, 0))}
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Aún sin checar entrada</div>
          <div className="kpi-value">
            {empState.filter((e) => e.entries.length === 0 && e.employee.status === "activa").length}
          </div>
        </div>
      </div>

      <div className="set-card" style={{ marginTop: 12, padding: 0, overflow: "hidden" }}>
        <div className="sched-row sched-head">
          <div>Empleado</div>
          <div>Estado</div>
          <div>Entrada</div>
          <div>Salida</div>
          <div>Total hoy</div>
          <div>Bitácora</div>
        </div>
        {empState.map(({ employee: e, entries, isWorking, totalMins }) => {
          const initials = e.name.split(" ").map((p) => p[0]).slice(0, 2).join("");
          return (
            <div className="sched-row" key={e.id}>
              <div className="sched-name">
                <div className="avatar" style={{ background: `hsl(${e.avatarHue} 70% 55%)` }}>
                  {initials}
                </div>
                <div>
                  <div style={{ fontWeight: 600 }}>{e.name}</div>
                  <div style={{ fontSize: 11, color: "var(--ink-dim)" }}>{e.position}</div>
                </div>
              </div>
              <div>
                {e.status !== "activa" ? (
                  <span className="status-pill off">{e.status}</span>
                ) : isWorking ? (
                  <span className="status-pill working">
                    <span className="status-dot pulse"/> Trabajando
                  </span>
                ) : entries.length > 0 ? (
                  <span className="status-pill done">Salió</span>
                ) : (
                  <span className="status-pill absent">Sin checar</span>
                )}
              </div>
              <div className="sched-time">{entries[0]?.in || "—"}</div>
              <div className="sched-time">
                {entries.length === 0 ? "—" : entries[entries.length - 1].out || "—"}
              </div>
              <div className="sched-time" style={{ fontWeight: 700 }}>
                {totalMins ? fmtHours(totalMins) : "—"}
              </div>
              <div className="sched-bita">
                {entries.length === 0 ? (
                  <span style={{ color: "var(--ink-faint)" }}>—</span>
                ) : (
                  entries.map((t) => (
                    <span className="sched-chip" key={t.id}>
                      {t.in} → {t.out || "ahora"}
                    </span>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function nowHM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function fmtHours(mins) {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function StaffHours({ employees }) {
  const [range, setRange] = React.useState("week");
  const [apiSummary, setApiSummary] = React.useState(null);
  const [historic, setHistoric] = React.useState([]);
  const today = new Date();

  React.useEffect(() => {
    timeclockApi.history({ range }).then((data) => {
      if (Array.isArray(data)) setHistoric(data);
    }).catch(() => {});
  }, [range]);

  React.useEffect(() => {
    timeclockApi.summary({ range })
      .then((data) => setApiSummary(data))
      .catch(() => setApiSummary(null));
  }, [range]);

  const ranges = {
    week:    { days: 7,  label: "Semana"   },
    biweek:  { days: 15, label: "Quincena" },
    month:   { days: 30, label: "Mes"      },
  };
  const days = ranges[range].days;

  // Filter historic entries within range
  const cutoff = new Date(today); cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const inRange = historic.filter((t) => t.date >= cutoffStr);

  // Compute per-employee
  const summary = employees.map((e) => {
    const entries = inRange.filter((t) => t.userId === e.id && t.in && t.out);
    const totalMins = entries.reduce((s, t) => {
      const [ih, im] = t.in.split(":").map(Number);
      const [oh, om] = t.out.split(":").map(Number);
      return s + (oh * 60 + om - (ih * 60 + im));
    }, 0);
    const daysWorked = entries.length;
    const avgMins = daysWorked ? Math.round(totalMins / daysWorked) : 0;

    // Hourly cost = monthly salary / (8h * 22 days)
    const hourlyRate = e.salary ? e.salary / (8 * 22) : 0;
    const totalHours = totalMins / 60;
    const cost = hourlyRate * totalHours;

    // Group by day for trend
    const byDay = {};
    entries.forEach((t) => {
      const [ih, im] = t.in.split(":").map(Number);
      const [oh, om] = t.out.split(":").map(Number);
      const mins = oh * 60 + om - (ih * 60 + im);
      byDay[t.date] = (byDay[t.date] || 0) + mins;
    });
    const trend = Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, mins]) => ({ date, hours: +(mins / 60).toFixed(1) }));

    return { ...e, totalMins, daysWorked, avgMins, hourlyRate, totalHours, cost, trend };
  });

  const totals = {
    hours: summary.reduce((s, x) => s + x.totalMins, 0) / 60,
    cost:  summary.reduce((s, x) => s + x.cost, 0),
    employees: summary.filter((s) => s.daysWorked > 0).length,
    avg: 0,
  };
  totals.avg = totals.employees ? totals.hours / totals.employees : 0;

  const exportToCSV = () => {
    const cols = ["Empleado", "Puesto", "Días trabajados", "Horas totales", "Promedio diario (h)", "Costo estimado"];
    const rows = summary.map((s) => [
      s.name, s.position, s.daysWorked,
      s.totalHours.toFixed(2),
      (s.avgMins / 60).toFixed(2),
      s.cost.toFixed(2),
    ]);
    exportUtils.downloadCSV(
      `horas-trabajadas-${range}-${today.toISOString().slice(0,10)}.csv`, cols, rows
    );
  };

  const exportToPDF = () => {
    exportUtils.printReport({
      title: `Horas trabajadas · ${ranges[range].label}`,
      subtitle: `Desde ${cutoffStr} hasta ${today.toISOString().slice(0,10)}`,
      columns: [
        { label: "Empleado" },
        { label: "Puesto" },
        { label: "Días",            align: "right" },
        { label: "Horas totales",   align: "right" },
        { label: "Promedio diario", align: "right" },
        { label: "Costo estimado",  align: "right" },
      ],
      rows: summary.map((s) => [
        s.name, s.position, s.daysWorked,
        `${s.totalHours.toFixed(1)}h`,
        `${(s.avgMins / 60).toFixed(1)}h`,
        fmtMoney(s.cost),
      ]),
      totals: [
        { label: "Horas totales", value: `${totals.hours.toFixed(1)}h` },
        { label: "Costo total",   value: fmtMoney(totals.cost) },
        { label: "Empleados",     value: totals.employees },
        { label: "Promedio",      value: `${totals.avg.toFixed(1)}h` },
      ],
    });
  };

  return (
    <div>
      <div className="hours-toolbar">
        <div className="hours-range">
          {Object.entries(ranges).map(([id, r]) => (
            <button
              key={id}
              className={`range-pill ${range === id ? "active" : ""}`}
              onClick={() => setRange(id)}
            >
              {r.label}
              <span className="range-days">{r.days}d</span>
            </button>
          ))}
        </div>
        <div className="hours-export">
          <button className="btn-ghost btn-sm" onClick={exportToCSV}>
            <Icons.Box size={12}/> Excel
          </button>
          <button className="btn-primary btn-sm" onClick={exportToPDF}>
            <Icons.Receipt size={12}/> PDF
          </button>
        </div>
      </div>

      <div className="kpis" style={{ gridTemplateColumns: "repeat(4,1fr)", marginBottom: 14 }}>
        <div className="kpi">
          <div className="kpi-label">Horas totales</div>
          <div className="kpi-value">{totals.hours.toFixed(1)}h</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Costo estimado</div>
          <div className="kpi-value">{fmtMoney(totals.cost)}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Empleados activos</div>
          <div className="kpi-value">{totals.employees}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Promedio por persona</div>
          <div className="kpi-value">{totals.avg.toFixed(1)}h</div>
        </div>
      </div>

      <div className="hours-grid">
        {summary.map((s) => {
          const initials = s.name.split(" ").map((p) => p[0]).slice(0, 2).join("");
          const expectedHours = days * 8 * 5 / 7; // ~ 8h x weekdays
          const pct = Math.min(100, (s.totalHours / expectedHours) * 100);
          const maxH = Math.max(1, ...s.trend.map((t) => t.hours));

          return (
            <div className="hours-card" key={s.id}>
              <div className="hours-card-head">
                <div className="avatar lg" style={{ background: `hsl(${s.avatarHue} 70% 55%)` }}>
                  {initials}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="hours-name">{s.name}</div>
                  <div className="hours-pos">{s.position}</div>
                </div>
                <div className="hours-big">
                  <div className="hours-big-val">{s.totalHours.toFixed(1)}<span>h</span></div>
                  <div className="hours-big-lbl">{ranges[range].label.toLowerCase()}</div>
                </div>
              </div>

              <div className="hours-stats">
                <div className="hours-stat">
                  <div className="info-label">Días</div>
                  <div className="info-val">{s.daysWorked}</div>
                </div>
                <div className="hours-stat">
                  <div className="info-label">Promedio</div>
                  <div className="info-val">{(s.avgMins / 60).toFixed(1)}h</div>
                </div>
                <div className="hours-stat">
                  <div className="info-label">Costo</div>
                  <div className="info-val" style={{ color: "var(--magenta)" }}>
                    {fmtMoney(s.cost)}
                  </div>
                </div>
              </div>

              {/* Trend mini-chart */}
              {s.trend.length > 0 ? (
                <div className="hours-trend">
                  {s.trend.slice(-Math.min(15, days)).map((t, i) => (
                    <div
                      key={i}
                      className="hours-bar"
                      style={{
                        height: `${(t.hours / maxH) * 100}%`,
                        background: `hsl(${s.avatarHue} 70% 55%)`,
                      }}
                      title={`${t.date}: ${t.hours}h`}
                    />
                  ))}
                </div>
              ) : (
                <div className="hours-empty">Sin marcas en este periodo</div>
              )}

              <div className="hours-foot">
                <div className="hours-foot-bar">
                  <div className="hours-foot-fill" style={{ width: `${pct}%`, background: `hsl(${s.avatarHue} 70% 55%)` }}/>
                </div>
                <div className="hours-foot-meta">
                  {pct.toFixed(0)}% de jornada completa esperada
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StaffPayroll({ employees }) {
  const [period, setPeriod] = React.useState("biweek"); // "biweek" | "month"
  const [apiPayroll, setApiPayroll] = React.useState(null);

  React.useEffect(() => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    payrollApi.get(currentMonth, period)
      .then((data) => setApiPayroll(data))
      .catch(() => setApiPayroll(null));
  }, [period]);

  const divisor = period === "biweek" ? 2 : 1;
  // Match topEmployees by first name for demo purposes
  const enriched = employees.map((e) => {
    const monthSales = 0;
    const salesForPeriod = monthSales / divisor;
    const salaryForPeriod = (e.salary || 0) / divisor;
    const commissionEarned = +(salesForPeriod * e.commissionRate / 100).toFixed(2);
    const monthBonus = monthSales >= 2000 ? 200 : monthSales >= 1500 ? 100 : monthSales >= 1000 ? 50 : 0;
    const bonus = monthBonus / divisor;
    const total = salaryForPeriod + commissionEarned + bonus;
    return { ...e, salesForPeriod, salaryForPeriod, commissionEarned, bonus, total };
  });

  const totalPayroll = enriched.reduce((s, e) => s + e.total, 0);
  const totalSalaries = enriched.reduce((s, e) => s + e.salaryForPeriod, 0);
  const totalCommissions = enriched.reduce((s, e) => s + e.commissionEarned, 0);
  const totalBonuses = enriched.reduce((s, e) => s + e.bonus, 0);

  return (
    <div>
      <div className="payroll-period">
        <span className="form-label" style={{ marginBottom: 0 }}>Periodo de pago</span>
        <div className="role-toggle">
          <button
            className={`role-tog ${period === "biweek" ? "active" : ""}`}
            onClick={() => setPeriod("biweek")}
          >
            <Icons.Clock size={12}/> Quincenal
          </button>
          <button
            className={`role-tog ${period === "month" ? "active" : ""}`}
            onClick={() => setPeriod("month")}
          >
            <Icons.Cash size={12}/> Mensual
          </button>
        </div>
      </div>

      <div className="kpis" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        <div className="kpi">
          <div className="kpi-label">Nómina {period === "biweek" ? "quincenal" : "del mes"}</div>
          <div className="kpi-value">${totalPayroll.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Sueldos base</div>
          <div className="kpi-value">${totalSalaries.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Comisiones</div>
          <div className="kpi-value">${totalCommissions.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Bonos</div>
          <div className="kpi-value">${totalBonuses.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
        </div>
      </div>

      <div className="set-card" style={{ marginTop: 12, padding: 0, overflow: "hidden" }}>
        <div className="payroll-row payroll-head">
          <div>Empleado</div>
          <div>Ventas {period === "biweek" ? "quincena" : "mes"}</div>
          <div>Sueldo</div>
          <div>Comisión</div>
          <div>Bono</div>
          <div>Total</div>
        </div>
        {enriched.map((e) => {
          const initials = e.name.split(" ").map((p) => p[0]).slice(0, 2).join("");
          return (
            <div className="payroll-row" key={e.id}>
              <div className="sched-name">
                <div className="avatar" style={{ background: `hsl(${e.avatarHue} 70% 55%)` }}>
                  {initials}
                </div>
                <div>
                  <div style={{ fontWeight: 600 }}>{e.name}</div>
                  <div style={{ fontSize: 11, color: "var(--ink-dim)" }}>{e.payType}</div>
                </div>
              </div>
              <div className="num">${e.salesForPeriod.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
              <div className="num">${e.salaryForPeriod.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
              <div className="num" style={{ color: e.commissionEarned ? "#10b981" : "var(--ink-faint)" }}>
                ${e.commissionEarned.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </div>
              <div className="num" style={{ color: e.bonus ? "var(--magenta)" : "var(--ink-faint)" }}>
                ${e.bonus.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
              <div className="num bold">${e.total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Employee modal (create/edit) ----------
function EmployeeModal({ employee, onClose, onSave, onChangePin, onSavePermissions }) {
  const [e, setE] = React.useState(employee);
  const [pinModal, setPinModal] = React.useState(false);
  const [perms, setPerms] = React.useState(employee.permissions || {});
  const [permsSaving, setPermsSaving] = React.useState(false);
  const isNew = !employee.name;
  const upd = (k, v) => setE((p) => ({ ...p, [k]: v }));
  const validPin = !isNew || /^\d{4}$/.test(e.pin ?? "");
  const valid = e.name.trim() && e.position.trim() && validPin;

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal entry-modal" onClick={(ev) => ev.stopPropagation()} style={{ width: "min(720px, 92vw)" }}>
        <div className="modal-head">
          <div>
            <div className="modal-eyebrow">{isNew ? "Nueva empleado" : "Editar empleado"}</div>
            <div className="modal-title">{e.name || "Sin nombre"}</div>
            <div className="modal-sub">{e.position || "Define un puesto"}</div>
          </div>
          <button className="iconbtn" onClick={onClose}>
            <Icons.X size={16}/>
          </button>
        </div>

        <div className="emp-modal-grid">
          <div className="emp-avatar-col">
            <div
              className="avatar xl"
              style={{ background: `hsl(${e.avatarHue} 70% 55%)` }}
            >
              {(e.name || "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
            </div>
            <div className="hue-picker">
              <div className="form-label">Color</div>
              <input
                type="range"
                className="form-slider"
                min="0" max="360"
                value={e.avatarHue}
                onChange={(ev) => upd("avatarHue", +ev.target.value)}
              />
            </div>
          </div>

          <div className="emp-fields">
            <div className="form-grid">
              <label className="form-row">
                <span className="form-label">Nombre completo</span>
                <input className="form-input" value={e.name} onChange={(ev) => upd("name", ev.target.value)}/>
              </label>
              <label className="form-row">
                <span className="form-label">Puesto</span>
                <input className="form-input" value={e.position} onChange={(ev) => upd("position", ev.target.value)}/>
              </label>
              <label className="form-row">
                <span className="form-label">Rol del sistema</span>
                <select className="form-input" value={e.role} onChange={(ev) => upd("role", ev.target.value)}>
                  <option value="empleado">Empleado</option>
                  <option value="admin">Administrador</option>
                </select>
              </label>
              <label className="form-row">
                <span className="form-label">Estado</span>
                <select className="form-input" value={e.status} onChange={(ev) => upd("status", ev.target.value)}>
                  <option value="activa">Activa</option>
                  <option value="vacaciones">Vacaciones</option>
                  <option value="inactiva">Inactiva</option>
                </select>
              </label>
              <label className="form-row">
                <span className="form-label">Fecha de contratación</span>
                <input type="date" className="form-input" value={e.hireDate} onChange={(ev) => upd("hireDate", ev.target.value)}/>
              </label>
              <label className="form-row">
                <span className="form-label">Cumpleaños</span>
                <input type="date" className="form-input" value={e.birthday} onChange={(ev) => upd("birthday", ev.target.value)}/>
              </label>
              <label className="form-row">
                <span className="form-label">Teléfono</span>
                <input className="form-input" value={e.phone} onChange={(ev) => upd("phone", ev.target.value)}/>
              </label>
              <label className="form-row">
                <span className="form-label">Correo</span>
                <input className="form-input" type="email" value={e.email} onChange={(ev) => upd("email", ev.target.value)}/>
              </label>
              <label className="form-row form-row-full">
                <span className="form-label">Horario habitual</span>
                <input className="form-input" placeholder="Ej. L–V 10:00–18:00" value={e.schedule} onChange={(ev) => upd("schedule", ev.target.value)}/>
              </label>
            </div>

            <div className="emp-pay-section">
              <div className="form-label" style={{ marginBottom: 10 }}>Acceso</div>
              <div className="form-grid">
                {isNew ? (
                  <label className="form-row">
                    <span className="form-label">PIN inicial (4 dígitos)</span>
                    <input
                      className="form-input"
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      placeholder="••••"
                      value={e.pin ?? ""}
                      onChange={(ev) => upd("pin", ev.target.value.replace(/\D/g, "").slice(0, 4))}
                    />
                    {!validPin && (
                      <span style={{ fontSize: 11, color: "var(--magenta)", marginTop: 4 }}>
                        El PIN debe tener exactamente 4 dígitos.
                      </span>
                    )}
                  </label>
                ) : (
                  <div className="form-row">
                    <span className="form-label">PIN de acceso</span>
                    <button
                      type="button"
                      className="btn-ghost btn-sm"
                      onClick={() => setPinModal(true)}
                    >
                      <Icons.Lock size={12}/> Cambiar PIN
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="emp-pay-section">
              <div className="form-label" style={{ marginBottom: 10 }}>Compensación</div>
              <div className="form-grid">
                <label className="form-row">
                  <span className="form-label">Esquema</span>
                  <select className="form-input" value={e.payType} onChange={(ev) => upd("payType", ev.target.value)}>
                    <option value="salario">Solo salario</option>
                    <option value="salario + comisión">Salario + comisión</option>
                    <option value="comisión">Solo comisión</option>
                  </select>
                </label>
                <label className="form-row">
                  <span className="form-label">Sueldo base mensual</span>
                  <div className="form-input-prefix">
                    <span>$</span>
                    <input type="number" min="0" value={e.salary} onChange={(ev) => upd("salary", +ev.target.value || 0)}/>
                  </div>
                </label>
                <label className="form-row">
                  <span className="form-label">% comisión sobre ventas</span>
                  <div className="form-input-prefix">
                    <input type="number" min="0" max="100" value={e.commissionRate} onChange={(ev) => upd("commissionRate", +ev.target.value || 0)}/>
                    <span>%</span>
                  </div>
                </label>
              </div>
            </div>

            {!isNew && e.role === "empleado" && (
              <div className="emp-pay-section">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div>
                    <div className="form-label" style={{ marginBottom: 2 }}>Accesos adicionales</div>
                    <div style={{ fontSize: 11, color: "var(--ink-dim)" }}>
                      Los marcados se otorgan sobre el rol por defecto.
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-primary btn-sm"
                    disabled={permsSaving}
                    onClick={() => {
                      setPermsSaving(true);
                      onSavePermissions?.(e.id, perms);
                      setTimeout(() => setPermsSaving(false), 800);
                    }}
                  >
                    <Icons.Check size={12}/> Guardar permisos
                  </button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {GRANTABLE_PERMS.map((p) => (
                    <label key={p.key} className="perm-row" style={{ cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        style={{ width: 16, height: 16, accentColor: "var(--magenta)", flexShrink: 0 }}
                        checked={perms[p.key] === true}
                        onChange={() =>
                          setPerms((prev) => {
                            if (prev[p.key] === true) {
                              const { [p.key]: _, ...rest } = prev;
                              return rest;
                            }
                            return { ...prev, [p.key]: true };
                          })
                        }
                      />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{p.label}</div>
                        <div style={{ fontSize: 11, color: "var(--ink-dim)" }}>{p.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="modal-foot">
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" disabled={!valid} onClick={() => onSave(e)}>
            <Icons.Check size={14}/> {isNew ? "Crear empleado" : "Guardar cambios"}
          </button>
        </div>
      </div>

      {pinModal && (
        <PinChangeModal
          name={e.name}
          onClose={() => setPinModal(false)}
          onConfirm={(newPin) => {
            onChangePin?.(e.id, newPin);
            setPinModal(false);
          }}
        />
      )}
    </div>
  );
}

function PinChangeModal({ name, onClose, onConfirm }) {
  const [pin, setPin] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const match = pin.length === 4 && pin === confirm;

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(ev) => ev.stopPropagation()} style={{ width: "min(420px, 92vw)" }}>
        <div className="modal-head">
          <div>
            <div className="modal-eyebrow">Cambiar PIN</div>
            <div className="modal-title">{name}</div>
            <div className="modal-sub">Genera un nuevo PIN de 4 dígitos.</div>
          </div>
          <button className="iconbtn" onClick={onClose}>
            <Icons.X size={16}/>
          </button>
        </div>

        <div className="form-grid" style={{ marginTop: 12 }}>
          <label className="form-row">
            <span className="form-label">Nuevo PIN</span>
            <input
              className="form-input"
              type="password"
              inputMode="numeric"
              maxLength={4}
              autoFocus
              value={pin}
              onChange={(ev) => setPin(ev.target.value.replace(/\D/g, "").slice(0, 4))}
            />
          </label>
          <label className="form-row">
            <span className="form-label">Confirmar PIN</span>
            <input
              className="form-input"
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={confirm}
              onChange={(ev) => setConfirm(ev.target.value.replace(/\D/g, "").slice(0, 4))}
            />
          </label>
        </div>

        {!match && (pin || confirm) && (
          <div style={{ fontSize: 12, color: "var(--magenta)", marginTop: 8 }}>
            {pin.length !== 4 ? "El PIN debe tener 4 dígitos." : "Los PINs no coinciden."}
          </div>
        )}

        <div className="modal-foot" style={{ marginTop: 18 }}>
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" disabled={!match} onClick={() => onConfirm(pin)}>
            <Icons.Check size={14}/> Guardar PIN
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Generic confirm modal ----------
function ConfirmModal({ title, message, confirmLabel = "Confirmar", danger, onClose, onConfirm }) {
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: "min(420px, 92vw)" }}>
        <div className="modal-head">
          <div>
            <div className="modal-eyebrow">Confirmación</div>
            <div className="modal-title">{title}</div>
          </div>
          <button className="iconbtn" onClick={onClose}>
            <Icons.X size={16}/>
          </button>
        </div>
        <div style={{ fontSize: 14, color: "var(--ink-2)", lineHeight: 1.5, marginBottom: 20 }}>
          {message}
        </div>
        <div className="modal-foot">
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button
            className={danger ? "btn-danger" : "btn-primary"}
            onClick={onConfirm}
          >
            {danger && <Icons.Trash size={13}/>} {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
//   TIME CLOCK — Marcar entrada/salida
// ============================================================

function TimeClock({ user, onLock, onBack }) {
  const [now, setNow] = React.useState(new Date());
  const [employees, setEmployees] = React.useState([]);
  const [entries, setEntries] = React.useState([]);
  const [toast, setToast] = React.useState(null);

  React.useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  React.useEffect(() => {
    timeclockApi.today()
      .then((data) => {
        if (data && Array.isArray(data.entries)) setEntries(data.entries);
      })
      .catch(() => {});
    staffApi.list().then((items) => setEmployees(items)).catch(() => {});
  }, []);

  const myEntries = entries.filter((t) => t.userId === user.id);
  const openEntry = myEntries.find((t) => !t.out);
  const isWorking = !!openEntry;
  const today = now.toISOString().slice(0, 10);

  const myTotalMins = myEntries.reduce((s, t) => {
    if (!t.in) return s;
    const [ih, im] = t.in.split(":").map(Number);
    const [oh, om] = (t.out || nowHM()).split(":").map(Number);
    return s + (oh * 60 + om - (ih * 60 + im));
  }, 0);

  const refreshEntries = () =>
    timeclockApi.today()
      .then((data) => { if (data && Array.isArray(data.entries)) setEntries(data.entries); })
      .catch(() => {});

  const punchIn = async () => {
    try {
      await timeclockApi.punchIn();
      await refreshEntries();
      setToast({ kind: "in", time: nowHM(), name: user.name });
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      const msg = apiError(err);
      setToast({ kind: "error", time: nowHM(), name: msg });
      setTimeout(() => setToast(null), 3000);
    }
  };

  const punchOut = async () => {
    try {
      await timeclockApi.punchOut();
      await refreshEntries();
      setToast({ kind: "out", time: nowHM(), name: user.name, started: openEntry?.in });
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      const msg = apiError(err);
      setToast({ kind: "error", time: nowHM(), name: msg });
      setTimeout(() => setToast(null), 3000);
    }
  };

  const timeStr = now.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  const dateStr = now.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });

  // Other employees today for the side panel
  const others = employees
    .filter((e) => e.id !== user.id && e.status === "activa")
    .map((e) => {
      const ents = entries.filter((t) => t.userId === e.id);
      const open = ents.find((t) => !t.out);
      return { emp: e, isWorking: !!open, lastIn: open?.in };
    });

  return (
    <div className="screen">
      <TopBar user={user} title="Marcar entrada/salida" onLock={onLock} onBack={onBack}/>
      <div className="clock-body">
        <div className="clock-main">
          <div className="clock-card">
            <div className="clock-time">{timeStr}</div>
            <div className="clock-date">{dateStr}</div>

            <div className="clock-greeting">
              {isWorking ? "Estás trabajando" : "Hola, " + user.name.split(" ")[0]}
            </div>
            <div className="clock-sub">
              {isWorking
                ? `Entrada registrada a las ${openEntry.in}`
                : myEntries.length === 0
                ? "Aún no has checado entrada hoy."
                : `Última jornada terminó a las ${myEntries[myEntries.length - 1].out}.`}
            </div>

            <button
              className={`clock-btn ${isWorking ? "clock-out" : "clock-in"}`}
              onClick={isWorking ? punchOut : punchIn}
            >
              <div className="clock-btn-ico">
                {isWorking ? <Icons.Logout size={28}/> : <Icons.Unlock size={28}/>}
              </div>
              <div>
                <div className="clock-btn-title">
                  {isWorking ? "Marcar salida" : "Marcar entrada"}
                </div>
                <div className="clock-btn-sub">
                  {isWorking ? "Termina tu jornada" : "Comienza tu jornada"}
                </div>
              </div>
            </button>

            <div className="clock-stats">
              <div className="clock-stat">
                <div className="clock-stat-label">Trabajado hoy</div>
                <div className="clock-stat-val">{myTotalMins ? fmtHours(myTotalMins) : "0h"}</div>
              </div>
              <div className="clock-stat">
                <div className="clock-stat-label">Esta semana</div>
                <div className="clock-stat-val">32h 15m</div>
              </div>
              <div className="clock-stat">
                <div className="clock-stat-label">Estado</div>
                <div className="clock-stat-val" style={{ color: isWorking ? "#10b981" : "var(--ink-dim)" }}>
                  {isWorking ? "Trabajando" : "Fuera"}
                </div>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginTop: 12 }}>
            <div className="card-head">
              <div>
                <div className="card-eyebrow">Bitácora del día</div>
                <div className="card-title">Tus marcas de hoy</div>
              </div>
            </div>
            {myEntries.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: "var(--ink-dim)", fontSize: 13 }}>
                Sin registros todavía. Marca tu entrada cuando empieces tu turno.
              </div>
            ) : (
              <div className="punch-list">
                {myEntries.map((t, i) => (
                  <div className="punch-row" key={t.id}>
                    <div className="punch-num">#{i + 1}</div>
                    <div className="punch-block">
                      <div className="punch-label">Entrada</div>
                      <div className="punch-time">{t.in}</div>
                    </div>
                    <div className="punch-arrow">
                      <Icons.ArrowRight size={14}/>
                    </div>
                    <div className="punch-block">
                      <div className="punch-label">Salida</div>
                      <div className="punch-time">
                        {t.out || <span style={{ color: "#10b981" }}>en curso</span>}
                      </div>
                    </div>
                    <div className="punch-total">
                      {(() => {
                        const [ih, im] = t.in.split(":").map(Number);
                        const [oh, om] = (t.out || nowHM()).split(":").map(Number);
                        return fmtHours(oh * 60 + om - (ih * 60 + im));
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <aside className="clock-side">
          <div className="card">
            <div className="card-head">
              <div>
                <div className="card-eyebrow">En el salón ahora</div>
                <div className="card-title">Equipo hoy</div>
              </div>
            </div>
            <div className="other-list">
              {others.map(({ emp, isWorking, lastIn }) => {
                const initials = emp.name.split(" ").map((p) => p[0]).slice(0, 2).join("");
                return (
                  <div className={`other-row ${isWorking ? "" : "off"}`} key={emp.id}>
                    <div className="avatar" style={{ background: `hsl(${emp.avatarHue} 70% 55%)` }}>
                      {initials}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{emp.name}</div>
                      <div style={{ fontSize: 11, color: "var(--ink-dim)" }}>
                        {emp.position}
                      </div>
                    </div>
                    {isWorking ? (
                      <div className="other-status">
                        <span className="status-dot pulse" style={{ background: "#10b981" }}/>
                        <span>desde {lastIn}</span>
                      </div>
                    ) : (
                      <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>fuera</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <div>
                <div className="card-eyebrow">Consejos</div>
                <div className="card-title">Recuerda</div>
              </div>
            </div>
            <ul className="tips-list">
              <li>Si olvidaste marcar entrada, avisa a la administrador para corregirlo.</li>
              <li>El sistema se bloquea solo tras 2 min de inactividad.</li>
              <li>Las horas trabajadas se usan para la nómina del mes.</li>
            </ul>
          </div>
        </aside>
      </div>

      {toast && (
        <div className={`punch-toast ${toast.kind}`}>
          <div className="punch-toast-ico">
            {toast.kind === "in" ? <Icons.Unlock size={20}/> : <Icons.Logout size={20}/>}
          </div>
          <div>
            <div className="punch-toast-title">
              {toast.kind === "in" ? "Entrada registrada" : "Salida registrada"}
            </div>
            <div className="punch-toast-sub">
              {toast.name.split(" ")[0]} · {toast.time}
              {toast.kind === "out" && ` (jornada de ${(() => {
                const [ih, im] = toast.started.split(":").map(Number);
                const [oh, om] = toast.time.split(":").map(Number);
                return fmtHours(oh * 60 + om - (ih * 60 + im));
              })()})`}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { Staff, TimeClock, ConfirmModal, EmployeeModal, PinChangeModal };
