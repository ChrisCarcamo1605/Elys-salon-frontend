import axios from 'axios';

// Vite lee las variables desde import.meta.env
const BASE = import.meta.env.VITE_API_BASE_URL || 'https://elys-salon-backend-dev.up.railway.app/api';

console.log('API base URL:', BASE);
const http = axios.create({
  baseURL: BASE,
});

export default http;

// Attach JWT from memory on every request
http.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401 → trigger lock (token expired/invalid)
http.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      if (getToken()) {
        clearToken();
        window.dispatchEvent(new CustomEvent('elys:session-expired'));
      }
    }
    return Promise.reject(err);
  }
);

// ─── Token store (JWT in memory; device token in localStorage) ───────────────

let _token = null;

export function setToken(t) { _token = t; }
export function clearToken() { _token = null; }
export function getToken() { return _token; }

const DEVICE_KEY = 'elys_dt';

export function getDeviceToken() { return localStorage.getItem(DEVICE_KEY); }
export function setDeviceToken(t) { localStorage.setItem(DEVICE_KEY, t); }
export function clearDeviceToken() { localStorage.removeItem(DEVICE_KEY); }

// ─── Adapters: backend ↔ frontend shape translation ──────────────────────────

// User entity from backend → frontend shape
function fromUser(u) {
  if (!u) return u;
  return {
    ...u,
    hireDate: typeof u.hireDate === 'string' ? u.hireDate.slice(0, 10) : u.hireDate,
    birthday: typeof u.birthday === 'string' ? u.birthday.slice(0, 10) : u.birthday,
    schedule: typeof u.schedule === 'object' && u.schedule !== null
      ? (u.schedule.text ?? '')
      : (u.schedule ?? ''),
    salary: u.salary != null ? Number(u.salary) : 0,
    commissionRate: u.commissionRate != null ? Number(u.commissionRate) : 0,
    avatarHue: u.avatarHue ?? 0,
  };
}

// Frontend user payload → backend CreateUserDto / UpdateUserDto
function toUserBody(u, { isCreate } = {}) {
  const body = {
    name: u.name,
    role: u.role,
    initials: u.initials || initialsFor(u.name),
    color: u.color,
    position: u.position,
    status: u.status,
    hireDate: u.hireDate || undefined,
    phone: u.phone || undefined,
    email: u.email || undefined,
    birthday: u.birthday || undefined,
    schedule: u.schedule ? { text: u.schedule } : undefined,
    payType: u.payType,
    salary: u.salary != null ? Number(u.salary) : undefined,
    commissionRate: u.commissionRate != null ? Number(u.commissionRate) : undefined,
    avatarHue: u.avatarHue != null ? Number(u.avatarHue) : undefined,
  };
  if (isCreate && u.pin) {
    body.pin = u.pin;
  }
  return stripUndefined(body);
}

function initialsFor(name = '') {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

// Catalog item from backend → frontend shape (cat instead of categoryId)
function fromCatalogItem(it) {
  if (!it) return it;
  const promotions = (it.promotions ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    off: p.off,
    description: p.description ?? '',
  }));
  return {
    ...it,
    cat: it.categoryId ?? it.cat ?? null,
    price: it.price != null ? Number(it.price) : 0,
    cost: it.cost != null ? Number(it.cost) : 0,
    promotions,
  };
}

// Frontend catalog item → backend CreateCatalogItemDto
function toCatalogBody(it) {
  return stripUndefined({
    categoryId: it.cat ?? it.categoryId ?? undefined,
    type: it.type,
    name: it.name,
    price: it.price != null ? Number(it.price) : undefined,
    cost: it.cost != null ? Number(it.cost) : undefined,
    image: it.image,
    duration: it.duration,
    stock: it.stock != null ? Number(it.stock) : undefined,
    stockMin: it.stockMin != null ? Number(it.stockMin) : undefined,
    alertEnabled: it.alertEnabled,
    brand: it.brand,
    sku: it.sku,
    active: it.active,
  });
}

