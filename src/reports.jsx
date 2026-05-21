// Reports & Alerts screen + export utilities
import React from 'react';
import { Icons } from './icons.jsx';
import { TopBar } from './menu.jsx';
import { alerts as alertsApi, promotions as promotionsApi, reports as reportsApi, downloadBlob, apiError, analytics as analyticsApi, catalog as catalogApi, staff as staffApi, timeclock as timeclockApi, settings as settingsApi, sales as salesApi } from './api.js';
import { fmtMoney } from './utils.js';

// ============================================================
//   EXPORT UTILITIES
// ============================================================

const exportUtils = (function () {
  // Escape a value for CSV
  const csvEscape = (v) => {
    if (v == null) return "";
    const s = String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // Excel-friendly CSV (UTF-8 BOM)
  const downloadCSV = (filename, headers, rows) => {
    const lines = [headers.map(csvEscape).join(",")];
    rows.forEach((r) => lines.push(r.map(csvEscape).join(",")));
    const blob = new Blob(["﻿" + lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    downloadBlob(blob, filename);
  };

  // ---------- SVG CHART HELPERS ----------
  // All return an SVG string ready to embed in print HTML.

  const palette = ["#de0fab", "#7b2cbf", "#0fb0de", "#10b981", "#f59e0b", "#ef4444", "#64748b"];

  // Line chart: data = [{ x, y, label? }], optionally multi-series
  const lineChartSVG = (series, opts = {}) => {
    const w = opts.width || 720;
    const h = opts.height || 220;
    const pad = { t: 20, r: 16, b: 32, l: 50 };
    const allYs = series.flatMap((s) => s.data.map((d) => d.y));
    const maxY = Math.max(...allYs, 1);
    const allXs = series[0].data.map((d) => d.label || d.x);
    const innerW = w - pad.l - pad.r;
    const innerH = h - pad.t - pad.b;
    const xStep = innerW / Math.max(1, allXs.length - 1);
    const yToPx = (y) => pad.t + innerH - (y / maxY) * innerH;

    // Grid lines (4 horizontal)
    let grid = "";
    for (let i = 0; i <= 4; i++) {
      const y = pad.t + (innerH * i / 4);
      const val = Math.round((maxY * (4 - i)) / 4);
      grid += `<line x1="${pad.l}" y1="${y}" x2="${w - pad.r}" y2="${y}" stroke="#ececef" stroke-width="1"/>`;
      grid += `<text x="${pad.l - 8}" y="${y + 3}" font-size="9" text-anchor="end" fill="#888">${val.toLocaleString()}</text>`;
    }

    // X axis labels (every Nth)
    const labelStep = Math.max(1, Math.ceil(allXs.length / 10));
    let xLabels = "";
    allXs.forEach((lbl, i) => {
      if (i % labelStep !== 0 && i !== allXs.length - 1) return;
      const x = pad.l + i * xStep;
      xLabels += `<text x="${x}" y="${h - 10}" font-size="9" text-anchor="middle" fill="#888">${lbl}</text>`;
    });

    // Series paths + dots
    let paths = "";
    series.forEach((s, sIdx) => {
      const color = s.color || palette[sIdx % palette.length];
      const d = s.data
        .map((pt, i) => `${i === 0 ? "M" : "L"} ${pad.l + i * xStep} ${yToPx(pt.y)}`)
        .join(" ");
      paths += `<path d="${d}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round"/>`;
    });

    // Legend
    let legend = "";
    if (series.length > 1) {
      let lx = pad.l;
      series.forEach((s, sIdx) => {
        const color = s.color || palette[sIdx % palette.length];
        legend += `<rect x="${lx}" y="2" width="8" height="8" fill="${color}" rx="2"/>`;
        legend += `<text x="${lx + 12}" y="9" font-size="9" fill="#444">${s.name}</text>`;
        lx += (s.name.length * 5.2 + 22);
      });
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="100%" height="${h}">
      ${legend}
      ${grid}
      ${paths}
      ${xLabels}
    </svg>`;
  };

  // Bar chart: data = [{ label, value, color? }]
  const barChartSVG = (data, opts = {}) => {
    const w = opts.width || 720;
    const h = opts.height || 220;
    const pad = { t: 20, r: 16, b: 60, l: 50 };
    const maxV = Math.max(...data.map((d) => d.value), 1);
    const innerW = w - pad.l - pad.r;
    const innerH = h - pad.t - pad.b;
    const barWidth = (innerW / data.length) * 0.65;
    const slot = innerW / data.length;

    let grid = "";
    for (let i = 0; i <= 4; i++) {
      const y = pad.t + (innerH * i / 4);
      const val = Math.round((maxV * (4 - i)) / 4);
      grid += `<line x1="${pad.l}" y1="${y}" x2="${w - pad.r}" y2="${y}" stroke="#ececef" stroke-width="1"/>`;
      grid += `<text x="${pad.l - 8}" y="${y + 3}" font-size="9" text-anchor="end" fill="#888">${val.toLocaleString()}</text>`;
    }

    let bars = "";
    data.forEach((d, i) => {
      const color = d.color || opts.color || palette[i % palette.length];
      const x = pad.l + i * slot + (slot - barWidth) / 2;
      const barH = (d.value / maxV) * innerH;
      const y = pad.t + innerH - barH;
      bars += `<rect x="${x}" y="${y}" width="${barWidth}" height="${barH}" fill="${color}" rx="4"/>`;
      // Value on top of bar
      bars += `<text x="${x + barWidth / 2}" y="${y - 4}" font-size="9" font-weight="700" text-anchor="middle" fill="#444">${typeof d.value === 'number' ? d.value.toLocaleString() : d.value}</text>`;
      // Label rotated
      const lx = x + barWidth / 2;
      const ly = pad.t + innerH + 14;
      const truncated = d.label.length > 14 ? d.label.slice(0, 12) + "…" : d.label;
      bars += `<text x="${lx}" y="${ly}" font-size="9" text-anchor="middle" fill="#666" transform="rotate(-20 ${lx} ${ly})">${truncated}</text>`;
    });

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="100%" height="${h}">
      ${grid}
      ${bars}
    </svg>`;
  };

  // Pie/donut chart: data = [{ label, value, color? }]
  const pieChartSVG = (data, opts = {}) => {
    const w = opts.width || 360;
    const h = opts.height || 220;
    const cx = 110, cy = h / 2;
    const r = 80;
    const ir = 50;
    const total = data.reduce((s, d) => s + d.value, 0) || 1;

    let angle = -Math.PI / 2;
    let segs = "";
    const enriched = data.map((d, i) => {
      const color = d.color || palette[i % palette.length];
      const portion = d.value / total;
      const a2 = angle + portion * Math.PI * 2;
      const x1 = cx + Math.cos(angle) * r;
      const y1 = cy + Math.sin(angle) * r;
      const x2 = cx + Math.cos(a2) * r;
      const y2 = cy + Math.sin(a2) * r;
      const ix1 = cx + Math.cos(angle) * ir;
      const iy1 = cy + Math.sin(angle) * ir;
      const ix2 = cx + Math.cos(a2) * ir;
      const iy2 = cy + Math.sin(a2) * ir;
      const large = portion > 0.5 ? 1 : 0;
      segs += `<path d="M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${ir} ${ir} 0 ${large} 0 ${ix1} ${iy1} Z" fill="${color}" stroke="white" stroke-width="2"/>`;
      angle = a2;
      return { ...d, color, pct: (portion * 100).toFixed(1) };
    });

    let legend = "";
    const lx = 220;
    enriched.forEach((d, i) => {
      const ly = 20 + i * 22;
      legend += `<rect x="${lx}" y="${ly - 8}" width="10" height="10" fill="${d.color}" rx="2"/>`;
      legend += `<text x="${lx + 16}" y="${ly}" font-size="10" fill="#222" font-weight="600">${d.label}</text>`;
      legend += `<text x="${w - 10}" y="${ly}" font-size="10" fill="#666" text-anchor="end">${d.pct}%</text>`;
    });

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="100%" height="${h}">
      ${segs}
      ${legend}
    </svg>`;
  };

  // Sparkline (small inline line chart)
  const sparkline = (values, opts = {}) => {
    const w = opts.width || 100;
    const h = opts.height || 24;
    const color = opts.color || "#de0fab";
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const range = max - min || 1;
    const step = w / Math.max(1, values.length - 1);
    const d = values.map((v, i) => `${i === 0 ? "M" : "L"} ${i * step} ${h - ((v - min) / range) * (h - 4) - 2}`).join(" ");
    return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><path d="${d}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round"/></svg>`;
  };

  // ---------- PRINT-TO-PDF ----------
  // Sections: array of:
  //   { title, subtitle, columns, rows, totals, chart, charts, html }
  //   - columns/rows/totals: tabular section
  //   - chart/charts: HTML string(s) to embed (typically from *ChartSVG)
  //   - html: arbitrary HTML
  // For a single-section report, pass `{ title, subtitle, columns, rows, totals, chart }`.
  const printReport = (cfg) => {
    const win = window.open("", "_blank", "width=900,height=900");
    if (!win) {
      alert("Permite ventanas emergentes para imprimir el reporte.");
      return;
    }
    const today = new Date().toLocaleString("es-MX", {
      dateStyle: "long",
      timeStyle: "short",
    });
    const biz = cfg.business || {};
    const bizName    = biz.name    || "Ely's Salón";
    const bizAddress = biz.address || "";
    const bizEmail   = biz.email   || "";
    const bizPhone   = biz.phone   || "";
    const bizContact = [bizAddress, bizPhone, bizEmail].filter(Boolean).join(" · ");

    // Normalize to "sections" array
    const sections = cfg.sections
      ? cfg.sections
      : [{
          title: cfg.title,
          subtitle: cfg.subtitle,
          columns: cfg.columns,
          rows: cfg.rows,
          totals: cfg.totals,
          chart: cfg.chart,
          charts: cfg.charts,
          html: cfg.html,
        }];

    const renderSection = (s, isFirst) => {
      const totalsHtml = s.totals
        ? `<div class="totals">${s.totals
            .map(
              (t) =>
                `<div><div class="lbl">${t.label}</div><div class="val">${t.value}</div></div>`
            )
            .join("")}</div>`
        : "";

      const tableHtml = (s.columns && s.rows)
        ? `<table>
            <thead>
              <tr>${s.columns.map((c) => `<th class="${c.align === 'right' ? 'num' : ''}">${c.label}</th>`).join("")}</tr>
            </thead>
            <tbody>
              ${s.rows.map((r) => `<tr>${r.map((cell, i) => `<td class="${s.columns[i].align === 'right' ? 'num' : ''}">${cell}</td>`).join("")}</tr>`).join("")}
            </tbody>
          </table>`
        : "";

      const chartsHtml = (s.charts || (s.chart ? [s.chart] : []))
        .map((c) => `<div class="chart">${c}</div>`).join("");

      return `<section class="report-section${isFirst ? '' : ' pb'}">
        ${s.title ? `<h2 class="${isFirst ? 'first' : ''}">${s.title}</h2>` : ""}
        ${s.subtitle ? `<div class="sub">${s.subtitle}</div>` : ""}
        ${chartsHtml}
        ${tableHtml}
        ${totalsHtml}
        ${s.html || ""}
      </section>`;
    };

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>${cfg.docTitle || sections[0].title || "Reporte"}</title>
<style>
  @page { margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: Helvetica, Arial, sans-serif; color: #15131a; margin: 0; padding: 0; font-size: 11px; }
  .head { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #de0fab; padding-bottom: 12px; margin-bottom: 18px; }
  .brand { font-size: 18px; font-weight: 700; }
  .brand span { color: #de0fab; }
  .meta { text-align: right; font-size: 10px; color: #666; }
  h1 { font-size: 22px; margin: 0 0 4px; letter-spacing: -0.02em; color: #15131a; }
  h2 { font-size: 16px; margin: 0 0 4px; letter-spacing: -0.01em; color: #15131a; padding-top: 14px; border-top: 1px solid #eee; }
  h2.first { padding-top: 0; border-top: none; }
  .sub { color: #666; font-size: 11px; margin-bottom: 12px; }
  .doc-sub { color: #666; font-size: 12px; margin: 4px 0 22px; }
  .report-section { margin-bottom: 22px; page-break-inside: avoid; }
  .report-section.pb { page-break-before: auto; }
  .chart { margin: 10px 0 14px; padding: 8px 0; background: #fafafa; border-radius: 6px; }
  table { width: 100%; border-collapse: collapse; font-size: 10.5px; margin-top: 6px; }
  th { text-align: left; background: #f7f6f7; padding: 8px 10px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; font-size: 9.5px; color: #555; border-bottom: 1px solid #ddd; }
  td { padding: 7px 10px; border-bottom: 1px solid #eee; }
  tbody tr:nth-child(even) td { background: #fbfafb; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .totals { margin-top: 14px; display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; padding: 12px; background: #fdebf6; border-radius: 6px; border: 1px solid #f8c4e2; }
  .totals .lbl { font-size: 9px; text-transform: uppercase; letter-spacing: .04em; color: #888; }
  .totals .val { font-size: 16px; font-weight: 700; color: #b00d87; font-variant-numeric: tabular-nums; }
  .foot { margin-top: 26px; padding-top: 12px; border-top: 1px dashed #ccc; color: #999; font-size: 9px; text-align: center; }
  .actions { position: fixed; top: 10px; right: 10px; z-index: 100; display: flex; gap: 6px; }
  .actions button { padding: 8px 14px; border-radius: 6px; border: 1px solid #ddd; background: white; cursor: pointer; font-size: 12px; font-family: inherit; }
  .actions button.primary { background: #de0fab; color: white; border-color: #de0fab; }
  @media print { .no-print { display: none; } }
</style>
</head>
<body>
  <div class="actions no-print">
    <button onclick="window.close()">Cerrar</button>
    <button class="primary" onclick="window.print()">Imprimir / Guardar PDF</button>
  </div>
  <div class="head">
    <div>
      <div class="brand">${bizName}</div>
      ${bizContact ? `<div style="font-size: 10px; color: #666;">${bizContact}</div>` : ""}
    </div>
    <div class="meta">
      Generado: ${today}<br>
      Reporte: ${cfg.docTitle || sections[0].title || ""}
    </div>
  </div>
  ${cfg.docTitle ? `<h1>${cfg.docTitle}</h1><div class="doc-sub">${cfg.docSubtitle || ""}</div>` : ""}
  ${sections.map((s, i) => renderSection(s, i === 0)).join("")}
  <div class="foot">Ely's Salón · Reporte generado automáticamente · ${today}</div>
</body>
</html>`;
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
  };

  return { downloadCSV, printReport, lineChartSVG, barChartSVG, pieChartSVG, sparkline };
})();

// ============================================================
//   REPORTS & ALERTS SCREEN
// ============================================================

function Reports({ user, onLock, onBack, onNav }) {
  const [tab, setTab] = React.useState("alerts");
  const [toast, setToast] = React.useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  };

  return (
    <div className="screen">
      <TopBar user={user} title="Reportes y alertas" onLock={onLock} onBack={onBack} onLogout={onLock}/>
      <div className="ana-body">
        <div className="ana-head">
          <div>
            <div className="ana-eyebrow">Centro de control · {new Date().toLocaleDateString("es-MX", { month: "long", year: "numeric" })}</div>
            <h2 className="ana-title">Reportes y alertas</h2>
          </div>
        </div>

        <div className="tabs" style={{ marginBottom: 20, padding: 0 }}>
          {[
            { id: "alerts",   label: "Alertas",          icon: "TrendUp" },
            { id: "history",  label: "Historial de ventas", icon: "Cash" },
            { id: "reports",  label: "Generar reportes", icon: "Receipt" },
          ].map((t) => {
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

        {tab === "alerts"  && <AlertsPanel onNav={onNav} onAction={showToast}/>}
        {tab === "history" && <SalesHistory onAction={showToast}/>}
        {tab === "reports" && <ReportsPanel onAction={showToast}/>}
      </div>

      {toast && (
        <div className="toast">
          <div className="toast-ico"><Icons.Check size={16}/></div>
          <div>
            <div className="toast-title">{toast.title || "Listo"}</div>
            <div className="toast-sub">{toast.sub || toast}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function AlertsPanel({ onNav, onAction }) {
  const [products, setProducts] = React.useState([]);
  const [stockAlerts, setStockAlerts] = React.useState({});
  const [defaultMin, setDefaultMin] = React.useState(8);
  const [editingStockFor, setEditingStockFor] = React.useState(null);
  const [promos, setPromos] = React.useState([]);
  const [promoStates, setPromoStates] = React.useState([]);

  React.useEffect(() => {
    catalogApi.get().then((result) => {
      const prods = result.items.filter((p) => p.type === "P");
      setProducts(prods);
      const alerts = {};
      prods.forEach((p) => {
        alerts[p.id] = {
          enabled: p.alertEnabled ?? false,
          min: p.stockMin ?? defaultMin,
        };
      });
      setStockAlerts(alerts);
    }).catch(() => {});
    promotionsApi.list().then((items) => {
      setPromos(items);
      setPromoStates(items.map((p) => p.active));
}).catch(() => {});
  }, []);

  const lowStockAlerts = products.filter(
    (p) => stockAlerts[p.id]?.enabled && (p.stock || 0) <= stockAlerts[p.id].min
  );
  const outOfStock = lowStockAlerts.filter((p) => p.stock === 0);

  const togglePromo = (i) => {
    const newActive = !promoStates[i];
    setPromoStates((arr) => arr.map((v, j) => j === i ? newActive : v));
    const promoId = promos[i]?.id ?? i;
    promotionsApi.update(promoId, { active: newActive }).catch((err) => {
      // Revert on error
      setPromoStates((arr) => arr.map((v, j) => j === i ? !newActive : v));
      onAction({ title: "Error al actualizar promoción", sub: apiError(err) });
    });
  };

  // Discount review (no review action needed — just display)
  const recentDiscounts = [
    { id: "d1", ticket: "#1289", item: "Tinte completo",        from: 55, to: 48, by: "Ely M.", at: "Hoy 14:32" },
    { id: "d2", ticket: "#1287", item: "Mascarilla hidratante", from: 22, to: 18, by: "Ely M.", at: "Hoy 11:45" },
    { id: "d3", ticket: "#1283", item: "Pedicure spa",          from: 25, to: 20, by: "Ely M.", at: "Ayer 18:20" },
    { id: "d4", ticket: "#1281", item: "Aceite de argán",       from: 15, to: 12, by: "Ely M.", at: "Ayer 13:10" },
  ];

  // Slow movers with editable suggested offer
  const [slowMovers, setSlowMovers] = React.useState([]);
  const [editingOffer, setEditingOffer] = React.useState(null);

  // Load alerts from API on mount; fall back to mock data silently on error
  React.useEffect(() => {
    alertsApi.list().then((resp) => {
      if (resp.lowStock && Array.isArray(resp.lowStock)) {
        // Low-stock: update stockAlerts config from API
        resp.lowStock.forEach((item) => {
          if (item.productId) {
            setStockAlerts((s) => ({
              ...s,
              [item.productId]: {
                enabled: true,
                min: item.minStock ?? s[item.productId]?.min ?? defaultMin,
              },
            }));
          }
        });
      }
      if (resp.slowMovers && Array.isArray(resp.slowMovers) && resp.slowMovers.length > 0) {
        setSlowMovers(resp.slowMovers.map((s) => ({
          ...s,
          basePrice: s.basePrice != null ? Number(s.basePrice) : 0,
          suggested: s.suggested || { kind: "percent", value: 15 },
        })));
      }
      if (resp.promotions && Array.isArray(resp.promotions) && resp.promotions.length > 0) {
        // Sync promo active state; API promotions array has { id, active, ... }
        setPromoStates(resp.promotions.map((p) => p.active ?? p.on ?? false));
      }
    }).catch(() => {
      // Keep mock data silently
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const calcOfferPrice = (base, kind, value) =>
    kind === "amount"
      ? Math.max(0, base - +value)
      : +(base * (1 - +value / 100)).toFixed(2);

  const setLowStockEnabled = (id, on) => {
    setStockAlerts((s) => ({ ...s, [id]: { ...s[id], enabled: on } }));
    alertsApi.updateProductStockAlert(id, { alertEnabled: on }).catch((err) => {
      setStockAlerts((s) => ({ ...s, [id]: { ...s[id], enabled: !on } }));
      onAction({ title: "Error al actualizar alerta", sub: apiError(err) });
    });
  };
  const setLowStockMin = (id, min) => {
    setStockAlerts((s) => ({ ...s, [id]: { ...s[id], min: +min || 0 } }));
    alertsApi.updateProductStockAlert(id, { stockMin: +min || 0 }).catch((err) => {
      onAction({ title: "Error al guardar stock mínimo", sub: apiError(err) });
    });
  };
  const setSlowMover = (id, patch) =>
    setSlowMovers((arr) => arr.map((s) => s.id === id ? { ...s, ...patch } : s));

  const enabledCount = Object.values(stockAlerts).filter((s) => s.enabled).length;
  const activeOffers = slowMovers.filter((s) => s.live).length;

  return (
    <div>
      <div className="alerts-summary">
        <div className="alerts-counts">
          <span className="alert-pill active">
            <span className="status-dot pulse" style={{ background: "var(--magenta)" }}/>
            {lowStockAlerts.length + (slowMovers.length - activeOffers)} alertas activas
          </span>
          <span className="alert-pill done">
            <Icons.Tag size={11}/> {activeOffers} ofertas activas · {enabledCount} alertas configuradas
          </span>
        </div>
      </div>

      <div className="alerts-grid">
        {/* STOCK BAJO — configurar alertas + ver activas */}
        <div className="alert-card alert-card-wide">
          <div className="alert-head">
            <div className="alert-ico" style={{ background: "var(--magenta-soft)", color: "var(--magenta)" }}>
              <Icons.Box size={18}/>
            </div>
            <div style={{ flex: 1 }}>
              <div className="alert-title">Alertas de stock</div>
              <div className="alert-sub">
                {lowStockAlerts.length} alertas activas · Configura stock mínimo por producto
              </div>
            </div>
            <button className="btn-ghost btn-sm" onClick={() => onNav && onNav("inventory")}>
              Inventario <Icons.ArrowRight size={11}/>
            </button>
          </div>

          {/* Default min stock */}
          <div className="alert-default-row">
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Stock mínimo por defecto</div>
              <div style={{ fontSize: 11, color: "var(--ink-dim)" }}>
                Se usa cuando un producto no tiene un mínimo personalizado.
              </div>
            </div>
            <div className="form-stepper" style={{ height: 36 }}>
              <button onClick={() => setDefaultMin((v) => Math.max(1, v - 1))}>
                <Icons.Minus size={11}/>
              </button>
              <input
                type="number"
                min="1"
                value={defaultMin}
                onChange={(e) => setDefaultMin(+e.target.value || 1)}
                style={{ width: 50, fontSize: 14 }}
              />
              <button onClick={() => setDefaultMin((v) => v + 1)}>
                <Icons.Plus size={11}/>
              </button>
            </div>
            <button
              className="btn-primary btn-sm"
              style={{ marginLeft: 8 }}
              onClick={() => {
                alertsApi.setStockConfig({ defaultMinStock: defaultMin })
                  .then(() => onAction({ title: "Configuración guardada", sub: `Stock mínimo por defecto: ${defaultMin}` }))
                  .catch((err) => onAction({ title: "Error al guardar", sub: apiError(err) }));
              }}
            >
              <Icons.Check size={12}/> Guardar
            </button>
          </div>

          {/* Active alerts */}
          {lowStockAlerts.length > 0 && (
            <>
              <div className="alert-section-head">
                <Icons.TrendUp size={11}/> Productos con stock crítico ahora
              </div>
              <div className="alert-list">
                {lowStockAlerts.map((p) => {
                  const out = (p.stock || 0) === 0;
                  return (
                    <div className="alert-row" key={p.id}>
                      <div className="inv-thumb" style={{ backgroundImage: `url(${p.image})` }}/>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: "var(--ink-dim)" }}>
                          {p.brand} · alerta a partir de {stockAlerts[p.id].min} unidades
                        </div>
                      </div>
                      <span className={`stock-pill ${out ? "out" : "low"}`}>
                        {p.stock} unid.
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <div className="alert-section-head">
            <Icons.Settings size={11}/> Configuración por producto
          </div>
          <div className="alert-list config-list">
            {products.map((p) => {
              const cfg = stockAlerts[p.id];
              const editing = editingStockFor === p.id;
              return (
                <div className={`alert-row config ${cfg.enabled ? "" : "disabled"}`} key={p.id}>
                  <div className="inv-thumb" style={{ backgroundImage: `url(${p.image})` }}/>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: "var(--ink-dim)" }}>
                      Stock actual: <b style={{ color: "var(--ink)" }}>{p.stock}</b>
                      {" · "}Alerta a partir de:{" "}
                      {editing ? (
                        <input
                          type="number"
                          className="inline-num"
                          autoFocus
                          value={cfg.min}
                          onChange={(e) => setLowStockMin(p.id, e.target.value)}
                          onBlur={() => setEditingStockFor(null)}
                          onKeyDown={(e) => e.key === "Enter" && setEditingStockFor(null)}
                          min="1"
                        />
                      ) : (
                        <button
                          className="inline-edit"
                          onClick={() => setEditingStockFor(p.id)}
                          disabled={!cfg.enabled}
                        >
                          {cfg.min} unidades <Icons.Settings size={10}/>
                        </button>
                      )}
                    </div>
                  </div>
                  <button
                    className={`hours-toggle ${cfg.enabled ? "on" : ""}`}
                    onClick={() => {
                      setLowStockEnabled(p.id, !cfg.enabled);
                      onAction({
                        title: cfg.enabled ? "Alerta desactivada" : "Alerta activada",
                        sub: p.name,
                      });
                    }}
                  >
                    <span/>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* PROMOCIONES */}
        <div className="alert-card">
          <div className="alert-head">
            <div className="alert-ico" style={{ background: "rgba(123,44,191,.12)", color: "#7b2cbf" }}>
              <Icons.Tag size={18}/>
            </div>
            <div style={{ flex: 1 }}>
              <div className="alert-title">Promociones</div>
              <div className="alert-sub">
                {promoStates.filter(Boolean).length} activas · {promoStates.filter((v) => !v).length} pausadas
              </div>
            </div>
          </div>

          <div className="alert-list">
            {promos.map((p, i) => {
              const on = promoStates[i];
              return (
                <div className={`alert-row promo ${on ? "" : "off"}`} key={p.name}>
                  <div className="promo-off" style={{ background: on ? "var(--magenta)" : "var(--ink-faint)" }}>
                    {p.off}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: "var(--ink-dim)" }}>{p.desc}</div>
                  </div>
                  <button
                    className={`hours-toggle ${on ? "on" : ""}`}
                    onClick={() => { togglePromo(i); onAction({ title: on ? "Promoción pausada" : "Promoción activada", sub: p.name }); }}
                  >
                    <span/>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* DESCUENTOS APLICADOS (read-only, no actions) */}
        <div className="alert-card">
          <div className="alert-head">
            <div className="alert-ico" style={{ background: "rgba(15,176,222,.12)", color: "#0fb0de" }}>
              <Icons.Tag size={18}/>
            </div>
            <div style={{ flex: 1 }}>
              <div className="alert-title">Descuentos aplicados</div>
              <div className="alert-sub">Bitácora de descuentos manuales del admin</div>
            </div>
          </div>

          <div className="alert-list">
            {recentDiscounts.map((d) => (
              <div className="alert-row" key={d.id}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{d.item}</div>
                  <div style={{ fontSize: 11, color: "var(--ink-dim)" }}>
                    {d.ticket} · {d.by} · {d.at}
                  </div>
                </div>
                <div className="disc-trio">
                  <span className="disc-from">${d.from}</span>
                  <Icons.ArrowRight size={11}/>
                  <span className="disc-to">${d.to}</span>
                </div>
                <div className="disc-saved">−${d.from - d.to}</div>
              </div>
            ))}
          </div>
        </div>

        {/* PRODUCTOS SIN MOVIMIENTO con oferta editable */}
        <div className="alert-card alert-card-wide">
          <div className="alert-head">
            <div className="alert-ico" style={{ background: "rgba(245,158,11,.12)", color: "#f59e0b" }}>
              <Icons.Clock size={18}/>
            </div>
            <div style={{ flex: 1 }}>
              <div className="alert-title">Productos sin movimiento</div>
              <div className="alert-sub">
                Sugerencias de oferta para mover el stock estancado · {activeOffers} en línea
              </div>
            </div>
          </div>

          <div className="alert-list">
            {slowMovers.length === 0 ? (
              <div className="alert-empty">
                <Icons.Check size={20}/> Todo el catálogo está en movimiento.
              </div>
            ) : slowMovers.map((s) => {
              const basePrice = s.basePrice != null ? Number(s.basePrice) : 0;
              const offerPrice = calcOfferPrice(basePrice, s.suggested.kind, s.suggested.value);
              const saving = (basePrice - offerPrice).toFixed(2);
              return (
                <div className={`alert-row offer-row ${s.live ? "live" : ""}`} key={s.id}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: "var(--ink-dim)" }}>
                      {s.stock} en stock · {s.lastSold}
                    </div>
                  </div>

                  <div className="offer-preview">
                    <div className="offer-label">Oferta sugerida</div>
                    <div className="offer-prices">
                      <span className="offer-from">{fmtMoney(basePrice)}</span>
                      <Icons.ArrowRight size={11}/>
                      <span className="offer-to">{fmtMoney(offerPrice)}</span>
                      <span className="offer-tag">
                        {s.suggested.kind === "amount"
                          ? `-${fmtMoney(s.suggested.value)}`
                          : `-${s.suggested.value}%`}
                      </span>
                    </div>
                    <div className="offer-saving">Ahorra {fmtMoney(saving)}</div>
                  </div>

                  <div className="offer-actions">
                    <button
                      className="btn-ghost btn-sm"
                      onClick={() => setEditingOffer(s.id)}
                    >
                      Ajustar
                    </button>
                    {s.live ? (
                      <button
                        className="btn-ghost btn-sm"
                        onClick={() => {
                          setSlowMover(s.id, { live: false });
                          alertsApi.updateSlowMover(s.id, { offer_active: false }).catch((err) => {
                            setSlowMover(s.id, { live: true });
                            onAction({ title: "Error al retirar oferta", sub: apiError(err) });
                          });
                          onAction({ title: "Oferta retirada", sub: s.name });
                        }}
                        style={{ color: "var(--magenta)" }}
                      >
                        Retirar
                      </button>
                    ) : (
                      <button
                        className="btn-primary btn-sm"
                        onClick={() => {
                          setSlowMover(s.id, { live: true });
                          alertsApi.updateSlowMover(s.id, {
                            offer_active: true,
                            offer_kind: s.suggested.kind,
                            offer_value: s.suggested.value,
                          }).catch((err) => {
                            setSlowMover(s.id, { live: false });
                            onAction({ title: "Error al publicar oferta", sub: apiError(err) });
                          });
                          onAction({
                            title: "Oferta en línea",
                            sub: `${s.name} · ${s.suggested.kind === "amount" ? `-${fmtMoney(s.suggested.value)}` : `-${s.suggested.value}%`}`,
                          });
                        }}
                      >
                        <Icons.Sparkle size={11}/> Poner en línea
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {editingOffer && (
        <OfferEditModal
          slow={slowMovers.find((s) => s.id === editingOffer)}
          onClose={() => setEditingOffer(null)}
          onSave={(patch) => {
            const id = editingOffer;
            setSlowMover(id, patch);
            setEditingOffer(null);
            alertsApi.updateSlowMover(id, {
              offer_kind: patch.suggested?.kind,
              offer_value: patch.suggested?.value,
            }).catch((err) => {
              onAction({ title: "Error al guardar oferta", sub: apiError(err) });
            });
            onAction({ title: "Oferta actualizada", sub: "Cambios listos para poner en línea" });
          }}
        />
      )}
    </div>
  );
}

function OfferEditModal({ slow, onClose, onSave }) {
  const [kind, setKind] = React.useState(slow.suggested.kind);
  const [value, setValue] = React.useState(slow.suggested.value);
  const basePrice = slow.basePrice != null ? Number(slow.basePrice) : 0;
  const preview =
    kind === "amount"
      ? Math.max(0, basePrice - +value)
      : +(basePrice * (1 - +value / 100)).toFixed(2);

  const quick = kind === "amount" ? [1, 2, 5, 10] : [10, 20, 30, 50];

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="modal-eyebrow">Ajustar oferta</div>
            <div className="modal-title">{slow.name}</div>
            <div className="modal-sub">
              Precio base ${basePrice} · {slow.stock} en stock · {slow.lastSold}
            </div>
          </div>
          <button className="iconbtn" onClick={onClose}>
            <Icons.X size={16}/>
          </button>
        </div>

        <div className="disc-toggle">
          <button
            className={`disc-tog ${kind === "amount" ? "active" : ""}`}
            onClick={() => setKind("amount")}
          >
            Monto ($)
          </button>
          <button
            className={`disc-tog ${kind === "percent" ? "active" : ""}`}
            onClick={() => setKind("percent")}
          >
            Porcentaje (%)
          </button>
        </div>

        <div className="disc-input-row">
          <div className="disc-input">
            <span className="disc-prefix">{kind === "amount" ? "$" : "%"}</span>
            <input
              type="number"
              min="0"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoFocus
            />
          </div>
          <div className="disc-quick">
            {quick.map((q) => (
              <button key={q} onClick={() => setValue(q)}>
                {kind === "amount" ? fmtMoney(q) : `${q}%`}
              </button>
            ))}
          </div>
        </div>

        <div className="disc-preview">
          <div>
            <div className="dp-label">Precio normal</div>
            <div className="dp-old">${basePrice}</div>
          </div>
          <Icons.ArrowRight size={18}/>
          <div>
            <div className="dp-label">Cliente paga</div>
            <div className="dp-new">{fmtMoney(preview)}</div>
          </div>
          <div className="dp-saved">
            Ahorra <b>{fmtMoney(basePrice - preview)}</b>
          </div>
        </div>

        <div className="modal-foot">
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button
            className="btn-primary"
            onClick={() => onSave({ suggested: { kind, value: +value || 0 } })}
          >
            <Icons.Check size={14}/> Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
//   SALES HISTORY
// ============================================================

const SALE_RANGES = [
  { key: 'today', label: 'Hoy' },
  { key: '7d',    label: '7 días' },
  { key: '30d',   label: '30 días' },
  { key: '90d',   label: '90 días' },
  { key: '365d',  label: 'Año' },
  { key: 'custom', label: 'Personalizado' },
];

function fmtDateTime(dateStr, timeStr) {
  if (!dateStr) return '—';
  const [, m, d] = dateStr.split('-');
  const time = timeStr ? timeStr.slice(0, 5) : '';
  return `${+d}/${+m}${time ? ' ' + time : ''}`;
}

function paymentLabel(payments) {
  if (!payments?.length) return '—';
  const methods = [...new Set(payments.map((p) => p.method))];
  if (methods.length === 1) {
    if (methods[0] === 'cash')   return 'Efectivo';
    if (methods[0] === 'card')   return 'Tarjeta';
    return methods[0];
  }
  return 'Mixto';
}

function SalesRangeBar({ range, setRange, customFrom, setCustomFrom, customTo, setCustomTo }) {
  return (
    <div className="ana-date-range" style={{ marginBottom: 20 }}>
      <div className="sh-pills">
        {SALE_RANGES.map((r) => (
          <button
            key={r.key}
            className={`tab ${range === r.key ? 'active' : ''}`}
            style={{ padding: '5px 12px', fontSize: 13 }}
            onClick={() => setRange(r.key)}
          >
            {r.label}
          </button>
        ))}
      </div>
      {range === 'custom' && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10, flexWrap: 'wrap' }}>
          <label className="ana-date-label">De</label>
          <input
            type="date"
            className="ana-date-input"
            value={customFrom}
            max={customTo}
            onChange={(e) => setCustomFrom(e.target.value)}
          />
          <label className="ana-date-label">hasta</label>
          <input
            type="date"
            className="ana-date-input"
            value={customTo}
            min={customFrom}
            max={new Date().toISOString().split('T')[0]}
            onChange={(e) => setCustomTo(e.target.value)}
          />
        </div>
      )}
    </div>
  );
}

function SalesSummaryStrip({ sales }) {
  const active  = sales.filter((s) => !s.voided);
  const voided  = sales.filter((s) => s.voided);
  const total   = active.reduce((acc, s) => acc + (s.total ?? 0), 0);
  const avg     = active.length ? total / active.length : 0;

  return (
    <div className="sh-strip">
      <div className="sh-strip-item">
        <span className="sh-strip-val">{active.length}</span>
        <span className="sh-strip-lbl">ventas</span>
      </div>
      <div className="sh-strip-sep"/>
      <div className="sh-strip-item">
        <span className="sh-strip-val">{fmtMoney(total)}</span>
        <span className="sh-strip-lbl">total</span>
      </div>
      <div className="sh-strip-sep"/>
      <div className="sh-strip-item">
        <span className="sh-strip-val">{fmtMoney(avg)}</span>
        <span className="sh-strip-lbl">promedio</span>
      </div>
      {voided.length > 0 && (
        <>
          <div className="sh-strip-sep"/>
          <div className="sh-strip-item">
            <span className="sh-strip-val sh-strip-val--void">{voided.length}</span>
            <span className="sh-strip-lbl">anuladas</span>
          </div>
        </>
      )}
    </div>
  );
}

function SalesTableRow({ sale, onVoidRequest }) {
  const [expanded, setExpanded] = React.useState(false);
  const lines = sale.lines ?? [];
  const pmtLabel = paymentLabel(sale.payments);

  return (
    <>
      <tr
        className={`sh-row ${sale.voided ? 'sh-row--void' : ''}`}
        onClick={() => setExpanded((v) => !v)}
      >
        <td className="sh-cell sh-cell--date">{fmtDateTime(sale.date, sale.time)}</td>
        <td className="sh-cell">{sale.employeeName ?? '—'}</td>
        <td className="sh-cell sh-cell--num">{lines.length}</td>
        <td className="sh-cell sh-cell--num sh-cell--money">{fmtMoney(sale.total ?? 0)}</td>
        <td className="sh-cell">
          <span className="sh-badge sh-badge--pay">{pmtLabel}</span>
        </td>
        <td className="sh-cell">
          {sale.voided
            ? <span className="sh-badge sh-badge--void">Anulada</span>
            : <span className="sh-badge sh-badge--ok">Activa</span>
          }
        </td>
        <td className="sh-cell sh-cell--actions" onClick={(e) => e.stopPropagation()}>
          <button
            className="btn-ghost btn-sm"
            title="Ver detalle"
            onClick={() => setExpanded((v) => !v)}
          >
            <Icons.TrendUp size={13}/>
          </button>
          {!sale.voided && (
            <button
              className="btn-ghost btn-sm"
              title="Anular venta"
              style={{ color: 'var(--magenta)' }}
              onClick={() => onVoidRequest(sale)}
            >
              <Icons.Trash size={13}/>
            </button>
          )}
        </td>
      </tr>
      {expanded && (
        <tr className="sh-detail-row">
          <td colSpan={7}>
            <div className="sh-detail">
              <div className="sh-detail-header">
                <span className="sh-detail-label">Artículo</span>
                <span className="sh-detail-label sh-detail-label--r">Cant.</span>
                <span className="sh-detail-label sh-detail-label--r">Subtotal</span>
              </div>
              {lines.map((l, i) => (
                <div className="sh-detail-line" key={i}>
                  <span className="sh-detail-name">{l.itemName ?? l.name}</span>
                  <span className="sh-detail-qty">× {l.qty ?? 1}</span>
                  <div className="sh-detail-right">
                    <span className="sh-detail-price">{fmtMoney((l.price ?? 0) * (l.qty ?? 1))}</span>
                    {(l.discountValue > 0) && (
                      <span className="sh-detail-disc">
                        −{l.discountKind === 'percent' ? `${l.discountValue}%` : fmtMoney(l.discountValue)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {(sale.tip > 0) && (
                <div className="sh-detail-line sh-detail-line--tip">
                  <span className="sh-detail-name">Propina</span>
                  <span/>
                  <span className="sh-detail-price">{fmtMoney(sale.tip)}</span>
                </div>
              )}
              <div className="sh-detail-total">
                <div>
                  <span className="sh-detail-total-label">Total</span>
                  {sale.customerName && (
                    <span className="sh-detail-customer"> · {sale.customerName}</span>
                  )}
                </div>
                <span className="sh-detail-total-amt">{fmtMoney(sale.total ?? 0)}</span>
              </div>
              {sale.payments?.length > 0 && (
                <div className="sh-detail-payments">
                  {sale.payments.map((p, i) => (
                    <span key={i} className="sh-badge sh-badge--pay">
                      {p.method === 'cash' ? 'Efectivo' : p.method === 'card' ? 'Tarjeta' : p.method} {fmtMoney(p.amount)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function SalesVoidModal({ sale, onClose, onConfirm }) {
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal entry-modal" onClick={(e) => e.stopPropagation()} style={{ width: 'min(420px, 92vw)' }}>
        <div className="modal-head">
          <div>
            <div className="modal-eyebrow">Anular venta</div>
            <div className="modal-title">{fmtMoney(sale.total ?? 0)}</div>
            <div className="modal-sub">{fmtDateTime(sale.date, sale.time)} · {sale.employeeName ?? ''}</div>
          </div>
          <button className="iconbtn" onClick={onClose}><Icons.X size={16}/></button>
        </div>
        <div style={{ padding: '0 20px 16px', fontSize: 14, color: 'var(--ink-dim)', lineHeight: 1.5 }}>
          Esta acción revertirá el stock de los productos incluidos y marcará la venta como anulada. No se puede deshacer.
        </div>
        <div className="modal-foot">
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button
            className="btn-primary"
            style={{ background: 'var(--magenta)', borderColor: 'var(--magenta)' }}
            onClick={onConfirm}
          >
            <Icons.Trash size={14}/> Confirmar anulación
          </button>
        </div>
      </div>
    </div>
  );
}

function SalesHistory({ onAction }) {
  const today = new Date().toISOString().split('T')[0];

  const [range, setRange]           = React.useState('30d');
  const [customFrom, setCustomFrom] = React.useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [customTo, setCustomTo]     = React.useState(today);

  const [sales, setSales]     = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError]     = React.useState(null);
  const [page, setPage]       = React.useState(1);
  const [voidTarget, setVoidTarget] = React.useState(null);

  const PAGE_SIZE = 20;

  const activeParams = React.useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    if (range === 'custom') {
      if (customFrom && customTo && customFrom <= customTo)
        return { from: customFrom, to: customTo };
      return null;
    }
    const daysBack = { today: 0, '7d': 6, '30d': 29, '90d': 89, '365d': 364 }[range] ?? 29;
    const from = new Date();
    from.setDate(from.getDate() - daysBack);
    return { from: from.toISOString().split('T')[0], to: todayStr };
  }, [range, customFrom, customTo]);

  const paramsKey = activeParams ? JSON.stringify(activeParams) : null;

  React.useEffect(() => {
    if (!activeParams) return;
    setLoading(true);
    setError(null);
    setPage(1);
    salesApi.list(activeParams)
      .then((resp) => {
        const items = Array.isArray(resp) ? resp : (resp.items ?? []);
        setSales(items);
      })
      .catch((err) => setError(apiError(err)))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey]);

  const totalPages = Math.max(1, Math.ceil(sales.length / PAGE_SIZE));
  const pageSales  = sales.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleVoid = () => {
    if (!voidTarget) return;
    salesApi.void(voidTarget.id)
      .then(() => {
        setSales((prev) =>
          prev.map((s) => s.id === voidTarget.id ? { ...s, voided: true, voidedAt: new Date().toISOString() } : s)
        );
        setVoidTarget(null);
        onAction({ title: 'Venta anulada', sub: `Ticket ${voidTarget.id}` });
      })
      .catch((err) => {
        setVoidTarget(null);
        onAction({ title: 'Error al anular', sub: apiError(err) });
      });
  };

  return (
    <div>
      <SalesRangeBar
        range={range} setRange={setRange}
        customFrom={customFrom} setCustomFrom={setCustomFrom}
        customTo={customTo}    setCustomTo={setCustomTo}
      />

      {!loading && !error && sales.length > 0 && (
        <SalesSummaryStrip sales={sales}/>
      )}

      {loading && (
        <div className="sh-skeleton">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="sh-skeleton-row"/>
          ))}
        </div>
      )}

      {error && (
        <div className="sh-error">
          <span>{error}</span>
          <button
            className="btn-ghost btn-sm"
            onClick={() => {
              if (!activeParams) return;
              setLoading(true);
              setError(null);
              salesApi.list(activeParams)
                .then((resp) => setSales(Array.isArray(resp) ? resp : (resp.items ?? [])))
                .catch((err) => setError(apiError(err)))
                .finally(() => setLoading(false));
            }}
          >
            Reintentar
          </button>
        </div>
      )}

      {!loading && !error && sales.length === 0 && (
        <div className="sh-empty">
          <Icons.Receipt size={32}/>
          <p>Sin ventas en este período</p>
        </div>
      )}

      {!loading && !error && sales.length > 0 && (
        <>
          <div className="sh-table-wrap">
            <table className="sh-table">
              <thead>
                <tr>
                  <th className="sh-th">Fecha</th>
                  <th className="sh-th">Empleado</th>
                  <th className="sh-th sh-th--num">Art.</th>
                  <th className="sh-th sh-th--num">Total</th>
                  <th className="sh-th">Pago</th>
                  <th className="sh-th">Estado</th>
                  <th className="sh-th"/>
                </tr>
              </thead>
              <tbody>
                {pageSales.map((sale) => (
                  <SalesTableRow
                    key={sale.id}
                    sale={sale}
                    onVoidRequest={setVoidTarget}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="sh-pagination">
              <button
                className="btn-ghost btn-sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Anterior
              </button>
              <span className="sh-page-info">Pág. {page} / {totalPages}</span>
              <button
                className="btn-ghost btn-sm"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Siguiente →
              </button>
            </div>
          )}
        </>
      )}

      {voidTarget && (
        <SalesVoidModal
          sale={voidTarget}
          onClose={() => setVoidTarget(null)}
          onConfirm={handleVoid}
        />
      )}
    </div>
  );
}

function ReportsPanel({ onAction }) {
  const fmtToday = new Date().toISOString().slice(0, 10);
  const [apiData, setApiData] = React.useState({ salesByDay: [], catalog: [], employees: [], categoryRevenue: [], historicTimeEntries: [], topEmployees: [] });
  const [business, setBusiness] = React.useState({});

  React.useEffect(() => {
    Promise.allSettled([
      analyticsApi.salesByDay('30d'),
      catalogApi.get(),
      staffApi.list(),
      analyticsApi.categoryRevenue('30d'),
      timeclockApi.history({ range: 'month' }),
      analyticsApi.topEmployees('30d'),
      settingsApi.get(),
    ]).then(([salesRes, catalogRes, staffRes, catRes, timeRes, topRes, settingsRes]) => {
      setApiData({
        salesByDay: salesRes.status === 'fulfilled' ? (salesRes.value.items ?? []) : [],
        catalog: catalogRes.status === 'fulfilled' ? (catalogRes.value.items ?? []) : [],
        employees: staffRes.status === 'fulfilled' ? (staffRes.value ?? []) : [],
        categoryRevenue: catRes.status === 'fulfilled' ? (catRes.value.items ?? []) : [],
        historicTimeEntries: timeRes.status === 'fulfilled' ? (Array.isArray(timeRes.value) ? timeRes.value : (timeRes.value?.entries ?? [])) : [],
        topEmployees: topRes.status === 'fulfilled' ? (topRes.value.items ?? []) : [],
      });
      if (settingsRes.status === 'fulfilled') {
        setBusiness(settingsRes.value?.business ?? {});
      }
    });
  }, []);

  const data = apiData;

  const handlers = {
    // ---- Sales report
    sales: {
      excel: () => {
        reportsApi.excel('sales').then((blob) => {
          downloadBlob(blob, `ventas-${fmtToday}.xlsx`);
          onAction({ title: "Reporte Excel generado", sub: "Ventas últimos 30 días" });
        }).catch(() => {
          const cols = ["Fecha", "Ventas", "Costos", "Utilidad", "Tickets"];
          const rows = data.salesByDay.map((d) => [d.date, d.ventas, d.costos, d.utilidad, d.tickets]);
          exportUtils.downloadCSV(`ventas-${fmtToday}.csv`, cols, rows);
          onAction({ title: "Reporte Excel generado", sub: "Ventas últimos 30 días" });
        });
      },
      pdf: () => {
        // Always use client-side generation with SVG charts
        const total = data.salesByDay.reduce((s, d) => s + d.ventas, 0);
        const profit = data.salesByDay.reduce((s, d) => s + d.utilidad, 0);
        const tickets = data.salesByDay.reduce((s, d) => s + d.tickets, 0);
        const lineChart = exportUtils.lineChartSVG([
          { name: "Ventas",   color: "#de0fab", data: data.salesByDay.map((d) => ({ y: d.ventas, label: d.label })) },
          { name: "Costos",   color: "#0fb0de", data: data.salesByDay.map((d) => ({ y: d.costos })) },
          { name: "Utilidad", color: "#10b981", data: data.salesByDay.map((d) => ({ y: d.utilidad })) },
        ]);
        const ticketsBar = exportUtils.barChartSVG(
          data.salesByDay.slice(-7).map((d) => ({ label: d.label, value: d.tickets })),
          { color: "#7b2cbf" }
        );
        exportUtils.printReport({
          business,
          title: "Reporte de ventas",
          subtitle: `Detalle día por día · Últimos ${data.salesByDay.length} días`,
          charts: [lineChart, ticketsBar],
          columns: [
            { label: "Fecha" },
            { label: "Ventas", align: "right" },
            { label: "Costos", align: "right" },
            { label: "Utilidad", align: "right" },
            { label: "Tickets", align: "right" },
          ],
          rows: data.salesByDay.map((d) => [
            d.date, fmtMoney(d.ventas), fmtMoney(d.costos), fmtMoney(d.utilidad), d.tickets,
          ]),
          totals: [
            { label: "Ventas totales", value: fmtMoney(total) },
            { label: "Utilidad",       value: fmtMoney(profit) },
            { label: "Tickets",        value: tickets },
            { label: "Ticket promedio",value: fmtMoney(total / tickets) },
          ],
        });
        onAction({ title: "Reporte PDF abierto", sub: "Usa el botón Imprimir/PDF" });
      },
    },

    // ---- Inventory report
    inventory: {
      excel: () => {
        reportsApi.excel('inventory').then((blob) => {
          downloadBlob(blob, `inventario-${fmtToday}.xlsx`);
          onAction({ title: "Reporte Excel generado", sub: "Inventario completo" });
        }).catch(() => {
          const products = data.catalog.filter((p) => p.type === "P");
          const cols = ["SKU", "Producto", "Marca", "Precio", "Costo", "Stock", "Valor en venta", "Estado"];
          const rows = products.map((p) => [
            p.sku || p.id, p.name, p.brand || "", p.price, p.cost, p.stock,
            (p.price * (p.stock || 0)).toFixed(2),
            p.stock === 0 ? "Sin stock" : (p.stock < (p.stockMin || 8) ? "Bajo" : "OK"),
          ]);
          exportUtils.downloadCSV(`inventario-${fmtToday}.csv`, cols, rows);
          onAction({ title: "Reporte Excel generado", sub: "Inventario completo" });
        });
      },
      pdf: () => {
        // Always use client-side generation with SVG charts
        const products = data.catalog.filter((p) => p.type === "P");
        const totalValue = products.reduce((s, p) => s + p.price * (p.stock || 0), 0);
        const totalCost  = products.reduce((s, p) => s + (p.cost || 0) * (p.stock || 0), 0);
        const lowStock   = products.filter((p) => (p.stock || 0) < (p.stockMin || 8)).length;
        const okCount  = products.filter((p) => (p.stock || 0) >= (p.stockMin || 8)).length;
        const lowCount = products.filter((p) => (p.stock || 0) > 0 && (p.stock || 0) < (p.stockMin || 8)).length;
        const outCount = products.filter((p) => (p.stock || 0) === 0).length;

        const stockPie = exportUtils.pieChartSVG([
          { label: "OK",        value: okCount,  color: "#10b981" },
          { label: "Bajo",      value: lowCount, color: "#f59e0b" },
          { label: "Sin stock", value: outCount, color: "#ef4444" },
        ]);
        const valueBar = exportUtils.barChartSVG(
          [...products]
            .sort((a, b) => b.price * (b.stock || 0) - a.price * (a.stock || 0))
            .slice(0, 8)
            .map((p) => ({ label: p.name, value: +(p.price * (p.stock || 0)).toFixed(0) })),
          { color: "#de0fab" }
        );

        exportUtils.printReport({
          business,
          title: "Reporte de inventario",
          subtitle: `Stock retail al ${new Date().toLocaleDateString("es-MX", { dateStyle: "long" })}`,
          charts: [stockPie, valueBar],
          columns: [
            { label: "SKU" },
            { label: "Producto" },
            { label: "Marca" },
            { label: "Precio", align: "right" },
            { label: "Stock",  align: "right" },
            { label: "Valor",  align: "right" },
            { label: "Estado" },
          ],
          rows: products.map((p) => [
            p.sku || p.id, p.name, p.brand || "—",
            fmtMoney(p.price), p.stock,
            fmtMoney(p.price * (p.stock || 0)),
            p.stock === 0 ? "Sin stock" : (p.stock < (p.stockMin || 8) ? "Bajo" : "OK"),
          ]),
          totals: [
            { label: "Valor inventario", value: fmtMoney(totalValue) },
            { label: "Costo total",      value: fmtMoney(totalCost) },
            { label: "SKUs",             value: products.length },
            { label: "Stock bajo",       value: lowStock },
          ],
        });
        onAction({ title: "Reporte PDF abierto", sub: "Usa el botón Imprimir/PDF" });
      },
    },

    // ---- Payroll report
    payroll: {
      excel: () => {
        reportsApi.excel('payroll').then((blob) => {
          downloadBlob(blob, `nomina-quincenal-${fmtToday}.xlsx`);
          onAction({ title: "Reporte Excel generado", sub: "Nómina quincenal" });
        }).catch(() => {
          const cols = ["Empleada", "Puesto", "Sueldo mensual", "Sueldo quincenal", "Comisión quincenal", "Total quincena"];
          const rows = data.employees.map((e) => {
            const top = data.topEmployees.find((t) => t.name.toLowerCase().startsWith(e.name.split(" ")[0].toLowerCase().slice(0, 4)));
            const sales = (top?.ventas || 0) / 2;
            const com = +(sales * e.commissionRate / 100).toFixed(2);
            const biweekly = (e.salary || 0) / 2;
            return [e.name, e.position, e.salary, biweekly.toFixed(2), com, (biweekly + com).toFixed(2)];
          });
          exportUtils.downloadCSV(`nomina-quincenal-${fmtToday}.csv`, cols, rows);
          onAction({ title: "Reporte Excel generado", sub: "Nómina quincenal" });
        });
      },
      pdf: () => {
        // Always use client-side generation with SVG charts
        const rows = data.employees.map((e) => {
          const top = data.topEmployees.find((t) => t.name.toLowerCase().startsWith(e.name.split(" ")[0].toLowerCase().slice(0, 4)));
          const monthSales = top?.ventas || 0;
          const salesQ = monthSales / 2;
          const salaryQ = (e.salary || 0) / 2;
          const com = +(salesQ * e.commissionRate / 100).toFixed(2);
          const monthBonus = monthSales >= 2000 ? 200 : monthSales >= 1500 ? 100 : monthSales >= 1000 ? 50 : 0;
          const bonusQ = monthBonus / 2;
          return { ...e, salesQ, salaryQ, com, bonus: bonusQ, total: salaryQ + com + bonusQ };
        });
        const grandTotal = rows.reduce((s, r) => s + r.total, 0);

        const payrollBar = exportUtils.barChartSVG(
          rows.map((r) => ({ label: r.name.split(" ")[0], value: +r.total.toFixed(0) })),
          { color: "#de0fab" }
        );
        const breakdownPie = exportUtils.pieChartSVG([
          { label: "Sueldos base", value: rows.reduce((s, r) => s + r.salaryQ, 0), color: "#7b2cbf" },
          { label: "Comisiones",   value: rows.reduce((s, r) => s + r.com, 0),    color: "#10b981" },
          { label: "Bonos",        value: rows.reduce((s, r) => s + r.bonus, 0),  color: "#de0fab" },
        ]);

        exportUtils.printReport({
          business,
          title: "Reporte de nómina quincenal",
          subtitle: `Pago variable y fijo · quincena que termina ${new Date().toLocaleDateString("es-MX", { dateStyle: "long" })}`,
          charts: [payrollBar, breakdownPie],
          columns: [
            { label: "Empleada" },
            { label: "Puesto" },
            { label: "Ventas Q.",   align: "right" },
            { label: "Sueldo Q.",   align: "right" },
            { label: "Comisión", align: "right" },
            { label: "Bono Q.",     align: "right" },
            { label: "Total Q.",    align: "right" },
          ],
          rows: rows.map((r) => [
            r.name, r.position,
            fmtMoney(r.salesQ),
            fmtMoney(r.salaryQ),
            fmtMoney(r.com),
            fmtMoney(r.bonus),
            fmtMoney(r.total),
          ]),
          totals: [
            { label: "Total quincena", value: fmtMoney(grandTotal) },
            { label: "Total mensual",  value: fmtMoney(grandTotal * 2) },
            { label: "Empleadas",      value: rows.length },
          ],
        });
        onAction({ title: "Reporte PDF abierto", sub: "Nómina quincenal" });
      },
    },

    // ---- Attendance report
    attendance: {
      excel: () => {
        reportsApi.excel('attendance').then((blob) => {
          downloadBlob(blob, `asistencia-${fmtToday}.xlsx`);
          onAction({ title: "Reporte Excel generado", sub: "Asistencia 60 días" });
        }).catch(() => {
          const cols = ["Fecha", "Empleada", "Entrada", "Salida", "Horas"];
          const rows = data.historicTimeEntries.map((t) => {
            const u = data.employees.find((e) => e.id === t.userId);
            const [ih, im] = t.in.split(":").map(Number);
            const [oh, om] = t.out.split(":").map(Number);
            const mins = oh * 60 + om - (ih * 60 + im);
            return [t.date, u?.name || t.userId, t.in, t.out, (mins / 60).toFixed(2)];
          });
          exportUtils.downloadCSV(`asistencia-${fmtToday}.csv`, cols, rows);
          onAction({ title: "Reporte Excel generado", sub: "Asistencia 60 días" });
        });
      },
      pdf: () => {
        // Always use client-side generation with SVG charts
        // Aggregate hours per day for the last 30 days
        const byDate = {};
        data.historicTimeEntries.forEach((t) => {
          const [ih, im] = t.in.split(":").map(Number);
          const [oh, om] = t.out.split(":").map(Number);
          const h = (oh * 60 + om - (ih * 60 + im)) / 60;
          byDate[t.date] = (byDate[t.date] || 0) + h;
        });
        const last30 = Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).slice(-30);
        const lineChart = exportUtils.lineChartSVG([
          {
            name: "Horas trabajadas",
            color: "#de0fab",
            data: last30.map(([date, h]) => ({ y: +h.toFixed(1), label: date.slice(5) })),
          },
        ]);

        // Hours per employee
        const perEmp = {};
        data.historicTimeEntries.forEach((t) => {
          const [ih, im] = t.in.split(":").map(Number);
          const [oh, om] = t.out.split(":").map(Number);
          const h = (oh * 60 + om - (ih * 60 + im)) / 60;
          perEmp[t.userId] = (perEmp[t.userId] || 0) + h;
        });
        const empBar = exportUtils.barChartSVG(
          Object.entries(perEmp).map(([userId, h]) => ({
            label: data.employees.find((e) => e.id === userId)?.name.split(" ")[0] || userId,
            value: +h.toFixed(0),
          })),
          { color: "#0fb0de" }
        );

        const last7 = data.historicTimeEntries.slice(-50);
        exportUtils.printReport({
          business,
          title: "Reporte de asistencia",
          subtitle: "Últimos 60 días — horas trabajadas y marcas recientes",
          charts: [lineChart, empBar],
          columns: [
            { label: "Fecha" },
            { label: "Empleada" },
            { label: "Entrada" },
            { label: "Salida" },
            { label: "Horas",   align: "right" },
          ],
          rows: last7.map((t) => {
            const u = data.employees.find((e) => e.id === t.userId);
            const [ih, im] = t.in.split(":").map(Number);
            const [oh, om] = t.out.split(":").map(Number);
            const mins = oh * 60 + om - (ih * 60 + im);
            return [t.date, u?.name || t.userId, t.in, t.out, (mins / 60).toFixed(2)];
          }),
        });
        onAction({ title: "Reporte PDF abierto", sub: "Usa el botón Imprimir/PDF" });
      },
    },

    // ---- Top categories
    topProducts: {
      excel: () => {
        reportsApi.excel('top-categories').then((blob) => {
          downloadBlob(blob, `top-categorias-${fmtToday}.xlsx`);
          onAction({ title: "Reporte Excel generado", sub: "Top categorías" });
        }).catch(() => {
          const cols = ["Categoría", "Ingresos del mes"];
          const rows = data.categoryRevenue.map((c) => [c.name, c.value]);
          exportUtils.downloadCSV(`top-categorias-${fmtToday}.csv`, cols, rows);
          onAction({ title: "Reporte Excel generado", sub: "Top categorías" });
        });
      },
      pdf: () => {
        // Always use client-side generation with SVG charts
        const total = data.categoryRevenue.reduce((s, c) => s + c.value, 0);
        const pie = exportUtils.pieChartSVG(
          data.categoryRevenue.map((c) => ({ label: c.name, value: c.value, color: c.color }))
        );
        const bar = exportUtils.barChartSVG(
          data.categoryRevenue.map((c) => ({ label: c.name, value: c.value, color: c.color }))
        );
        exportUtils.printReport({
          business,
          title: "Top categorías del mes",
          subtitle: "Ingresos por línea de servicio",
          charts: [pie, bar],
          columns: [
            { label: "Categoría" },
            { label: "Ingresos",   align: "right" },
            { label: "Participación", align: "right" },
          ],
          rows: data.categoryRevenue.map((c) => [
            c.name,
            fmtMoney(c.value),
            `${((c.value / total) * 100).toFixed(1)}%`,
          ]),
          totals: [{ label: "Ingresos totales", value: fmtMoney(total) }],
        });
        onAction({ title: "Reporte PDF abierto", sub: "Usa el botón Imprimir/PDF" });
      },
    },

    // ---- General executive report
    executive: {
      excel: () => {
        reportsApi.excel('executive').then((blob) => {
          downloadBlob(blob, `resumen-ejecutivo-${fmtToday}.xlsx`);
          onAction({ title: "Resumen Excel generado", sub: "Reporte ejecutivo" });
        }).catch(() => {
          // Multi-sheet exports via CSV are limited; produce a wide summary CSV.
          const rows = [];
          rows.push(["RESUMEN EJECUTIVO", new Date().toLocaleString("es-MX")]);
          rows.push([]);
          rows.push(["VENTAS"]);
          rows.push(["Total 30d", data.salesByDay.reduce((s, d) => s + d.ventas, 0)]);
          rows.push(["Utilidad 30d", data.salesByDay.reduce((s, d) => s + d.utilidad, 0)]);
          rows.push(["Tickets 30d", data.salesByDay.reduce((s, d) => s + d.tickets, 0)]);
          rows.push([]);
          rows.push(["INVENTARIO"]);
          const products = data.catalog.filter((p) => p.type === "P");
          rows.push(["SKUs", products.length]);
          rows.push(["Valor inventario", products.reduce((s, p) => s + p.price * (p.stock || 0), 0)]);
          rows.push(["Stock bajo", products.filter((p) => (p.stock || 0) < (p.stockMin || 8)).length]);
          rows.push([]);
          rows.push(["EQUIPO"]);
          rows.push(["Empleadas activas", data.employees.filter((e) => e.status === "activa").length]);
          rows.push(["Nómina base", data.employees.reduce((s, e) => s + e.salary, 0)]);
          exportUtils.downloadCSV(`resumen-ejecutivo-${fmtToday}.csv`, ["Concepto", "Valor"], rows);
          onAction({ title: "Resumen Excel generado", sub: "Reporte ejecutivo" });
        });
      },
      pdf: () => {
        // Always use client-side generation with SVG charts
        const salesByDay = data.salesByDay || [];
        const catalog = data.catalog || [];
        const employees = data.employees || [];
        const categoryRevenue = data.categoryRevenue || [];
        const historicTimeEntries = data.historicTimeEntries || [];
        const topEmployees = data.topEmployees || [];

        // SECTION 1 — KPIs + sales trend
        const total = salesByDay.reduce((s, d) => s + (d.ventas || 0), 0);
        const profit = salesByDay.reduce((s, d) => s + (d.utilidad || 0), 0);
        const tickets = salesByDay.reduce((s, d) => s + (d.tickets || 0), 0);
        const margin = total > 0 ? ((profit / total) * 100).toFixed(1) : "0.0";
        const salesLine = exportUtils.lineChartSVG([
          { name: "Ventas",   color: "#de0fab", data: salesByDay.map((d) => ({ y: d.ventas || 0, label: d.label || d.date })) },
          { name: "Utilidad", color: "#10b981", data: salesByDay.map((d) => ({ y: d.utilidad || 0 })) },
        ], { height: 200 });

        // SECTION 2 — Inventory snapshot
        const products = catalog.filter((p) => p.type === "P");
        const totalValue = products.reduce((s, p) => s + (p.price || 0) * (p.stock || 0), 0);
        const lowStock   = products.filter((p) => (p.stock || 0) < (p.stockMin || 8));
        const stockPie = exportUtils.pieChartSVG([
          { label: "OK",        value: products.filter((p) => (p.stock || 0) >= (p.stockMin || 8)).length,  color: "#10b981" },
          { label: "Bajo",      value: products.filter((p) => (p.stock || 0) > 0 && (p.stock || 0) < (p.stockMin || 8)).length, color: "#f59e0b" },
          { label: "Sin stock", value: products.filter((p) => (p.stock || 0) === 0).length, color: "#ef4444" },
        ], { height: 180 });

        // SECTION 3 — Category mix
        const catTotal = categoryRevenue.reduce((s, c) => s + (c.value || 0), 0);
        const catPie = exportUtils.pieChartSVG(
          categoryRevenue.map((c) => ({ label: c.name, value: c.value || 0, color: c.color })),
          { height: 200 }
        );

        // SECTION 4 — Team / payroll
        const payroll = employees.map((e) => {
          const first4 = e.name.split(" ")[0].toLowerCase().slice(0, 4);
          const top = topEmployees.find((t) => t.name.toLowerCase().startsWith(first4));
          const sales = top?.ventas || 0;
          const com = +(sales * (e.commissionRate || 0) / 100).toFixed(2);
          const bonus = sales >= 2000 ? 200 : sales >= 1500 ? 100 : sales >= 1000 ? 50 : 0;
          return { ...e, sales, com, bonus, total: (e.salary || 0) + com + bonus };
        });
        const payrollTotal = payroll.reduce((s, r) => s + r.total, 0);
        const payrollBar = exportUtils.barChartSVG(
          payroll.map((r) => ({ label: r.name.split(" ")[0], value: +r.total.toFixed(0) })),
          { color: "#de0fab", height: 200 }
        );

        // SECTION 5 — Attendance trend
        const byDate = {};
        historicTimeEntries.forEach((t) => {
          const [ih, im] = (t.in || "00:00").split(":").map(Number);
          const [oh, om] = (t.out || "00:00").split(":").map(Number);
          const h = (oh * 60 + om - (ih * 60 + im)) / 60;
          byDate[t.date] = (byDate[t.date] || 0) + h;
        });
        const last14 = Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).slice(-14);
        const attLine = exportUtils.lineChartSVG([
          { name: "Horas/día", color: "#0fb0de", data: last14.map(([date, h]) => ({ y: +h.toFixed(1), label: date.slice(5) })) },
        ], { height: 180 });

        exportUtils.printReport({
          business,
          docTitle: "Reporte Ejecutivo",
          docSubtitle: `Resumen completo del salón · ${new Date().toLocaleDateString("es-MX", { dateStyle: "long" })}`,
          sections: [
            {
              title: "1. Resumen financiero",
              subtitle: "Indicadores clave de los últimos 30 días",
              chart: salesLine,
              columns: [
                { label: "Indicador" },
                { label: "Valor", align: "right" },
              ],
              rows: [
                ["Ventas totales",  fmtMoney(total)],
                ["Utilidad neta",   fmtMoney(profit)],
                ["Margen",          `${margin}%`],
                ["Tickets",         tickets],
                ["Ticket promedio", fmtMoney(tickets > 0 ? total / tickets : 0)],
              ],
              totals: [
                { label: "Ventas",       value: fmtMoney(total) },
                { label: "Utilidad",     value: fmtMoney(profit) },
                { label: "Margen",       value: `${margin}%` },
                { label: "Tickets",      value: tickets },
              ],
            },
            {
              title: "2. Inventario",
              subtitle: `${products.length} SKUs · ${lowStock.length} con stock crítico`,
              chart: stockPie,
              columns: [
                { label: "Producto" },
                { label: "Stock",  align: "right" },
                { label: "Estado" },
              ],
              rows: lowStock.length > 0
                ? lowStock.map((p) => [p.name, p.stock || 0, (p.stock || 0) === 0 ? "Sin stock" : "Bajo"])
                : [["✓ Sin alertas de stock", "—", "OK"]],
              totals: [
                { label: "Valor inventario", value: fmtMoney(totalValue) },
                { label: "SKUs",             value: products.length },
                { label: "Stock bajo",       value: lowStock.length },
              ],
            },
            {
              title: "3. Mix de ingresos",
              subtitle: "Participación por categoría",
              chart: catPie,
              columns: [
                { label: "Categoría" },
                { label: "Ingresos", align: "right" },
                { label: "Participación", align: "right" },
              ],
              rows: categoryRevenue.map((c) => [
                c.name,
                fmtMoney(c.value || 0),
                `${catTotal > 0 ? (((c.value || 0) / catTotal) * 100).toFixed(1) : "0.0"}%`,
              ]),
            },
            {
              title: "4. Nómina del mes",
              subtitle: `${payroll.length} empleadas · pago total ${fmtMoney(payrollTotal)}`,
              chart: payrollBar,
              columns: [
                { label: "Empleada" },
                { label: "Puesto" },
                { label: "Ventas",   align: "right" },
                { label: "Sueldo",   align: "right" },
                { label: "Comisión", align: "right" },
                { label: "Bono",     align: "right" },
                { label: "Total",    align: "right" },
              ],
              rows: payroll.map((r) => [
                r.name, r.position,
                fmtMoney(r.sales || 0),
                fmtMoney(r.salary || 0),
                fmtMoney(r.com || 0),
                fmtMoney(r.bonus || 0),
                fmtMoney(r.total || 0),
              ]),
              totals: [{ label: "Total a pagar", value: fmtMoney(payrollTotal) }],
            },
            {
              title: "5. Asistencia",
              subtitle: "Horas trabajadas por el equipo · últimos 14 días",
              chart: attLine,
              columns: [
                { label: "Empleada" },
                { label: "Estado" },
                { label: "Horario" },
              ],
              rows: employees.map((e) => [e.name, e.status, e.schedule || "—"]),
            },
          ],
        });
        onAction({ title: "Reporte PDF abierto", sub: "Resumen ejecutivo completo" });
      },
    },
  };

  const cards = [
    { id: "executive",   title: "Reporte ejecutivo", desc: "Resumen completo: ventas, inventario, equipo y asistencia", icon: "Sparkle", tone: "magenta", featured: true },
    { id: "sales",       title: "Ventas del periodo", desc: "Detalle diario con gráficas de tendencia", icon: "TrendUp", tone: "magenta" },
    { id: "inventory",   title: "Inventario", desc: "Stock, valor y estado · gráfica de distribución", icon: "Box", tone: "purple" },
    { id: "payroll",     title: "Nómina del mes", desc: "Sueldo base, comisiones y bonos por empleada", icon: "Cash", tone: "green" },
    { id: "attendance",  title: "Asistencia", desc: "Marcas e historial de horas trabajadas", icon: "Clock", tone: "teal" },
    { id: "topProducts", title: "Top categorías", desc: "Ingresos por categoría · pie + bar chart", icon: "Chart", tone: "orange" },
  ];

  const toneMap = {
    magenta: { color: "#de0fab", soft: "var(--magenta-soft)" },
    purple:  { color: "#7b2cbf", soft: "rgba(123,44,191,.12)" },
    teal:    { color: "#0fb0de", soft: "rgba(15,176,222,.12)" },
    green:   { color: "#10b981", soft: "rgba(16,185,129,.12)" },
    orange:  { color: "#f59e0b", soft: "rgba(245,158,11,.12)" },
  };

  return (
    <div className="reports-grid">
      {cards.map((c) => {
        const t = toneMap[c.tone];
        const IconComp = Icons[c.icon];
        const h = handlers[c.id];
        return (
          <div className="report-card" key={c.id}>
            <div className="report-head">
              <div className="alert-ico" style={{ background: t.soft, color: t.color }}>
                <IconComp size={20}/>
              </div>
              <div style={{ flex: 1 }}>
                <div className="alert-title">{c.title}</div>
                <div className="alert-sub">{c.desc}</div>
              </div>
            </div>

            <div className="report-actions">
              <button className="report-btn excel" onClick={h.excel}>
                <Icons.Box size={14}/> Excel (.csv)
              </button>
              <button className="report-btn pdf" onClick={h.pdf}>
                <Icons.Receipt size={14}/> PDF
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export { exportUtils, Reports };
