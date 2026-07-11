// Sucursales — crear y editar ubicaciones del salón
import { useState, useEffect } from 'react';
import { Icons } from './icons.jsx';
import { TopBar } from './menu.jsx';
import { branches as branchesApi, apiError } from './api.js';

function Branches({ user, onLock, onBack }) {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null); // branch or "new"
  const [toast, setToast] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  };

  const load = () =>
    branchesApi.list().then((list) => setItems(list)).catch(() => {});

  useEffect(() => { load(); }, []);

  const save = (branch) => {
    const isNew = branch.id === "new";
    const body = { name: branch.name, address: branch.address, phone: branch.phone };
    const call = isNew ? branchesApi.create(body) : branchesApi.update(branch.id, body);
    call
      .then(() => {
        setEditing(null);
        showToast(isNew ? "Sucursal creada" : "Cambios guardados");
        load();
      })
      .catch((err) => showToast(apiError(err)));
  };

  const toggleActive = (branch) => {
    branchesApi
      .update(branch.id, { active: !branch.active })
      .then(() => {
        showToast(branch.active ? "Sucursal desactivada" : "Sucursal activada");
        load();
      })
      .catch((err) => showToast(apiError(err)));
  };

  return (
    <div className="screen">
      <TopBar user={user} title="Sucursales" onLock={onLock} onBack={onBack}/>
      <div className="ana-body">
        <div className="inv-head">
          <div>
            <div className="ana-eyebrow">Ubicaciones · {items.length}</div>
            <h2 className="ana-title">Sucursales</h2>
          </div>
          <button className="btn-primary" onClick={() => setEditing({ id: "new", name: "", address: "", phone: "" })}>
            <Icons.Plus size={14}/> Nueva sucursal
          </button>
        </div>

        {items.length === 0 ? (
          <div className="card" style={{ padding: 32, textAlign: "center", color: "var(--ink-dim)" }}>
            Aún no hay sucursales. Crea la primera para poder asignar personal y filtrar ventas por ubicación.
          </div>
        ) : (
          <div className="menu-grid">
            {items.map((b) => (
              <div className="menu-card" key={b.id} style={{ cursor: "default", opacity: b.active ? 1 : 0.55 }}>
                <div className="menu-card-icon"><Icons.Store size={28}/></div>
                <div className="menu-card-title">{b.name}</div>
                <div className="menu-card-desc">
                  {b.address || "Sin dirección"}{b.phone ? ` · ${b.phone}` : ""}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button className="btn-ghost btn-sm" onClick={() => setEditing(b)}>
                    Editar
                  </button>
                  <button className="btn-ghost btn-sm" onClick={() => toggleActive(b)}>
                    {b.active ? "Desactivar" : "Activar"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editing && (
        <BranchModal branch={editing} onClose={() => setEditing(null)} onSave={save}/>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function BranchModal({ branch, onClose, onSave }) {
  const [b, setB] = useState(branch);
  const isNew = branch.id === "new";
  const upd = (k, v) => setB((p) => ({ ...p, [k]: v }));
  const valid = b.name.trim().length >= 2;

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(ev) => ev.stopPropagation()} style={{ width: "min(480px, 92vw)" }}>
        <div className="modal-head">
          <div>
            <div className="modal-eyebrow">{isNew ? "Nueva sucursal" : "Editar sucursal"}</div>
            <div className="modal-title">{b.name || "Sin nombre"}</div>
          </div>
          <button className="iconbtn" onClick={onClose}>
            <Icons.X size={16}/>
          </button>
        </div>

        <div className="form-grid" style={{ marginTop: 12 }}>
          <label className="form-row">
            <span className="form-label">Nombre</span>
            <input className="form-input" autoFocus value={b.name} onChange={(ev) => upd("name", ev.target.value)}/>
          </label>
          <label className="form-row">
            <span className="form-label">Dirección</span>
            <input className="form-input" value={b.address ?? ""} onChange={(ev) => upd("address", ev.target.value)}/>
          </label>
          <label className="form-row">
            <span className="form-label">Teléfono</span>
            <input className="form-input" value={b.phone ?? ""} onChange={(ev) => upd("phone", ev.target.value)}/>
          </label>
        </div>

        <div className="modal-foot" style={{ marginTop: 18 }}>
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" disabled={!valid} onClick={() => onSave(b)}>
            <Icons.Check size={14}/> {isNew ? "Crear sucursal" : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}

export { Branches };