// Time entry: backend uses inAt/outAt (HH:MM:SS), frontend uses in/out (HH:MM)
function fromTimeEntry(t) {
  if (!t) return t;
  return {
    ...t,
    in: typeof t.inAt === 'string' ? t.inAt.slice(0, 5) : (t.in ?? null),
    out: typeof t.outAt === 'string' ? t.outAt.slice(0, 5) : (t.out ?? null),
    date: t.date,
    userId: t.userId,
    id: t.id,
  };
}

// Promotion: description ↔ desc, items → itemIds
function fromPromotion(p) {
  if (!p) return p;
  const items = (p.items ?? []).map((it) => it.id ?? it);
  return { ...p, desc: p.description ?? p.desc ?? '', itemIds: items };
}
function toPromotionBody(p) {
  return stripUndefined({
    name: p.name,
    description: p.desc ?? p.description,
    off: p.off,
    rule: p.rule,
    itemIds: p.itemIds,
    active: p.active,
  });
}

// Goal: description ↔ desc
function fromGoal(g) {
  if (!g) return g;
  return { ...g, desc: g.description ?? g.desc ?? '' };
}
function toGoalBody(g) {
  return stripUndefined({
    icon: g.icon,
    label: g.label,
    description: g.desc ?? g.description,
    metric: g.metric,
    unit: g.unit,
    target: g.target != null ? Number(g.target) : undefined,
    reward: g.reward,
    rewardType: g.rewardType,
    rewardValue: g.rewardValue != null ? Number(g.rewardValue) : undefined,
    tone: g.tone,
    resetPeriod: g.resetPeriod,
    active: g.active,
  });
}

