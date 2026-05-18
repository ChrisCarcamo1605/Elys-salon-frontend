// Inventory, Progress, Team, Settings screens

// ============================================================
//   INVENTORY
// ============================================================

function Inventory({ user, data, onLock, onBack }) {
  const [products, setProducts] = React.useState(
    data.catalog.filter((p) => p.type === "P")
  );
  const [q, setQ] = React.useState("");
  const [filter, setFilter] = React.useState("all"); // all | low | out
  const [openEntry, setOpenEntry] = React.useState(null); // product or "new"
  const [openAdjust, setOpenAdjust] = React.useState(null);
  const [toast, setToast] = React.useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  };

  const filtered = products.filter((p) => {
    if (q && !p.name.toLowerCase().includes(q.toLowerCase()) && !p.sku?.toLowerCase().includes(q.toLowerCase())) return false;
    if (filter === "low" && (p.stock || 0) >= 8) return false;
    if (filter === "out" && (p.stock || 0) !== 0) return false;
    return true;
  });

  const totalValue = products.reduce((s, p) => s + p.price * (p.stock || 0), 0);
  const totalCost = products.reduce((s, p) => s + (p.cost || 0) * (p.stock || 0), 0);
  const lowStock = products.filter((p) => (p.stock || 0) > 0 && (p.stock || 0) < 8).length;
  const outOfStock = products.filter((p) => (p.stock || 0) === 0).length;

  const addEntry = (productId, payload) => {
    setProducts((ps) =>
      ps.map((p) =>
        p.id === productId
          ? { ...p, stock: (p.stock || 0) + payload.qty, cost: payload.cost ?? p.cost }
          : p
      )
    );
    showToast(`+${payload.qty} unidades agregadas`);
  };

  const adjustStock = (productId, payload) => {
    setProducts((ps) =>
      ps.map((p) =>
        p.id === productId ? { ...p, stock: payload.newStock } : p
      )
    );
    showToast(`Stock ajustado: ${payload.newStock} unidades`);
  };

  return (
    <div className="screen inv-screen">
      <TopBar user={user} title="Inventario" onLock={onLock} onBack={onBack} onLogout={onLock}/>
      <div className="inv-body">
        <div className="inv-head">
          <div>
            <div className="ana-eyebrow">Stock retail · {products.length} SKUs</div>
            <h2 className="ana-title">Inventario de productos</h2>
          </div>
          <div className="inv-stats">
            <div className="inv-stat">
              <div className="inv-stat-label">Valor en venta</div>
              <div className="inv-stat-val">${totalValue.toLocaleString()}</div>
            </div>
            <div className="inv-stat">
              <div className="inv-stat-label">Costo del inventario</div>
              <div className="inv-stat-val">${totalCost.toLocaleString()}</div>
            </div>
            <div className="inv-stat">
              <div className="inv-stat-label">Stock bajo</div>
              <div className="inv-stat-val" style={{ color: lowStock ? "var(--magenta)" : undefined }}>
                {lowStock}
              </div>
            </div>
            <div className="inv-stat">
              <div className="inv-stat-label">Sin stock</div>
              <div className="inv-stat-val" style={{ color: outOfStock ? "#b91c1c" : undefined }}>
                {outOfStock}
              </div>
            </div>
          </div>
        </div>

        <div className="inv-toolbar">
          <div className="search">
            <Icons.Search size={16}/>
            <input placeholder="Buscar por nombre o SKU…" value={q} onChange={(e)=>setQ(e.target.value)}/>
          </div>
          <div className="inv-filters">
            {[
              { id: "all", label: "Todos" },
              { id: "low", label: "Stock bajo" },
              { id: "out", label: "Sin stock" },
            ].map((f) => (
              <button
                key={f.id}
                className={`range-pill ${filter === f.id ? "active" : ""}`}
                onClick={() => setFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
          <button className="btn-primary" onClick={() => setOpenEntry("new")}>
            <Icons.Plus size={14}/> Nueva entrada
          </button>
        </div>

        <div className="inv-table">
          <div className="inv-row inv-thead">
            <div>Producto</div>
            <div>Precio</div>
            <div>Costo</div>
            <div>Stock</div>
            <div>Estado</div>
            <div>Acciones</div>
          </div>
          {filtered.map((p) => {
            const low = (p.stock || 0) > 0 && (p.stock || 0) < 8;
            const out = (p.stock || 0) === 0;
            return (
              <div className="inv-row" key={p.id}>
                <div className="inv-name">
                  <div
                    className="inv-thumb"
                    style={{ backgroundImage: `url(${p.image})` }}
                  />
                  <div>
                    <div style={{ fontWeight: 600 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: "var(--ink-dim)" }}>
                      {p.brand} · SKU {p.sku || p.id.toUpperCase()}
                    </div>
                  </div>
                </div>
                <div>${p.price.toFixed(2)}</div>
                <div style={{ color: "var(--ink-dim)" }}>${(p.cost || 0).toFixed(2)}</div>
                <div style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>{p.stock}</div>
                <div>
                  <span className={`stock-pill ${out ? "out" : low ? "low" : "ok"}`}>
                    {out ? "Sin stock" : low ? "Bajo" : "OK"}
                  </span>
                </div>
                <div className="inv-acts">
                  <button className="btn-ghost btn-sm" onClick={() => setOpenEntry(p)}>
                    <Icons.Plus size={11}/> Entrada
                  </button>
                  <button className="btn-ghost btn-sm" onClick={() => setOpenAdjust(p)}>
                    Ajustar
                  </button>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ padding: 60, textAlign: "center", color: "var(--ink-dim)" }}>
              Sin productos que coincidan con los filtros.
            </div>
          )}
        </div>
      </div>

      {openEntry && (
        <EntryModal
          product={openEntry === "new" ? null : openEntry}
          products={products}
          onClose={() => setOpenEntry(null)}
          onSave={(payload) => {
            addEntry(payload.productId, payload);
            setOpenEntry(null);
          }}
        />
      )}

      {openAdjust && (
        <AdjustModal
          product={openAdjust}
          onClose={() => setOpenAdjust(null)}
          onSave={(payload) => {
            adjustStock(openAdjust.id, payload);
            setOpenAdjust(null);
          }}
        />
      )}

      {toast && (
        <div className="toast">
          <div className="toast-ico"><Icons.Check size={16}/></div>
          <div>
            <div className="toast-title">Inventario actualizado</div>
            <div className="toast-sub">{toast}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function EntryModal({ product, products, onClose, onSave }) {
  const [productId, setProductId] = React.useState(product?.id || (products[0]?.id ?? ""));
  const sel = products.find((p) => p.id === productId);
  const [qty, setQty] = React.useState(10);
  const [unitCost, setUnitCost] = React.useState(sel?.cost || 0);
  const [supplier, setSupplier] = React.useState("");
  const [invoice, setInvoice] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = React.useState(today);

  React.useEffect(() => {
    if (sel) setUnitCost(sel.cost || 0);
  }, [productId]);

  const total = (+qty || 0) * (+unitCost || 0);
  const valid = sel && +qty > 0 && +unitCost >= 0;

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal entry-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="modal-eyebrow">Entrada de inventario</div>
            <div className="modal-title">Registrar compra</div>
            <div className="modal-sub">Suma unidades nuevas al stock</div>
          </div>
          <button className="iconbtn" onClick={onClose}>
            <Icons.X size={16}/>
          </button>
        </div>

        <div className="form-grid">
          <label className="form-row form-row-full">
            <span className="form-label">Producto</span>
            <select
              className="form-input"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · stock actual: {p.stock}
                </option>
              ))}
            </select>
          </label>

          {sel && (
            <div className="entry-preview form-row-full">
              <div className="entry-preview-img" style={{ backgroundImage: `url(${sel.image})` }}/>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{sel.name}</div>
                <div style={{ fontSize: 12, color: "var(--ink-dim)" }}>
                  {sel.brand} · SKU {sel.sku}
                </div>
                <div style={{ fontSize: 12, color: "var(--ink-dim)", marginTop: 4 }}>
                  Stock actual: <b style={{ color: "var(--ink)" }}>{sel.stock}</b> · Precio venta ${sel.price}
                </div>
              </div>
            </div>
          )}

          <label className="form-row">
            <span className="form-label">Cantidad</span>
            <div className="form-stepper">
              <button onClick={() => setQty(Math.max(1, +qty - 1))}>
                <Icons.Minus size={12}/>
              </button>
              <input
                type="number"
                min="1"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
              <button onClick={() => setQty(+qty + 1)}>
                <Icons.Plus size={12}/>
              </button>
            </div>
          </label>

          <label className="form-row">
            <span className="form-label">Costo unitario</span>
            <div className="form-input-prefix">
              <span>$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
              />
            </div>
          </label>

          <label className="form-row">
            <span className="form-label">Proveedor</span>
            <input
              className="form-input"
              placeholder="Ej. Distribuidora Beauty MX"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
            />
          </label>

          <label className="form-row">
            <span className="form-label">Factura / referencia</span>
            <input
              className="form-input"
              placeholder="A-12345"
              value={invoice}
              onChange={(e) => setInvoice(e.target.value)}
            />
          </label>

          <label className="form-row">
            <span className="form-label">Fecha</span>
            <input
              type="date"
              className="form-input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>

          <label className="form-row form-row-full">
            <span className="form-label">Notas (opcional)</span>
            <textarea
              className="form-input"
              rows="2"
              placeholder="Lote, caducidad, condiciones de almacenamiento…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
        </div>

        <div className="entry-summary">
          <div>
            <div className="entry-summary-label">Unidades a agregar</div>
            <div className="entry-summary-val">+{qty}</div>
          </div>
          <div>
            <div className="entry-summary-label">Inversión total</div>
            <div className="entry-summary-val">${total.toFixed(2)}</div>
          </div>
          <div>
            <div className="entry-summary-label">Stock final</div>
            <div className="entry-summary-val" style={{ color: "var(--magenta)" }}>
              {(sel?.stock || 0) + (+qty || 0)}
            </div>
          </div>
        </div>

        <div className="modal-foot">
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button
            className="btn-primary"
            disabled={!valid}
            onClick={() =>
              onSave({
                productId: sel.id,
                qty: +qty,
                cost: +unitCost,
                supplier, invoice, date, notes,
              })
            }
          >
            <Icons.Check size={14}/> Registrar entrada
          </button>
        </div>
      </div>
    </div>
  );
}

function AdjustModal({ product, onClose, onSave }) {
  const [mode, setMode] = React.useState("set"); // set | delta
  const [newStock, setNewStock] = React.useState(product.stock);
  const [delta, setDelta] = React.useState(0);
  const [reason, setReason] = React.useState("conteo");
  const [notes, setNotes] = React.useState("");

  const reasons = [
    { id: "conteo", label: "Conteo físico", desc: "Ajuste tras inventario manual" },
    { id: "merma", label: "Merma / daño", desc: "Producto roto o caducado" },
    { id: "robo", label: "Pérdida / robo", desc: "Faltante no justificado" },
    { id: "uso", label: "Uso interno", desc: "Producto usado en servicio" },
    { id: "devolucion", label: "Devolución", desc: "Cliente devolvió producto" },
  ];

  const finalStock =
    mode === "set"
      ? +newStock || 0
      : Math.max(0, (product.stock || 0) + (+delta || 0));
  const diff = finalStock - (product.stock || 0);

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal entry-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="modal-eyebrow">Ajuste de inventario</div>
            <div className="modal-title">{product.name}</div>
            <div className="modal-sub">Stock actual: {product.stock} unidades</div>
          </div>
          <button className="iconbtn" onClick={onClose}>
            <Icons.X size={16}/>
          </button>
        </div>

        <div className="disc-toggle">
          <button
            className={`disc-tog ${mode === "set" ? "active" : ""}`}
            onClick={() => setMode("set")}
          >
            Fijar cantidad
          </button>
          <button
            className={`disc-tog ${mode === "delta" ? "active" : ""}`}
            onClick={() => setMode("delta")}
          >
            +/− unidades
          </button>
        </div>

        {mode === "set" ? (
          <label className="form-row" style={{ marginBottom: 18 }}>
            <span className="form-label">Stock real contado</span>
            <div className="form-stepper big">
              <button onClick={() => setNewStock(Math.max(0, +newStock - 1))}>
                <Icons.Minus size={14}/>
              </button>
              <input
                type="number"
                min="0"
                value={newStock}
                onChange={(e) => setNewStock(e.target.value)}
              />
              <button onClick={() => setNewStock(+newStock + 1)}>
                <Icons.Plus size={14}/>
              </button>
            </div>
          </label>
        ) : (
          <label className="form-row" style={{ marginBottom: 18 }}>
            <span className="form-label">Diferencia</span>
            <div className="form-stepper big">
              <button onClick={() => setDelta(+delta - 1)}>
                <Icons.Minus size={14}/>
              </button>
              <input
                type="number"
                value={delta}
                onChange={(e) => setDelta(e.target.value)}
              />
              <button onClick={() => setDelta(+delta + 1)}>
                <Icons.Plus size={14}/>
              </button>
            </div>
          </label>
        )}

        <div className="adj-reasons">
          <div className="form-label" style={{ marginBottom: 8 }}>
            Motivo del ajuste
          </div>
          <div className="adj-reasons-grid">
            {reasons.map((r) => (
              <button
                key={r.id}
                className={`reason-card ${reason === r.id ? "active" : ""}`}
                onClick={() => setReason(r.id)}
              >
                <div className="reason-label">{r.label}</div>
                <div className="reason-desc">{r.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <label className="form-row form-row-full" style={{ marginTop: 12 }}>
          <span className="form-label">Notas</span>
          <textarea
            className="form-input"
            rows="2"
            placeholder="Detalle adicional opcional…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>

        <div className="entry-summary">
          <div>
            <div className="entry-summary-label">Stock antes</div>
            <div className="entry-summary-val">{product.stock}</div>
          </div>
          <div>
            <div className="entry-summary-label">Diferencia</div>
            <div
              className="entry-summary-val"
              style={{ color: diff > 0 ? "#10b981" : diff < 0 ? "var(--magenta)" : undefined }}
            >
              {diff > 0 ? "+" : ""}{diff}
            </div>
          </div>
          <div>
            <div className="entry-summary-label">Stock final</div>
            <div className="entry-summary-val" style={{ color: "var(--magenta)" }}>
              {finalStock}
            </div>
          </div>
        </div>

        <div className="modal-foot">
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button
            className="btn-primary"
            onClick={() => onSave({ newStock: finalStock, reason, notes })}
          >
            <Icons.Check size={14}/> Aplicar ajuste
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
//   PROGRESS — multi-goal achievements
// ============================================================

function Progress({ user, data, onLock, onBack }) {
  const stats = user.monthStats || { totalSales: 0, retailSales: 0, servicesDone: 0, newClients: 0 };

  const goalsWithProgress = data.goals.map((g) => {
    const value = stats[g.metric] || 0;
    const pct = Math.min(100, (value / g.target) * 100);
    const achieved = value >= g.target;
    const remaining = Math.max(0, g.target - value);
    const earned =
      achieved && g.rewardType === "fixed"
        ? g.rewardValue
        : achieved && g.rewardType === "percent"
        ? +(stats[g.metric] * g.rewardValue / 100).toFixed(2)
        : 0;
    return { ...g, value, pct, achieved, remaining, earned };
  });

  const totalEarned = goalsWithProgress.reduce((s, g) => s + g.earned, 0);
  const achievedCount = goalsWithProgress.filter((g) => g.achieved).length;

  const recent = [
    { d: "Hoy 14:32", item: "Manicure spa", amt: 20, kind: "S" },
    { d: "Hoy 11:10", item: "Corte mujer + tinte raíz", amt: 53, kind: "S" },
    { d: "Hoy 09:45", item: "Aceite de argán", amt: 15, kind: "P" },
    { d: "Ayer 17:45", item: "Pedicure básico", amt: 15, kind: "S" },
    { d: "Ayer 15:20", item: "Uñas acrílicas", amt: 35, kind: "S" },
    { d: "Ayer 13:10", item: "Shampoo profesional", amt: 18, kind: "P" },
    { d: "16 may", item: "Botox capilar", amt: 65, kind: "S" },
  ];

  const toneMap = {
    magenta: { color: "#de0fab", soft: "var(--magenta-soft)" },
    purple: { color: "#7b2cbf", soft: "rgba(123,44,191,.10)" },
    teal: { color: "#0fb0de", soft: "rgba(15,176,222,.10)" },
    green: { color: "#10b981", soft: "rgba(16,185,129,.10)" },
  };

  return (
    <div className="screen prog-screen">
      <TopBar user={user} title="Mi progreso" onLock={onLock} onBack={onBack} onLogout={onLock}/>
      <div className="prog-body">
        {/* Earnings summary */}
        <div className="earn-hero">
          <div className="earn-left">
            <div className="ana-eyebrow">Pago variable · Mayo 2026</div>
            <div className="earn-hero-title">
              Llevas <span style={{ color: "#10b981" }}>${totalEarned.toFixed(2)}</span> en bonos asegurados
            </div>
            <div className="earn-hero-sub">
              Has completado <b>{achievedCount}</b> de <b>{data.goals.length}</b> metas. Sigue así para desbloquear el resto.
            </div>
          </div>
          <div className="earn-stats">
            <div className="earn-stat">
              <div className="earn-stat-val">${stats.totalSales.toFixed(0)}</div>
              <div className="earn-stat-label">Ventas totales</div>
            </div>
            <div className="earn-stat">
              <div className="earn-stat-val">${stats.retailSales.toFixed(0)}</div>
              <div className="earn-stat-label">Productos</div>
            </div>
            <div className="earn-stat">
              <div className="earn-stat-val">{stats.servicesDone}</div>
              <div className="earn-stat-label">Servicios</div>
            </div>
            <div className="earn-stat">
              <div className="earn-stat-val">${stats.tipsCollected}</div>
              <div className="earn-stat-label">Propinas</div>
            </div>
          </div>
        </div>

        {/* Goals grid */}
        <div className="goals-grid">
          {goalsWithProgress.map((g) => {
            const tone = toneMap[g.tone] || toneMap.magenta;
            const IconComp = Icons[g.icon] || Icons.Trophy;
            return (
              <div className={`goal-card ${g.achieved ? "achieved" : ""}`} key={g.id}>
                <div className="goal-head">
                  <div className="goal-icon" style={{ background: tone.soft, color: tone.color }}>
                    <IconComp size={20}/>
                  </div>
                  <div className="goal-head-text">
                    <div className="goal-label">{g.label}</div>
                    <div className="goal-desc">{g.desc}</div>
                  </div>
                  {g.achieved && (
                    <div className="goal-badge">
                      <Icons.Check size={11}/> Logrado
                    </div>
                  )}
                </div>

                <div className="goal-progress">
                  <div className="goal-progress-track">
                    <div
                      className="goal-progress-fill"
                      style={{ width: `${g.pct}%`, background: tone.color }}
                    />
                  </div>
                  <div className="goal-progress-meta">
                    <span>
                      <b style={{ color: "var(--ink)" }}>
                        {g.unit}{g.value}
                      </b>
                      {" "}/ {g.unit}{g.target}
                    </span>
                    <span style={{ color: tone.color, fontWeight: 700 }}>
                      {g.pct.toFixed(0)}%
                    </span>
                  </div>
                </div>

                <div className="goal-foot">
                  <div className="goal-reward">
                    <div className="goal-reward-label">Recompensa</div>
                    <div className="goal-reward-val" style={{ color: tone.color }}>
                      {g.reward}
                    </div>
                  </div>
                  {g.achieved ? (
                    <div className="goal-earned">
                      <div className="goal-earned-label">Ganado</div>
                      <div className="goal-earned-val">+${g.earned.toFixed(2)}</div>
                    </div>
                  ) : (
                    <div className="goal-remaining">
                      <div className="goal-remaining-label">Te falta</div>
                      <div className="goal-remaining-val">
                        {g.unit}{g.remaining}
                        {g.unit === "$" ? "" : g.remaining === 1 ? " unidad" : " unidades"}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Recent sales */}
        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-eyebrow">Tus ventas recientes</div>
              <div className="card-title">Cobros que sumaste este mes</div>
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-dim)" }}>
              {recent.length} cobros recientes
            </div>
          </div>
          <div className="recent">
            {recent.map((r, i) => (
              <div className="recent-row" key={i}>
                <div className="recent-time">{r.d}</div>
                <span className={`pill p-${r.kind}`}>
                  {r.kind === "S" ? "Servicio" : "Producto"}
                </span>
                <div className="recent-item">{r.item}</div>
                <div className="recent-amt">+${r.amt.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
//   TEAM
// ============================================================

function Team({ user, data, onLock, onBack }) {
  const team = data.topEmployees.map((t) => ({
    ...t,
    goal: 2000,
    pct: Math.min(100, (t.ventas / 2000) * 100),
    bonus: t.ventas >= 2000 ? 200 : t.ventas >= 1500 ? 100 : t.ventas >= 1000 ? 50 : 0,
  }));
  return (
    <div className="screen">
      <TopBar user={user} title="Equipo y bonos" onLock={onLock} onBack={onBack} onLogout={onLock}/>
      <div className="ana-body">
        <div className="ana-head">
          <div>
            <div className="ana-eyebrow">Desempeño · Mayo 2026</div>
            <h2 className="ana-title">Equipo y bonos</h2>
          </div>
        </div>
        <div className="team-grid">
          {team.map((t) => (
            <div className="team-card" key={t.name}>
              <div className="team-head">
                <div className="avatar lg" style={{background:`hsl(${t.name.charCodeAt(0)*7%360} 70% 55%)`}}>
                  {t.name.split(" ").map((p)=>p[0]).join("")}
                </div>
                <div>
                  <div className="team-name">{t.name}</div>
                  <div className="team-svc">{t.servicios} servicios</div>
                </div>
                <div className="team-bonus">
                  {t.bonus ? <span className="b-on">+${t.bonus}</span> : <span className="b-off">Sin bono aún</span>}
                </div>
              </div>
              <div className="team-bar">
                <div className="team-fill" style={{width:`${t.pct}%`}}/>
              </div>
              <div className="team-meta">
                <span>${t.ventas} / ${t.goal}</span>
                <span>{t.pct.toFixed(0)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
//   SETTINGS — master-detail layout
// ============================================================

function Settings({ user, data, onLock, onBack }) {
  const sections = data.settingsSections;
  const groups = [...new Set(sections.map((s) => s.group))];
  const [activeId, setActiveId] = React.useState(sections[0].id);
  const [navOpen, setNavOpen] = React.useState(false);
  const [toast, setToast] = React.useState(null);
  const active = sections.find((s) => s.id === activeId);

  const showToast = (title, sub) => {
    setToast({ title, sub });
    setTimeout(() => setToast(null), 2800);
  };

  const selectSection = (id) => {
    setActiveId(id);
    setNavOpen(false);
  };

  return (
    <div className="screen">
      <TopBar user={user} title="Ajustes" onLock={onLock} onBack={onBack} onLogout={onLock}/>
      <div className={`settings-shell ${navOpen ? "nav-open" : ""}`}>
        <button
          className="settings-nav-backdrop"
          onClick={() => setNavOpen(false)}
          aria-label="Cerrar menú"
        />
        <aside className="settings-nav">
          <div className="settings-nav-mobile-head">
            <div style={{ fontSize: 13, fontWeight: 700 }}>Secciones</div>
            <button
              className="iconbtn"
              onClick={() => setNavOpen(false)}
              aria-label="Cerrar"
            >
              <Icons.X size={16}/>
            </button>
          </div>
          {groups.map((group) => (
            <div className="settings-nav-group" key={group}>
              <div className="settings-nav-group-label">{group}</div>
              {sections
                .filter((s) => s.group === group)
                .map((s) => {
                  const IconComp = Icons[s.icon] || Icons.Settings;
                  return (
                    <button
                      key={s.id}
                      className={`settings-nav-item ${activeId === s.id ? "active" : ""}`}
                      onClick={() => selectSection(s.id)}
                    >
                      <div className="settings-nav-ico">
                        <IconComp size={14}/>
                      </div>
                      <div className="settings-nav-text">
                        <div className="settings-nav-label">{s.label}</div>
                        <div className="settings-nav-desc">{s.desc}</div>
                      </div>
                      <Icons.ArrowRight size={12}/>
                    </button>
                  );
                })}
            </div>
          ))}
        </aside>

        <main className="settings-content">
          <button
            className="settings-mobile-toggle"
            onClick={() => setNavOpen(true)}
          >
            <Icons.Settings size={14}/>
            <span style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 11, color: "var(--ink-dim)", fontWeight: 600, letterSpacing: ".05em", textTransform: "uppercase" }}>
                {active.group}
              </span>
              <span style={{ display: "block", fontWeight: 700, fontSize: 14 }}>
                {active.label}
              </span>
            </span>
            <Icons.ArrowRight size={14}/>
          </button>

          <div className="settings-header">
            <div>
              <div className="ana-eyebrow">{active.group}</div>
              <h2 className="ana-title">{active.label}</h2>
              <div className="settings-header-desc">{active.desc}</div>
            </div>
          </div>

          <SettingPanel section={active} data={data} onSave={(name) => showToast("Cambios guardados", name)}/>
        </main>
      </div>

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

function SettingPanel({ section, data, onSave }) {
  const s = section;
  if (s.kind === "form")        return <SettingForm section={s} onSave={onSave}/>;
  if (s.kind === "hours")       return <SettingHours section={s} onSave={onSave}/>;
  if (s.kind === "receipt")     return <SettingReceipt onSave={onSave}/>;
  if (s.kind === "tax")         return <SettingTax section={s} onSave={onSave}/>;
  if (s.kind === "catalog-list")return <SettingCatalog data={data} filter={s.filter} onSave={onSave}/>;
  if (s.kind === "categories")  return <SettingCategories data={data} onSave={onSave}/>;
  if (s.kind === "promos")      return <SettingPromos section={s} onSave={onSave}/>;
  if (s.kind === "users")       return <SettingUsers data={data} onSave={onSave}/>;
  if (s.kind === "roles")       return <SettingRoles section={s} data={data} onSave={onSave}/>;
  if (s.kind === "goals")       return <SettingGoals data={data} onSave={onSave}/>;
  if (s.kind === "commissions") return <SettingCommissions section={s} onSave={onSave}/>;
  if (s.kind === "lock-time")   return <SettingLockTime onSave={onSave}/>;
  if (s.kind === "payments")    return <SettingPayments section={s} onSave={onSave}/>;
  if (s.kind === "appearance")  return <SettingAppearance/>;
  if (s.kind === "backup")      return <SettingBackup onSave={onSave}/>;
  return <div>Próximamente.</div>;
}

// ---- Sub-panels ----
function SaveBar({ onSave, label = "Cambios guardados" }) {
  return (
    <div className="save-bar">
      <button className="btn-ghost">Cancelar</button>
      <button className="btn-primary" onClick={() => onSave(label)}>
        <Icons.Check size={14}/> Guardar
      </button>
    </div>
  );
}

function SettingForm({ section, onSave }) {
  const [state, setState] = React.useState(
    Object.fromEntries(section.fields.map((f) => [f.key, f.value]))
  );
  return (
    <div className="set-card">
      <div className="form-grid">
        {section.fields.map((f) => (
          <label
            key={f.key}
            className={`form-row ${f.key === "address" ? "form-row-full" : ""}`}
          >
            <span className="form-label">{f.label}</span>
            <input
              className="form-input"
              value={state[f.key]}
              onChange={(e) => setState((p) => ({ ...p, [f.key]: e.target.value }))}
            />
          </label>
        ))}
      </div>
      <SaveBar onSave={onSave} label={section.label}/>
    </div>
  );
}

function SettingHours({ section, onSave }) {
  const [days, setDays] = React.useState(section.schedule);
  const toggle = (i) => setDays((d) => d.map((x, j) => j === i ? { ...x, on: !x.on } : x));
  const setTime = (i, key, v) =>
    setDays((d) => d.map((x, j) => j === i ? { ...x, [key]: v } : x));
  return (
    <div className="set-card">
      <div className="hours-list">
        {days.map((d, i) => (
          <div key={d.day} className={`hours-row ${d.on ? "" : "off"}`}>
            <button className={`hours-toggle ${d.on ? "on" : ""}`} onClick={() => toggle(i)}>
              <span/>
            </button>
            <div className="hours-day">{d.day}</div>
            {d.on ? (
              <>
                <input
                  type="time"
                  className="form-input small"
                  value={d.open}
                  onChange={(e) => setTime(i, "open", e.target.value)}
                />
                <span style={{ color: "var(--ink-dim)" }}>–</span>
                <input
                  type="time"
                  className="form-input small"
                  value={d.close}
                  onChange={(e) => setTime(i, "close", e.target.value)}
                />
              </>
            ) : (
              <div style={{ color: "var(--ink-faint)", fontSize: 13, gridColumn: "3 / -1" }}>Cerrado</div>
            )}
          </div>
        ))}
      </div>
      <SaveBar onSave={onSave} label="Horarios"/>
    </div>
  );
}

function SettingReceipt({ onSave }) {
  const [header, setHeader] = React.useState("Ely's Salón de Belleza");
  const [footer, setFooter] = React.useState("¡Gracias por tu visita! Síguenos en @elys.salon");
  const [showLogo, setShowLogo] = React.useState(true);
  const [showAddress, setShowAddress] = React.useState(true);
  return (
    <div className="set-grid-2">
      <div className="set-card">
        <div className="form-grid">
          <label className="form-row form-row-full">
            <span className="form-label">Encabezado del ticket</span>
            <input
              className="form-input"
              value={header}
              onChange={(e) => setHeader(e.target.value)}
            />
          </label>
          <label className="form-row form-row-full">
            <span className="form-label">Pie del ticket</span>
            <textarea
              className="form-input"
              rows="2"
              value={footer}
              onChange={(e) => setFooter(e.target.value)}
            />
          </label>
          <div className="toggle-row">
            <label>
              <span>Mostrar logo</span>
              <button
                className={`hours-toggle ${showLogo ? "on" : ""}`}
                onClick={() => setShowLogo((v) => !v)}
              >
                <span/>
              </button>
            </label>
            <label>
              <span>Mostrar dirección</span>
              <button
                className={`hours-toggle ${showAddress ? "on" : ""}`}
                onClick={() => setShowAddress((v) => !v)}
              >
                <span/>
              </button>
            </label>
          </div>
        </div>
        <SaveBar onSave={onSave} label="Ticket"/>
      </div>

      <div className="ticket-preview">
        <div className="ticket-paper">
          {showLogo && (
            <div className="ticket-logo">
              <img src="assets/logo.jpg" alt=""/>
            </div>
          )}
          <div className="ticket-h">{header}</div>
          {showAddress && (
            <div className="ticket-addr">Av. Hidalgo 124, Torreón</div>
          )}
          <div className="ticket-sep">— — — — — — — — — — —</div>
          <div className="ticket-line"><span>1× Tinte raíz</span><span>$35.00</span></div>
          <div className="ticket-line"><span>1× Manicure spa</span><span>$20.00</span></div>
          <div className="ticket-line"><span>1× Aceite argán</span><span>$15.00</span></div>
          <div className="ticket-sep">— — — — — — — — — — —</div>
          <div className="ticket-line tot"><span>Total</span><span>$70.00</span></div>
          <div className="ticket-sep">— — — — — — — — — — —</div>
          <div className="ticket-foot">{footer}</div>
        </div>
      </div>
    </div>
  );
}

function SettingTax({ section, onSave }) {
  const [rate, setRate] = React.useState(section.rate);
  const [included, setIncluded] = React.useState(section.includedInPrice);
  return (
    <div className="set-card">
      <div className="form-grid">
        <label className="form-row">
          <span className="form-label">Tasa de impuesto (IVA)</span>
          <div className="form-input-prefix">
            <input
              type="number"
              min="0"
              max="100"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
            />
            <span>%</span>
          </div>
        </label>
        <div className="toggle-row form-row-full">
          <label>
            <span>Impuesto incluido en el precio mostrado</span>
            <button
              className={`hours-toggle ${included ? "on" : ""}`}
              onClick={() => setIncluded((v) => !v)}
            >
              <span/>
            </button>
          </label>
        </div>
      </div>
      <SaveBar onSave={onSave} label="Impuestos"/>
    </div>
  );
}

function SettingCatalog({ data, filter, onSave }) {
  const [items, setItems] = React.useState(
    data.catalog.filter((c) => c.type === filter)
  );
  const [q, setQ] = React.useState("");
  const [editing, setEditing] = React.useState(null); // item or "new"
  const [confirm, setConfirm] = React.useState(null);

  const filtered = items.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));

  const handleSave = (item) => {
    setItems((arr) => {
      const idx = arr.findIndex((x) => x.id === item.id);
      if (idx === -1) return [...arr, item];
      const copy = [...arr];
      copy[idx] = item;
      return copy;
    });
    setEditing(null);
    onSave(item.name);
  };

  const handleDelete = (id) => {
    setItems((arr) => arr.filter((x) => x.id !== id));
    setConfirm(null);
    onSave("Eliminado");
  };

  const newItem = () => ({
    id: `${filter.toLowerCase()}_${Date.now()}`,
    cat: data.categories[0].id,
    type: filter,
    name: "",
    price: 0,
    cost: 0,
    ...(filter === "S" ? { duration: "30m" } : { stock: 0, brand: "", sku: "" }),
    image: "",
  });

  return (
    <div className="set-card">
      <div className="inv-toolbar" style={{ marginBottom: 14 }}>
        <div className="search">
          <Icons.Search size={16}/>
          <input
            placeholder={`Buscar ${filter === "P" ? "producto" : "servicio"}…`}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <button className="btn-primary" onClick={() => setEditing(newItem())}>
          <Icons.Plus size={14}/> Agregar {filter === "P" ? "producto" : "servicio"}
        </button>
      </div>
      <div className="cat-list">
        {filtered.map((p) => (
          <div className="cat-row" key={p.id}>
            <div
              className="inv-thumb"
              style={{ backgroundImage: `url(${p.image})` }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
              <div style={{ fontSize: 12, color: "var(--ink-dim)" }}>
                {p.brand || data.categories.find((c) => c.id === p.cat)?.label}
                {" · "}{p.duration || `${p.stock} en stock`}
              </div>
            </div>
            <div className="cat-price">${p.price}</div>
            <button className="btn-ghost btn-sm" onClick={() => setEditing(p)}>
              Editar
            </button>
            <button
              className="btn-ghost btn-sm"
              onClick={() => setConfirm(p)}
              title="Eliminar"
              style={{ color: "var(--magenta)" }}
            >
              <Icons.Trash size={12}/>
            </button>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: "var(--ink-dim)", fontSize: 13 }}>
            Sin {filter === "P" ? "productos" : "servicios"} que coincidan.
          </div>
        )}
      </div>

      {editing && (
        <CatalogItemModal
          item={editing}
          categories={data.categories}
          onClose={() => setEditing(null)}
          onSave={handleSave}
        />
      )}

      {confirm && (
        <window.ConfirmModal
          title="¿Eliminar del catálogo?"
          message={`"${confirm.name}" se eliminará permanentemente. Las ventas existentes que lo incluyan no se ven afectadas.`}
          confirmLabel="Eliminar"
          danger
          onClose={() => setConfirm(null)}
          onConfirm={() => handleDelete(confirm.id)}
        />
      )}
    </div>
  );
}

function CatalogItemModal({ item, categories, onClose, onSave }) {
  const [it, setIt] = React.useState(item);
  const upd = (k, v) => setIt((p) => ({ ...p, [k]: v }));
  const isNew = !item.name;
  const isProduct = it.type === "P";
  const valid = it.name.trim() && +it.price >= 0;

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal entry-modal" onClick={(e) => e.stopPropagation()} style={{ width: "min(600px, 92vw)" }}>
        <div className="modal-head">
          <div>
            <div className="modal-eyebrow">
              {isNew ? "Nuevo" : "Editar"} {isProduct ? "producto" : "servicio"}
            </div>
            <div className="modal-title">{it.name || "Sin nombre"}</div>
            <div className="modal-sub">
              {categories.find((c) => c.id === it.cat)?.label || "Sin categoría"}
            </div>
          </div>
          <button className="iconbtn" onClick={onClose}>
            <Icons.X size={16}/>
          </button>
        </div>

        {it.image && (
          <div
            className="cat-edit-preview"
            style={{ backgroundImage: `url(${it.image})` }}
          />
        )}

        <div className="form-grid">
          <label className="form-row form-row-full">
            <span className="form-label">Nombre</span>
            <input
              className="form-input"
              value={it.name}
              onChange={(e) => upd("name", e.target.value)}
              autoFocus
            />
          </label>

          <label className="form-row">
            <span className="form-label">Categoría</span>
            <select
              className="form-input"
              value={it.cat}
              onChange={(e) => upd("cat", e.target.value)}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </label>

          <label className="form-row">
            <span className="form-label">Precio de venta</span>
            <div className="form-input-prefix">
              <span>$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={it.price}
                onChange={(e) => upd("price", +e.target.value || 0)}
              />
            </div>
          </label>

          <label className="form-row">
            <span className="form-label">Costo</span>
            <div className="form-input-prefix">
              <span>$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={it.cost || 0}
                onChange={(e) => upd("cost", +e.target.value || 0)}
              />
            </div>
          </label>

          {isProduct ? (
            <>
              <label className="form-row">
                <span className="form-label">Stock</span>
                <input
                  className="form-input"
                  type="number"
                  min="0"
                  value={it.stock || 0}
                  onChange={(e) => upd("stock", +e.target.value || 0)}
                />
              </label>
              <label className="form-row">
                <span className="form-label">Marca</span>
                <input
                  className="form-input"
                  value={it.brand || ""}
                  onChange={(e) => upd("brand", e.target.value)}
                />
              </label>
              <label className="form-row form-row-full">
                <span className="form-label">SKU</span>
                <input
                  className="form-input"
                  value={it.sku || ""}
                  onChange={(e) => upd("sku", e.target.value)}
                />
              </label>
            </>
          ) : (
            <label className="form-row">
              <span className="form-label">Duración</span>
              <input
                className="form-input"
                value={it.duration || ""}
                placeholder="Ej. 30m, 1h 15m"
                onChange={(e) => upd("duration", e.target.value)}
              />
            </label>
          )}

          <label className="form-row form-row-full">
            <span className="form-label">URL de imagen</span>
            <input
              className="form-input"
              placeholder="https://…"
              value={it.image || ""}
              onChange={(e) => upd("image", e.target.value)}
            />
          </label>
        </div>

        {+it.cost > 0 && +it.price > 0 && (
          <div className="margin-pill">
            Margen estimado: <b>{(((it.price - it.cost) / it.price) * 100).toFixed(0)}%</b>
            {" · "}Ganancia por unidad: <b>${(it.price - it.cost).toFixed(2)}</b>
          </div>
        )}

        <div className="modal-foot">
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" disabled={!valid} onClick={() => onSave(it)}>
            <Icons.Check size={14}/> {isNew ? "Crear" : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SettingCategories({ data, onSave }) {
  const [cats, setCats] = React.useState(data.categories);
  return (
    <div className="set-card">
      <div className="cat-chips">
        {cats.map((c) => (
          <div className="cat-chip" key={c.id}>
            <span>{c.label}</span>
            <button title="Quitar"><Icons.X size={11}/></button>
          </div>
        ))}
        <button className="cat-chip add">
          <Icons.Plus size={12}/> Nueva categoría
        </button>
      </div>
      <div style={{ marginTop: 14, fontSize: 12, color: "var(--ink-dim)" }}>
        Arrastra para reordenar el orden en que aparecen en la pantalla de ventas.
      </div>
      <SaveBar onSave={onSave} label="Categorías"/>
    </div>
  );
}

function SettingPromos({ section, onSave }) {
  const [promos, setPromos] = React.useState(section.promos);
  const toggle = (i) => setPromos((ps) => ps.map((p, j) => j === i ? { ...p, on: !p.on } : p));
  return (
    <div className="set-card">
      <div className="promo-list">
        {promos.map((p, i) => (
          <div className={`promo-row ${p.on ? "" : "off"}`} key={p.name}>
            <div className="promo-off">{p.off}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{p.name}</div>
              <div style={{ fontSize: 12, color: "var(--ink-dim)" }}>{p.desc}</div>
            </div>
            <button className={`hours-toggle ${p.on ? "on" : ""}`} onClick={() => toggle(i)}>
              <span/>
            </button>
            <button className="btn-ghost btn-sm">Editar</button>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 14 }}>
        <button className="btn-primary">
          <Icons.Plus size={14}/> Nueva promoción
        </button>
      </div>
    </div>
  );
}

function SettingUsers({ data, onSave }) {
  return (
    <div className="set-card">
      <div className="users-list">
        {data.users.map((u) => (
          <div className="users-row" key={u.id}>
            <div className="avatar lg" style={{ background: u.color }}>{u.initials}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{u.name}</div>
              <div style={{ fontSize: 12, color: "var(--ink-dim)" }}>
                {u.role === "admin" ? "Administradora" : "Empleada"} · PIN ●●●●
              </div>
            </div>
            <button className="btn-ghost btn-sm">Cambiar PIN</button>
            <button className="btn-ghost btn-sm">Editar</button>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 14 }}>
        <button className="btn-primary">
          <Icons.Plus size={14}/> Agregar usuario
        </button>
      </div>
    </div>
  );
}

function SettingRoles({ section, data, onSave }) {
  const [perms, setPerms] = React.useState(section.permissions);
  const [selectedUserId, setSelectedUserId] = React.useState(data.users[0]?.id);
  // userOverrides: { [userId]: { role: "admin"|"empleada", perms: { [perm]: boolean } } }
  const [userOverrides, setUserOverrides] = React.useState(() => {
    const o = {};
    data.users.forEach((u) => {
      o[u.id] = { role: u.role, perms: {} };
    });
    return o;
  });
  const [tab, setTab] = React.useState("byUser"); // "byUser" | "matrix"

  const selectedUser = data.users.find((u) => u.id === selectedUserId);
  const userState = userOverrides[selectedUserId] || { role: "empleada", perms: {} };

  // Effective permission = override if set, else role default from matrix
  const effective = (permName) => {
    if (permName in userState.perms) return userState.perms[permName];
    const row = perms.find((p) => p.perm === permName);
    return row ? row[userState.role] : false;
  };

  const toggleUserPerm = (permName) => {
    setUserOverrides((o) => ({
      ...o,
      [selectedUserId]: {
        ...o[selectedUserId],
        perms: {
          ...o[selectedUserId].perms,
          [permName]: !effective(permName),
        },
      },
    }));
  };

  const setUserRole = (role) => {
    setUserOverrides((o) => ({
      ...o,
      [selectedUserId]: { ...o[selectedUserId], role, perms: {} }, // reset overrides when role changes
    }));
  };

  const resetOverrides = () => {
    setUserOverrides((o) => ({
      ...o,
      [selectedUserId]: { ...o[selectedUserId], perms: {} },
    }));
    onSave("Permisos restablecidos");
  };

  const overrideCount = Object.keys(userState.perms).length;

  const toggleMatrix = (i, role) =>
    setPerms((p) => p.map((r, j) => j === i ? { ...r, [role]: !r[role] } : r));

  return (
    <div className="set-card">
      <div className="tabs" style={{ padding: 0, marginBottom: 18 }}>
        <button
          className={`tab ${tab === "byUser" ? "active" : ""}`}
          onClick={() => setTab("byUser")}
        >
          <Icons.Users size={13}/>
          <span style={{ marginLeft: 6 }}>Por usuario</span>
        </button>
        <button
          className={`tab ${tab === "matrix" ? "active" : ""}`}
          onClick={() => setTab("matrix")}
        >
          <Icons.Settings size={13}/>
          <span style={{ marginLeft: 6 }}>Plantilla de roles</span>
        </button>
      </div>

      {tab === "byUser" ? (
        <div>
          <div className="form-label" style={{ marginBottom: 10 }}>
            Selecciona una usuaria
          </div>
          <div className="user-picker">
            {data.users.map((u) => (
              <button
                key={u.id}
                className={`user-pick ${selectedUserId === u.id ? "active" : ""}`}
                onClick={() => setSelectedUserId(u.id)}
              >
                <div className="avatar" style={{ background: u.color }}>
                  {u.initials}
                </div>
                <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{u.name}</div>
                  <div style={{ fontSize: 11, color: "var(--ink-dim)" }}>
                    {userOverrides[u.id]?.role === "admin" ? "Administradora" : "Empleada"}
                  </div>
                </div>
                {selectedUserId === u.id && <Icons.Check size={14}/>}
              </button>
            ))}
          </div>

          {selectedUser && (
            <div className="role-editor">
              <div className="role-editor-head">
                <div>
                  <div className="form-label" style={{ marginBottom: 6 }}>
                    Rol asignado a {selectedUser.name}
                  </div>
                  <div className="role-toggle">
                    <button
                      className={`role-tog ${userState.role === "empleada" ? "active" : ""}`}
                      onClick={() => setUserRole("empleada")}
                    >
                      <Icons.Users size={12}/> Empleada
                    </button>
                    <button
                      className={`role-tog ${userState.role === "admin" ? "active" : ""}`}
                      onClick={() => setUserRole("admin")}
                    >
                      <Icons.Sparkle size={12}/> Administradora
                    </button>
                  </div>
                </div>
                {overrideCount > 0 && (
                  <div className="override-badge">
                    <Icons.Tag size={11}/> {overrideCount} permiso{overrideCount > 1 ? "s" : ""} personalizado{overrideCount > 1 ? "s" : ""}
                    <button onClick={resetOverrides} title="Volver a defaults del rol">
                      Restablecer
                    </button>
                  </div>
                )}
              </div>

              <div className="form-label" style={{ marginTop: 18, marginBottom: 10 }}>
                Permisos efectivos
                <span style={{ marginLeft: 8, fontWeight: 500, color: "var(--ink-dim)", textTransform: "none", letterSpacing: 0 }}>
                  · activa o desactiva para esta usuaria específicamente
                </span>
              </div>
              <div className="user-perms">
                {perms.map((p) => {
                  const on = effective(p.perm);
                  const isOverride = p.perm in userState.perms;
                  const roleDefault = p[userState.role];
                  return (
                    <label className="perm-row" key={p.perm}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{p.perm}</div>
                        <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 2 }}>
                          {isOverride
                            ? <>
                                <Icons.Tag size={10}/> Personalizado
                                {" "}(default del rol: {roleDefault ? "activado" : "desactivado"})
                              </>
                            : `Default del rol ${userState.role}`}
                        </div>
                      </div>
                      <button
                        className={`hours-toggle ${on ? "on" : ""}`}
                        onClick={() => toggleUserPerm(p.perm)}
                      >
                        <span/>
                      </button>
                    </label>
                  );
                })}
              </div>

              <SaveBar onSave={() => onSave(`Permisos de ${selectedUser.name}`)}/>
            </div>
          )}
        </div>
      ) : (
        <div>
          <div style={{ fontSize: 13, color: "var(--ink-dim)", marginBottom: 12 }}>
            Define qué puede hacer cada rol por defecto. Estos valores se aplican a todas las usuarias del rol, excepto que tengan permisos personalizados en la pestaña "Por usuario".
          </div>
          <div className="perms-table">
            <div className="perms-head">
              <div>Permiso</div>
              <div>Administradora</div>
              <div>Empleada</div>
            </div>
            {perms.map((p, i) => (
              <div className="perms-row" key={p.perm}>
                <div>{p.perm}</div>
                <button
                  className={`perm-cell ${p.admin ? "on" : ""}`}
                  onClick={() => toggleMatrix(i, "admin")}
                >
                  {p.admin ? <Icons.Check size={14}/> : <Icons.X size={12}/>}
                </button>
                <button
                  className={`perm-cell ${p.empleada ? "on" : ""}`}
                  onClick={() => toggleMatrix(i, "empleada")}
                >
                  {p.empleada ? <Icons.Check size={14}/> : <Icons.X size={12}/>}
                </button>
              </div>
            ))}
          </div>
          <SaveBar onSave={onSave} label="Plantilla de roles"/>
        </div>
      )}
    </div>
  );
}

function SettingGoals({ data, onSave }) {
  const [goals, setGoals] = React.useState(data.goals);
  const [editing, setEditing] = React.useState(null);
  const [confirm, setConfirm] = React.useState(null);

  const handleSave = (g) => {
    setGoals((arr) => {
      const idx = arr.findIndex((x) => x.id === g.id);
      if (idx === -1) return [...arr, g];
      const copy = [...arr];
      copy[idx] = g;
      return copy;
    });
    setEditing(null);
    onSave(g.label);
  };

  const handleDelete = (id) => {
    setGoals((arr) => arr.filter((x) => x.id !== id));
    setConfirm(null);
    onSave("Meta eliminada");
  };

  const newGoal = () => ({
    id: `g_${Date.now()}`,
    icon: "Trophy",
    label: "",
    desc: "",
    metric: "totalSales",
    unit: "$",
    target: 100,
    reward: "$10 fijo",
    rewardType: "fixed",
    rewardValue: 10,
    tone: "magenta",
  });

  const toneMap = {
    magenta: "#de0fab", purple: "#7b2cbf", teal: "#0fb0de", green: "#10b981",
  };

  return (
    <div className="set-card">
      <div className="goals-edit">
        {goals.map((g) => {
          const IconComp = Icons[g.icon] || Icons.Trophy;
          return (
            <div className="goal-edit-row v2" key={g.id}>
              <div className="goal-edit-ico" style={{ background: `${toneMap[g.tone]}1f`, color: toneMap[g.tone] }}>
                <IconComp size={18}/>
              </div>
              <div className="goal-edit-info">
                <div style={{ fontWeight: 600, fontSize: 14 }}>{g.label}</div>
                <div style={{ fontSize: 12, color: "var(--ink-dim)", marginTop: 2 }}>{g.desc}</div>
              </div>
              <div className="goal-edit-stat">
                <div className="info-label">Meta</div>
                <div className="info-val">{g.unit}{g.target}</div>
              </div>
              <div className="goal-edit-stat">
                <div className="info-label">Recompensa</div>
                <div className="info-val" style={{ color: toneMap[g.tone] }}>{g.reward}</div>
              </div>
              <div className="goal-edit-acts">
                <button className="btn-ghost btn-sm" onClick={() => setEditing(g)}>
                  Editar
                </button>
                <button
                  className="btn-ghost btn-sm"
                  onClick={() => setConfirm(g)}
                  style={{ color: "var(--magenta)" }}
                  title="Eliminar"
                >
                  <Icons.Trash size={12}/>
                </button>
              </div>
            </div>
          );
        })}
        {goals.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: "var(--ink-dim)", fontSize: 13 }}>
            No hay metas configuradas. Crea la primera para incentivar al equipo.
          </div>
        )}
      </div>

      <div style={{ marginTop: 14 }}>
        <button className="btn-primary" onClick={() => setEditing(newGoal())}>
          <Icons.Plus size={14}/> Nueva meta
        </button>
      </div>

      {editing && (
        <GoalModal
          goal={editing}
          onClose={() => setEditing(null)}
          onSave={handleSave}
        />
      )}

      {confirm && (
        <window.ConfirmModal
          title="¿Eliminar meta?"
          message={`"${confirm.label}" se quitará del programa de bonos. Las empleadas dejarán de verla.`}
          confirmLabel="Eliminar"
          danger
          onClose={() => setConfirm(null)}
          onConfirm={() => handleDelete(confirm.id)}
        />
      )}
    </div>
  );
}

function GoalModal({ goal, onClose, onSave }) {
  const [g, setG] = React.useState(goal);
  const upd = (k, v) => setG((p) => ({ ...p, [k]: v }));
  const isNew = !goal.label;

  const tones = [
    { id: "magenta", color: "#de0fab" },
    { id: "purple",  color: "#7b2cbf" },
    { id: "teal",    color: "#0fb0de" },
    { id: "green",   color: "#10b981" },
  ];
  const icons = ["Trophy", "Box", "Sparkle", "Users", "Cart", "Cash", "TrendUp"];
  const metrics = [
    { id: "totalSales",  label: "Ventas totales ($)", unit: "$" },
    { id: "retailSales", label: "Ventas de producto ($)", unit: "$" },
    { id: "servicesDone",label: "Servicios completados", unit: "" },
    { id: "newClients",  label: "Clientas nuevas", unit: "" },
    { id: "tipsCollected", label: "Propinas ($)", unit: "$" },
  ];

  const setMetric = (id) => {
    const m = metrics.find((x) => x.id === id);
    upd("metric", id);
    if (m) upd("unit", m.unit);
  };

  // Auto-format reward text from numeric inputs
  const formatReward = () => {
    if (g.rewardType === "fixed") upd("reward", `$${g.rewardValue} fijo`);
    if (g.rewardType === "percent") upd("reward", `${g.rewardValue}% del metric`);
  };

  const valid = g.label.trim() && +g.target > 0;
  const IconComp = Icons[g.icon] || Icons.Trophy;
  const color = tones.find((t) => t.id === g.tone)?.color;

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal entry-modal" onClick={(e) => e.stopPropagation()} style={{ width: "min(640px, 92vw)" }}>
        <div className="modal-head">
          <div>
            <div className="modal-eyebrow">{isNew ? "Nueva meta" : "Editar meta"}</div>
            <div className="modal-title">{g.label || "Define un nombre"}</div>
            <div className="modal-sub">Configura objetivo y recompensa</div>
          </div>
          <button className="iconbtn" onClick={onClose}>
            <Icons.X size={16}/>
          </button>
        </div>

        <div className="goal-preview" style={{ borderColor: color }}>
          <div className="goal-icon" style={{ background: `${color}1f`, color }}>
            <IconComp size={20}/>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{g.label || "Mi meta"}</div>
            <div style={{ fontSize: 12, color: "var(--ink-dim)" }}>{g.desc || "Descripción de la meta"}</div>
          </div>
          <div className="goal-preview-pill" style={{ color }}>
            {g.unit}{g.target} → {g.reward}
          </div>
        </div>

        <div className="form-grid">
          <label className="form-row form-row-full">
            <span className="form-label">Nombre</span>
            <input
              className="form-input"
              value={g.label}
              onChange={(e) => upd("label", e.target.value)}
              autoFocus
            />
          </label>
          <label className="form-row form-row-full">
            <span className="form-label">Descripción para la empleada</span>
            <textarea
              className="form-input"
              rows="2"
              value={g.desc}
              onChange={(e) => upd("desc", e.target.value)}
            />
          </label>

          <label className="form-row">
            <span className="form-label">Métrica a medir</span>
            <select
              className="form-input"
              value={g.metric}
              onChange={(e) => setMetric(e.target.value)}
            >
              {metrics.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </label>

          <label className="form-row">
            <span className="form-label">Meta a alcanzar</span>
            <div className="form-input-prefix">
              {g.unit && <span>{g.unit}</span>}
              <input
                type="number"
                min="1"
                value={g.target}
                onChange={(e) => upd("target", +e.target.value || 0)}
              />
            </div>
          </label>

          <label className="form-row">
            <span className="form-label">Tipo de recompensa</span>
            <select
              className="form-input"
              value={g.rewardType}
              onChange={(e) => upd("rewardType", e.target.value)}
            >
              <option value="fixed">Monto fijo ($)</option>
              <option value="percent">Porcentaje sobre la métrica</option>
            </select>
          </label>

          <label className="form-row">
            <span className="form-label">Valor</span>
            <div className="form-input-prefix">
              {g.rewardType === "fixed" && <span>$</span>}
              <input
                type="number"
                min="0"
                value={g.rewardValue}
                onChange={(e) => upd("rewardValue", +e.target.value || 0)}
              />
              {g.rewardType === "percent" && <span>%</span>}
            </div>
          </label>

          <label className="form-row form-row-full">
            <span className="form-label">Etiqueta de recompensa (lo que ve la empleada)</span>
            <input
              className="form-input"
              value={g.reward}
              placeholder="$10 fijo · 5% del retail · etc."
              onChange={(e) => upd("reward", e.target.value)}
              onFocus={formatReward}
            />
          </label>

          <div className="form-row">
            <span className="form-label">Color</span>
            <div className="tone-row">
              {tones.map((t) => (
                <button
                  key={t.id}
                  className={`tone-dot ${g.tone === t.id ? "active" : ""}`}
                  style={{ background: t.color }}
                  onClick={() => upd("tone", t.id)}
                />
              ))}
            </div>
          </div>

          <div className="form-row">
            <span className="form-label">Ícono</span>
            <div className="icon-row">
              {icons.map((i) => {
                const I = Icons[i];
                return (
                  <button
                    key={i}
                    className={`icon-btn ${g.icon === i ? "active" : ""}`}
                    onClick={() => upd("icon", i)}
                  >
                    <I size={16}/>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="modal-foot">
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" disabled={!valid} onClick={() => onSave(g)}>
            <Icons.Check size={14}/> {isNew ? "Crear meta" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SettingCommissions({ section, onSave }) {
  const [rows, setRows] = React.useState(section.rows);
  return (
    <div className="set-card">
      <div className="comm-list">
        {rows.map((r, i) => (
          <div className="comm-row" key={r.name}>
            <div style={{ fontWeight: 600, flex: 1 }}>{r.name}</div>
            <div className="form-input-prefix" style={{ width: 110 }}>
              <input
                type="number"
                value={r.rate}
                onChange={(e) =>
                  setRows((rs) => rs.map((x, j) => j === i ? { ...x, rate: +e.target.value } : x))
                }
              />
              <span>%</span>
            </div>
          </div>
        ))}
      </div>
      <SaveBar onSave={onSave} label="Comisiones"/>
    </div>
  );
}

function SettingLockTime({ onSave }) {
  const [val, setVal] = React.useState(120);
  return (
    <div className="set-card">
      <div className="form-row form-row-full">
        <span className="form-label">Auto-bloqueo por inactividad</span>
        <input
          type="range"
          min="30"
          max="600"
          step="30"
          value={val}
          onChange={(e) => setVal(+e.target.value)}
          className="form-slider"
        />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--ink-dim)" }}>
          <span>30s</span>
          <span style={{ color: "var(--magenta)", fontWeight: 700 }}>
            {val < 60 ? `${val}s` : `${Math.round(val/60)} min ${val%60 ? `${val%60}s` : ""}`}
          </span>
          <span>10 min</span>
        </div>
      </div>
      <div className="toggle-row" style={{ marginTop: 14 }}>
        <label>
          <span>Bloquear automáticamente después de cada cobro</span>
          <button className="hours-toggle on"><span/></button>
        </label>
        <label>
          <span>Pedir PIN al cambiar de empleada</span>
          <button className="hours-toggle on"><span/></button>
        </label>
      </div>
      <SaveBar onSave={onSave} label="Bloqueo"/>
    </div>
  );
}

function SettingPayments({ section, onSave }) {
  const [methods, setMethods] = React.useState(section.methods);
  const toggle = (i) => setMethods((m) => m.map((x, j) => j === i ? { ...x, on: !x.on } : x));
  return (
    <div className="set-card">
      <div className="toggle-row" style={{ flexDirection: "column" }}>
        {methods.map((m, i) => (
          <label key={m.id}>
            <span>{m.label}</span>
            <button className={`hours-toggle ${m.on ? "on" : ""}`} onClick={() => toggle(i)}>
              <span/>
            </button>
          </label>
        ))}
      </div>
      <SaveBar onSave={onSave} label="Métodos de pago"/>
    </div>
  );
}

function SettingAppearance() {
  // Read current state from CSS vars / dataset
  const docEl = typeof document !== "undefined" ? document.documentElement : null;
  const [theme, setTheme] = React.useState(docEl?.dataset.theme || "light");
  const [density, setDensity] = React.useState(docEl?.dataset.density || "comfortable");
  const [accent, setAccent] = React.useState(
    docEl?.style.getPropertyValue("--magenta")?.trim() || "#de0fab"
  );

  // Persist to host (Tweaks → EDITMODE) AND to a long-lived cookie.
  const COOKIE = "elys_prefs";
  const post = (key, value) => {
    try {
      window.parent.postMessage(
        { type: "__edit_mode_set_keys", edits: { [key]: value } },
        "*"
      );
    } catch (e) {}
    // Cookie persistence — survives full reloads / kiosk mode reboots.
    try {
      const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]*)`));
      const prev = m ? JSON.parse(decodeURIComponent(m[1])) : {};
      const next = { ...prev, [key]: value };
      const exp = new Date(Date.now() + 365 * 86400000).toUTCString();
      document.cookie = `${COOKIE}=${encodeURIComponent(JSON.stringify(next))}; expires=${exp}; path=/; SameSite=Lax`;
    } catch (e) {}
  };

  const applyTheme = (v) => {
    setTheme(v);
    if (docEl) docEl.dataset.theme = v;
    post("darkMode", v === "dark");
  };
  const applyDensity = (v) => {
    setDensity(v);
    if (docEl) docEl.dataset.density = v;
    post("density", v);
  };
  const applyAccent = (v) => {
    setAccent(v);
    if (docEl) docEl.style.setProperty("--magenta", v);
    post("accent", v);
  };

  const accents = [
    { name: "Magenta",   value: "#de0fab" },
    { name: "Morado",    value: "#7b2cbf" },
    { name: "Cian",      value: "#0fb0de" },
    { name: "Verde",     value: "#10b981" },
    { name: "Naranja",   value: "#f59e0b" },
    { name: "Coral",     value: "#ef4444" },
  ];

  return (
    <div className="set-grid-2">
      <div className="set-card">
        <div className="form-label" style={{ marginBottom: 10 }}>Tema</div>
        <div className="theme-row">
          <button
            className={`theme-card ${theme === "light" ? "active" : ""}`}
            onClick={() => applyTheme("light")}
          >
            <div className="theme-card-preview light">
              <div className="tcp-bar"/>
              <div className="tcp-card"/>
              <div className="tcp-card short"/>
            </div>
            <div className="theme-card-label">
              <Icons.Sparkle size={14}/> Claro
            </div>
          </button>
          <button
            className={`theme-card ${theme === "dark" ? "active" : ""}`}
            onClick={() => applyTheme("dark")}
          >
            <div className="theme-card-preview dark">
              <div className="tcp-bar"/>
              <div className="tcp-card"/>
              <div className="tcp-card short"/>
            </div>
            <div className="theme-card-label">
              <Icons.Moon size={14}/> Oscuro
            </div>
          </button>
        </div>

        <div className="form-label" style={{ marginTop: 22, marginBottom: 10 }}>
          Color de acento
        </div>
        <div className="accent-grid">
          {accents.map((a) => (
            <button
              key={a.value}
              className={`accent-swatch ${accent.toLowerCase() === a.value.toLowerCase() ? "active" : ""}`}
              onClick={() => applyAccent(a.value)}
              title={a.name}
            >
              <span style={{ background: a.value }}/>
              <span className="accent-name">{a.name}</span>
            </button>
          ))}
          <label className="accent-swatch custom">
            <input
              type="color"
              value={accent}
              onChange={(e) => applyAccent(e.target.value)}
            />
            <span style={{ background: accent }}/>
            <span className="accent-name">Personalizado</span>
          </label>
        </div>

        <div className="form-label" style={{ marginTop: 22, marginBottom: 10 }}>
          Densidad de la interfaz
        </div>
        <div className="density-row">
          {[
            { id: "comfortable", label: "Cómodo", desc: "Espacios amplios, mejor para pantallas grandes" },
            { id: "compact",     label: "Compacto", desc: "Más contenido por pantalla, ideal para tablets" },
          ].map((d) => (
            <button
              key={d.id}
              className={`density-card ${density === d.id ? "active" : ""}`}
              onClick={() => applyDensity(d.id)}
            >
              <div className="density-title">{d.label}</div>
              <div className="density-desc">{d.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Live preview */}
      <div className="set-card appearance-preview">
        <div className="form-label" style={{ marginBottom: 10 }}>Vista previa</div>
        <div className="preview-shell">
          <div className="preview-topbar">
            <div className="preview-logo">EM</div>
            <div className="preview-titles">
              <div className="preview-brand">Ely's Salón</div>
              <div className="preview-sub">Registrar venta</div>
            </div>
          </div>
          <div className="preview-content">
            <div className="preview-card">
              <div className="preview-thumb"/>
              <div style={{ fontWeight: 600, fontSize: 13 }}>Manicure spa</div>
              <div style={{ fontSize: 11, color: "var(--ink-dim)" }}>45m · Servicio</div>
              <div className="preview-row">
                <div className="preview-price">$20</div>
                <div className="preview-btn">Agregar</div>
              </div>
            </div>
            <div className="preview-card">
              <div className="preview-thumb p2"/>
              <div style={{ fontWeight: 600, fontSize: 13 }}>Tinte raíz</div>
              <div style={{ fontSize: 11, color: "var(--ink-dim)" }}>45m · Servicio</div>
              <div className="preview-row">
                <div className="preview-price">$35</div>
                <div className="preview-btn primary">2 ×</div>
              </div>
            </div>
          </div>
          <div className="preview-pay">
            Cobrar $55 <Icons.ArrowRight size={12}/>
          </div>
        </div>
        <div style={{ marginTop: 14, fontSize: 12, color: "var(--ink-dim)" }}>
          Los cambios se aplican al instante en toda la terminal.
        </div>
      </div>
    </div>
  );
}

function SettingBackup({ onSave }) {
  return (
    <div className="set-card">
      <div className="backup-row">
        <div className="backup-ico"><Icons.Check size={18}/></div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600 }}>Respaldo activo</div>
          <div style={{ fontSize: 12, color: "var(--ink-dim)" }}>
            Último respaldo: hoy 03:00 a.m. · 1.2 MB
          </div>
        </div>
        <button className="btn-ghost btn-sm">Restaurar</button>
        <button className="btn-primary btn-sm" onClick={() => onSave("Respaldo")}>
          Respaldar ahora
        </button>
      </div>
      <div className="toggle-row" style={{ marginTop: 14 }}>
        <label>
          <span>Respaldo automático diario</span>
          <button className="hours-toggle on"><span/></button>
        </label>
        <label>
          <span>Sincronizar con la nube</span>
          <button className="hours-toggle on"><span/></button>
        </label>
      </div>
    </div>
  );
}

window.Inventory = Inventory;
window.Progress = Progress;
window.Team = Team;
window.Settings = Settings;