function stripUndefined(obj) {
  const out = {};
  for (const k of Object.keys(obj)) {
    if (obj[k] !== undefined) out[k] = obj[k];
  }
  return out;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export const auth = {
  /** Email + password → { deviceToken, token, user, monthStats } */
  login: (email, password) =>
    http.post('/auth/login', { email, password }).then((r) => ({
      ...r.data,
      user: fromUser(r.data.user),
    })),

  /** PIN + deviceToken → { token, user, monthStats } */
  unlock: (pin) => {
    const deviceToken = import.meta.env.VITE_BYPASS_AUTH === 'true'
      ? '__dev__'
      : (getDeviceToken() || '');
    return http.post('/auth/unlock', { pin, deviceToken }).then((r) => ({
      ...r.data,
      user: fromUser(r.data.user),
    }));
  },

  /** Bloqueo de pantalla: revoca JWT, preserva device token */
  lock: () =>
    http.post('/auth/lock').catch(() => {}),

  /** Cierre completo: revoca device token */
  logout: () => {
    const deviceToken = getDeviceToken();
    if (!deviceToken) return Promise.resolve();
    return http.post('/auth/logout', { deviceToken }).catch(() => {});
  },

  /** Hidrata sesión desde token guardado en memoria */
  me: () =>
    http.get('/auth/me').then((r) => fromUser(r.data)),
};

// ─── Staff / Plantilla ───────────────────────────────────────────────────────

export const staff = {
  /** Lista mínima para hints del lockscreen (pública, sin token) */
  public: () =>
    axios.get(`${BASE}/staff/public`).then((r) => {
      const arr = Array.isArray(r.data) ? r.data : (r.data?.items ?? []);
      return arr.map((u) => ({
        id: u.id,
        name: u.name,
        role: u.role ?? 'empleado',
        initials: u.initials || initialsFor(u.name),
        color: u.color || '#999',
        avatarHue: u.avatarHue ?? 0,
        devPin: u.devPin ?? null,
      }));
    }),

  list: () =>
    http.get('/staff').then((r) => {
      const arr = Array.isArray(r.data) ? r.data : (r.data?.items ?? []);
      return arr.map(fromUser);
    }),

  create: (body) =>
    http.post('/staff', toUserBody(body, { isCreate: true })).then((r) => fromUser(r.data)),

  update: (id, body) =>
    http.patch(`/staff/${id}`, toUserBody(body)).then((r) => fromUser(r.data)),

  remove: (id) =>
    http.delete(`/staff/${id}`),

  updatePermissions: (id, body) =>
    http.patch(`/staff/${id}/permissions`, body).then((r) => fromUser(r.data)),

  changePin: (id, pin) =>
    http.patch(`/staff/${id}/pin`, { pin }),
};

// ─── Permisos ────────────────────────────────────────────────────────────────

export const permissions = {
  matrix: () =>
    http.get('/permissions').then((r) => {
      const arr = Array.isArray(r.data) ? r.data : (r.data?.permissions ?? []);
      return arr;
    }),

  setMatrix: (rows) =>
    http.put('/permissions', { rows }).then((r) => r.data),
};

// ─── Catálogo ────────────────────────────────────────────────────────────────

export const catalog = {
  /** Devuelve { categories, items } completo */
  get: () =>
    http.get('/catalog').then((r) => {
      const raw = r.data;
      if (Array.isArray(raw)) {
        return { categories: [], items: raw.map(fromCatalogItem) };
      }
      return {
        categories: raw.categories ?? [],
        items: (raw.items ?? []).map(fromCatalogItem),
      };
    }),

  createItem: (body) =>
    http.post('/catalog/items', toCatalogBody(body)).then((r) => fromCatalogItem(r.data)),

  updateItem: (id, body) =>
    http.patch(`/catalog/items/${id}`, toCatalogBody(body)).then((r) => fromCatalogItem(r.data)),

  deleteItem: (id) =>
    http.delete(`/catalog/items/${id}`),
};

// ─── Categorías ──────────────────────────────────────────────────────────────

export const categories = {
  list: () =>
    http.get('/categories').then((r) => {
      const arr = Array.isArray(r.data) ? r.data : (r.data?.items ?? []);
      return arr;
    }),

  create: (body) =>
    http.post('/categories', { label: body.label, ordering: body.ordering ?? 0 }).then((r) => r.data),

  update: (id, body) =>
    http.patch(`/categories/${id}`, stripUndefined({
      label: body.label,
      ordering: body.ordering,
    })).then((r) => r.data),

  remove: (id) =>
    http.delete(`/categories/${id}`),
};

// ─── Ventas ──────────────────────────────────────────────────────────────────

/**
 * Construye un body válido para CreateSaleDto del backend a partir del
 * carrito sencillo del POS frontend.
 * frontInput: { employeeId, lines: [{itemId, qty, price, discount?, itemType, itemName, basePrice}], payments, customer?, tip? }
 */
function toCreateSaleBody(s) {
  const lines = (s.lines ?? []).map((l) => stripUndefined({
    itemId: l.itemId,
    itemType: l.itemType ?? l.type ?? 'S',
    itemName: l.itemName ?? l.name ?? '',
    basePrice: l.basePrice != null ? Number(l.basePrice) : Number(l.price ?? 0),
    price: Number(l.price ?? l.basePrice ?? 0),
    qty: Number(l.qty ?? 1),
    discountKind: l.discount?.kind ?? l.discountKind ?? undefined,
    discountValue: l.discount?.value != null
      ? Number(l.discount.value)
      : (l.discountValue != null ? Number(l.discountValue) : undefined),
    discountById: l.discount?.byId ?? l.discountById,
    promoId: l.discount?.promoId ?? l.promoId ?? undefined,
  }));

  const subtotal = lines.reduce((acc, l) => acc + (Number(l.basePrice) * Number(l.qty)), 0);
  const totalLines = lines.reduce((acc, l) => acc + (Number(l.price) * Number(l.qty)), 0);
  const discountTotal = +(subtotal - totalLines).toFixed(2);
  const tip = s.tip != null ? Number(s.tip) : 0;
  const total = +(totalLines + tip).toFixed(2);

  return stripUndefined({
    employeeId: s.employeeId,
    customerName: s.customer?.name,
    customerPhone: s.customer?.phone,
    customerIsNew: s.customer?.isNew,
    subtotal: +subtotal.toFixed(2),
    discountTotal,
    total,
    tip,
    lines,
    payments: (s.payments ?? []).map((p) => stripUndefined({
      method: p.method,
      amount: Number(p.amount),
      cardLast4: p.cardLast4,
      cardBrand: p.cardBrand,
      authCode: p.authCode,
    })),
  });
}

// Backend returns employee as nested object, createdAt as ISO timestamp,
// and numeric columns (total, price, etc.) as strings from PostgreSQL.
function fromSaleItem(s) {
  if (!s) return s;
  const iso = s.createdAt ?? '';
  const [dateStr, timeRaw] = iso.split('T');
  return {
    ...s,
    employeeName: s.employee?.name ?? s.employeeName ?? null,
    date: dateStr ?? null,
    time: timeRaw ? timeRaw.slice(0, 5) : null,
    voided: s.status === 'voided',
    total: s.total != null ? Number(s.total) : 0,
    subtotal: s.subtotal != null ? Number(s.subtotal) : 0,
    tip: s.tip != null ? Number(s.tip) : 0,
    discountTotal: s.discountTotal != null ? Number(s.discountTotal) : 0,
    lines: (s.lines ?? []).map((l) => ({
      ...l,
      price: l.price != null ? Number(l.price) : 0,
      basePrice: l.basePrice != null ? Number(l.basePrice) : 0,
      discountValue: l.discountValue != null ? Number(l.discountValue) : 0,
      qty: l.qty != null ? Number(l.qty) : 1,
    })),
    payments: (s.payments ?? []).map((p) => ({
      ...p,
      amount: p.amount != null ? Number(p.amount) : 0,
    })),
  };
}

export const sales = {
  create: (body) =>
    http.post('/sales', toCreateSaleBody(body)).then((r) => r.data),

  list: (params) => {
    // Extend `to` to end-of-day so sales made on the last selected date are included.
    const p = params?.to ? { ...params, to: params.to + 'T23:59:59' } : params;
    return http.get('/sales', { params: p }).then((r) => {
      const raw = r.data;
      if (Array.isArray(raw)) return { items: raw.map(fromSaleItem), total: raw.length };
      return { ...raw, items: (raw.items ?? []).map(fromSaleItem) };
    });
  },

  get: (id) =>
    http.get(`/sales/${id}`).then((r) => fromSaleItem(r.data)),

  /** Anular venta (admin). Revierte stock. */
  void: (id) =>
    http.post(`/sales/${id}/void`).then((r) => r.data),
};

// ─── Inventario ──────────────────────────────────────────────────────────────

export const inventory = {
  /**
   * Entrada de compra.
   * body: { productId, qty, unitCost?, supplier?, invoice?, notes? }
   */
  addEntry: (body) =>
    http.post('/inventory/entries', stripUndefined({
      productId: body.productId,
      kind: 'purchase',
      qtyDelta: Number(body.qty ?? body.qtyDelta ?? 0),
      unitCost: body.unitCost != null ? Number(body.unitCost) : undefined,
      totalCost: body.totalCost != null ? Number(body.totalCost) : undefined,
      supplier: body.supplier,
      invoice: body.invoice,
      notes: body.notes,
    })).then((r) => r.data),

  /**
   * Ajuste manual.
   * body: { productId, mode: 'set'|'delta', value, reason?, notes? }
   */
  adjust: (body) =>
    http.post('/inventory/adjustments', stripUndefined({
      productId: body.productId,
      mode: body.mode,
      value: Number(body.value ?? 0),
      reason: body.reason ?? 'conteo',
      notes: body.notes,
    })).then((r) => r.data),

  /** Bitácora histórica de movimientos */
  entries: (productId, params) =>
    http.get('/inventory/entries', { params: { productId, ...params } }).then((r) => {
      const raw = r.data;
      if (Array.isArray(raw)) return { items: raw, total: raw.length };
      return raw;
    }),
};

// ─── Asistencia / Checador ───────────────────────────────────────────────────

export const timeclock = {
  today: () =>
    http.get('/timeclock/today').then((r) => {
      const arr = Array.isArray(r.data) ? r.data : (r.data?.entries ?? []);
      return { entries: arr.map(fromTimeEntry) };
    }),

  punchIn: () =>
    http.post('/timeclock/punch-in').then((r) => fromTimeEntry(r.data)),

  punchOut: () =>
    http.post('/timeclock/punch-out').then((r) => fromTimeEntry(r.data)),

  editEntry: (id, body) =>
    http.patch(`/timeclock/entries/${id}`, stripUndefined({
      inAt: body.in ?? body.inAt,
      outAt: body.out ?? body.outAt,
    })).then((r) => fromTimeEntry(r.data)),

  history: (params) =>
    http.get('/timeclock/history', { params }).then((r) => {
      const arr = Array.isArray(r.data) ? r.data : (r.data?.items ?? []);
      return arr.map(fromTimeEntry);
    }),

  /** Resumen de horas por empleado. range: 'week'|'biweek'|'month' */
  summary: (params) =>
    http.get('/timeclock/summary', { params }).then((r) => {
      const arr = Array.isArray(r.data) ? r.data : (r.data?.items ?? []);
      return arr.map((row) => ({
        ...row,
        entries: (row.entries ?? []).map(fromTimeEntry),
      }));
    }),
};

// ─── Metas / Bonos ───────────────────────────────────────────────────────────

export const goals = {
  list: () =>
    http.get('/goals').then((r) => {
      const arr = Array.isArray(r.data) ? r.data : (r.data?.items ?? []);
      return arr.map(fromGoal);
    }),

  /** Progreso del usuario en sus metas activas */
  progress: (userId = 'me') =>
    http.get('/goals/progress', { params: { userId } }).then((r) => {
      const raw = r.data;
      const list = raw.goals ?? raw.items ?? raw ?? [];
      return {
        stats: raw.stats ?? null,
        goals: list.map((g) => {
          if (g.goal) {
            return {
              ...fromGoal(g.goal),
              current: g.value,
              pct: g.pct,
              achieved: g.achieved,
              earned: g.earned,
            };
          }
          return fromGoal(g);
        }),
      };
    }),

  create: (body) =>
    http.post('/goals', toGoalBody(body)).then((r) => fromGoal(r.data)),

  update: (id, body) =>
    http.patch(`/goals/${id}`, toGoalBody(body)).then((r) => fromGoal(r.data)),

  remove: (id) =>
    http.delete(`/goals/${id}`),
};

// ─── Promociones ─────────────────────────────────────────────────────────────

export const promotions = {
  list: () =>
    http.get('/promotions').then((r) => {
      const arr = Array.isArray(r.data) ? r.data : (r.data?.items ?? []);
      return arr.map(fromPromotion);
    }),

  create: (body) =>
    http.post('/promotions', toPromotionBody(body)).then((r) => fromPromotion(r.data)),

  update: (id, body) =>
    http.patch(`/promotions/${id}`, toPromotionBody(body)).then((r) => fromPromotion(r.data)),

  remove: (id) =>
    http.delete(`/promotions/${id}`),
};

// ─── Alertas ─────────────────────────────────────────────────────────────────

export const alerts = {
  /** Devuelve { summary, lowStock, discountReviews, slowMovers, promotions } */
  list: (params) =>
    http.get('/alerts', { params }).then((r) => {
      const raw = r.data ?? {};
      const lowStock = (raw.lowStock ?? []).map((it) => ({
        ...it,
        productId: it.productId ?? it.id,
        minStock: it.minStock ?? it.stockMin,
      }));
      const discountReviews = raw.discountReviews ?? [];
      const slowMovers = (raw.slowMovers ?? []).map((s) => ({
        ...s,
        basePrice: s.basePrice != null ? Number(s.basePrice) : 0,
        stock: s.stock ?? 0,
        suggested: s.suggested ?? { kind: s.suggestedOfferKind ?? 'percent', value: s.suggestedOfferValue ?? 10 },
        live: s.live ?? s.offerActive ?? false,
      }));
      const promotions = (raw.promotions ?? []).map(fromPromotion);
      return {
        summary: raw.summary ?? {
          lowStock: lowStock.length,
          discountReviews: discountReviews.length,
          slowMovers: slowMovers.length,
          promotions: promotions.length,
        },
        lowStock,
        discountReviews,
        slowMovers,
        promotions,
      };
    }),

  resolve: (alertId, notes) =>
    http.post(`/alerts/${alertId}/resolve`, stripUndefined({ notes })),

  snooze: (alertId, until) =>
    http.post(`/alerts/${alertId}/snooze`, {
      snoozedUntil: typeof until === 'string' ? until : new Date(until).toISOString(),
    }),

  reopen: (alertId) =>
    http.post(`/alerts/${alertId}/reopen`),

  /** Configuración global de alertas de stock */
  setStockConfig: (body) =>
    http.put('/alerts/stock-config', {
      defaultMinStock: Number(body.defaultMinStock ?? 0),
      enabledByDefault: !!body.enabledByDefault,
    }).then((r) => r.data),

  /** Edita oferta sugerida de producto sin movimiento */
  updateSlowMover: (id, body) => {
    const kind = body.suggestedOfferKind ?? body.offer_kind ?? body.kind;
    const rawValue = body.suggestedOfferValue ?? body.offer_value ?? body.value;
    const active = body.offerActive ?? body.offer_active ?? body.active;
    return http.patch(`/alerts/slow-movers/${id}`, stripUndefined({
      suggestedOfferKind: kind,
      suggestedOfferValue: rawValue != null ? Number(rawValue) : undefined,
      offerActive: active,
    })).then((r) => r.data);
  },

  /** Actualiza configuración de alerta de stock por producto */
  updateProductStockAlert: (id, body) => {
    return http.patch(`/alerts/stock-config/${id}`, stripUndefined({
      alertEnabled: body.alertEnabled,
      stockMin: body.stockMin != null ? Number(body.stockMin) : undefined,
    })).then((r) => r.data);
  },
};

// ─── Nómina ──────────────────────────────────────────────────────────────────

export const payroll = {
  /**
   * month: 'YYYY-MM'
   * period: 'biweek' | 'month'
   */
  get: (month, period = 'biweek') =>
    http.get('/payroll', { params: { month, period } }).then((r) => r.data),
};

// ─── Analíticas ──────────────────────────────────────────────────────────────

// Map backend analytics shapes to frontend expectations (es-MX field names)
function fromSalesByDay(arr) {
  return (arr ?? []).map((d) => {
    const ventas = Number(d.sales ?? d.ventas ?? 0);
    const costos = Number(d.cost ?? d.costos ?? 0);
    return {
      date: d.date,
      label: d.label ?? formatDayLabel(d.date),
      ventas,
      costos,
      utilidad: Number(d.profit ?? d.utilidad ?? (ventas - costos)),
      tickets: Number(d.tickets ?? 0),
    };
  });
}

function formatDayLabel(date) {
  if (!date) return '';
  const [, m, day] = date.split('-');
  return `${parseInt(day, 10)}/${parseInt(m, 10)}`;
}

const PALETTE = ['#de0fab', '#0fb0de', '#7b2cbf', '#f59e0b', '#10b981', '#64748b', '#ef4444', '#0ea5e9'];

function fromCategoryRevenue(arr) {
  return (arr ?? []).map((c, i) => ({
    name: c.name ?? c.category ?? 'Sin categoría',
    value: Number(c.value ?? c.revenue ?? 0),
    color: c.color ?? PALETTE[i % PALETTE.length],
  }));
}

function fromTopEmployees(arr) {
  return (arr ?? []).map((e) => ({
    name: e.name,
    ventas: Number(e.ventas ?? e.total ?? 0),
    servicios: Number(e.servicios ?? e.tickets ?? 0),
    employeeId: e.employeeId ?? e.id,
  }));
}

function fromHourlyTraffic(arr) {
  return (arr ?? []).map((h) => ({
    hour: typeof h.hour === 'number' ? String(h.hour) : h.hour,
    clientes: Number(h.clientes ?? h.count ?? 0),
  }));
}

function fromKpis(raw) {
  if (!raw) return { items: [] };
  if (Array.isArray(raw)) return { items: raw };
  // Translate flat KPI object into items[] structure for any consumer
  const totalSales = Number(raw.totalSales ?? 0);
  const totalProfit = Number(raw.totalProfit ?? 0);
  const margin = Number(raw.margin ?? 0);
  const avgTicket = Number(raw.avgTicket ?? 0);
  const ticketCount = Number(raw.ticketCount ?? 0);
  const salesDelta = Number(raw.salesDelta ?? 0);
  return {
    ...raw,
    items: [
      { label: 'Ventas totales', value: totalSales, delta: salesDelta, tone: salesDelta >= 0 ? 'up' : 'down' },
      { label: 'Utilidad neta', value: totalProfit, delta: null, tone: 'up' },
      { label: 'Margen', value: margin, delta: null, tone: 'up' },
      { label: 'Ticket promedio', value: avgTicket, delta: null, tone: 'up' },
      { label: 'Tickets', value: ticketCount, delta: null, tone: 'up' },
    ],
  };
}

// Build query params: accepts string range OR {range?, from?, to?}
function toAnalyticsParams(p) {
  if (!p || typeof p === 'string') return p ? { range: p } : { range: '30d' };
  return p;
}

export const analytics = {
  /** Ventas/costos/utilidad por día. range '30d' | 'today' | {from,to} */
  salesByDay: (params = '30d') =>
    http.get('/analytics/sales-by-day', { params: toAnalyticsParams(params) }).then((r) => ({
      items: fromSalesByDay(Array.isArray(r.data) ? r.data : r.data?.items),
    })),

  /** Mix por categoría (pie chart) */
  categoryRevenue: (params = '30d') =>
    http.get('/analytics/category-revenue', { params: toAnalyticsParams(params) }).then((r) => ({
      items: fromCategoryRevenue(Array.isArray(r.data) ? r.data : r.data?.items),
    })),

  /** Top empleados por ventas */
  topEmployees: (params = '30d') =>
    http.get('/analytics/top-employees', { params: toAnalyticsParams(params) }).then((r) => ({
      items: fromTopEmployees(Array.isArray(r.data) ? r.data : r.data?.items),
    })),

  /** Tráfico por hora en una fecha */
  hourlyTraffic: (date) =>
    http.get('/analytics/hourly-traffic', { params: { date } }).then((r) => ({
      items: fromHourlyTraffic(Array.isArray(r.data) ? r.data : r.data?.items),
    })),

  /** KPIs con deltas vs periodo anterior */
  kpis: (params = '30d') =>
    http.get('/analytics/kpis', { params: toAnalyticsParams(params) }).then((r) => fromKpis(r.data)),
};

// ─── Reportes (backend-side, opcionales) ─────────────────────────────────────

export const reports = {
  /**
   * type: 'sales'|'inventory'|'payroll'|'attendance'|'top-categories'|'hours-worked'|'executive'
   * Devuelve Blob para descargar
   */
  excel: (type, params) =>
    http.get(`/reports/${type}/excel`, { params, responseType: 'blob' }).then((r) => r.data),

  pdf: (type, params) =>
    http.get(`/reports/${type}/pdf`, { params, responseType: 'blob' }).then((r) => r.data),
};

// ─── Subida de archivos ───────────────────────────────────────────────────────

export const upload = {
  /** Sube una imagen y devuelve { key, signedUrl }. Guardar key en BD; signedUrl para preview inmediato. */
  image: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    const token = getToken();
    return http
      .post('/upload/image', fd, token ? { headers: { Authorization: `Bearer ${token}` } } : {})
      .then((r) => r.data);
  },
};

// ─── Ajustes ─────────────────────────────────────────────────────────────────

export const settings = {
  get: () =>
    http.get('/settings').then((r) => r.data),

  /** Acepta objeto plano {key: value} y lo transforma al formato del backend [{key, value}] */
  update: (body) => {
    const arr = Array.isArray(body)
      ? body
      : Object.entries(body ?? {}).map(([key, value]) => ({
        key,
        value: typeof value === 'object' && value !== null ? value : { value },
      }));
    return http.put('/settings', arr).then((r) => r.data);
  },

  backup: () =>
    http.post('/settings/backup').then((r) => r.data),
};

// ─── Preferencias del usuario (sync entre terminales, opcional) ───────────────

export const prefs = {
  get: () =>
    http.get('/me/preferences').then((r) => r.data),

  update: (body) =>
    http.put('/me/preferences', { value: body }).then((r) => r.data),
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Extrae el mensaje de error del backend en formato estándar:
 * { error: { code, message, fields? } } o { message }
 */
export function apiError(err) {
  const data = err.response?.data;
  if (data?.error?.message) return data.error.message;
  if (typeof data?.message === 'string') return data.message;
  if (Array.isArray(data?.message)) return data.message.join(' · ');
  return err.message ?? 'Error desconocido';
}

/**
 * Descarga un Blob como archivo.
 * Usado por los botones PDF/Excel de la pantalla de reportes.
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
