import axios from 'axios';

const BASE = 'http://localhost:3001/api';

// ─── HTTP client ──────────────────────────────────────────────────────────────

const http = axios.create({ baseURL: BASE });

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
      clearToken();
      window.dispatchEvent(new CustomEvent('elys:session-expired'));
    }
    return Promise.reject(err);
  }
);

// ─── Token store (memory only — never localStorage) ──────────────────────────

let _token = null;

export function setToken(t)  { _token = t; }
export function clearToken() { _token = null; }
export function getToken()   { return _token; }

// ─── Auth ────────────────────────────────────────────────────────────────────

export const auth = {
  /** Verifica PIN → devuelve { token, expiresAt, user } */
  unlock: (pin) =>
    http.post('/auth/unlock', { pin }).then((r) => r.data),

  /** Invalida el token actual (auditoría). No lanza si falla. */
  lock: () =>
    http.post('/auth/lock').catch(() => {}),

  /** Hidrata sesión desde token guardado en memoria */
  me: () =>
    http.get('/auth/me').then((r) => r.data.user),
};

// ─── Staff / Plantilla ───────────────────────────────────────────────────────

export const staff = {
  /** Lista mínima para hints del lockscreen (pública, sin token) */
  public: () =>
    axios.get(`${BASE}/staff/public`).then((r) => r.data.items),

  list: () =>
    http.get('/staff').then((r) => r.data.items),

  create: (body) =>
    http.post('/staff', body).then((r) => r.data),

  update: (id, body) =>
    http.patch(`/staff/${id}`, body).then((r) => r.data),

  remove: (id) =>
    http.delete(`/staff/${id}`),

  updatePermissions: (id, body) =>
    http.patch(`/staff/${id}/permissions`, body).then((r) => r.data),
};

// ─── Permisos ────────────────────────────────────────────────────────────────

export const permissions = {
  matrix: () =>
    http.get('/permissions').then((r) => r.data.permissions),

  setMatrix: (permissions) =>
    http.put('/permissions', { permissions }).then((r) => r.data),
};

// ─── Catálogo ────────────────────────────────────────────────────────────────

export const catalog = {
  /** Devuelve { categories, items } completo — FE filtra en cliente */
  get: () =>
    http.get('/catalog').then((r) => r.data),

  createItem: (body) =>
    http.post('/catalog/items', body).then((r) => r.data),

  updateItem: (id, body) =>
    http.patch(`/catalog/items/${id}`, body).then((r) => r.data),

  deleteItem: (id) =>
    http.delete(`/catalog/items/${id}`),
};

// ─── Categorías ──────────────────────────────────────────────────────────────

export const categories = {
  list: () =>
    http.get('/categories').then((r) => r.data.items),

  create: (body) =>
    http.post('/categories', body).then((r) => r.data),

  update: (id, body) =>
    http.patch(`/categories/${id}`, body).then((r) => r.data),

  remove: (id) =>
    http.delete(`/categories/${id}`),
};

// ─── Ventas ──────────────────────────────────────────────────────────────────

export const sales = {
  /**
   * Registra una venta completa.
   * body: { employeeId, customer?, lines, payments, tip? }
   * Devuelve Sale completo con number consecutivo.
   */
  create: (body) =>
    http.post('/sales', body).then((r) => r.data),

  list: (params) =>
    http.get('/sales', { params }).then((r) => r.data),

  get: (id) =>
    http.get(`/sales/${id}`).then((r) => r.data),

  /** Anular venta (admin). Revierte stock. */
  void: (id) =>
    http.post(`/sales/${id}/void`).then((r) => r.data),
};

// ─── Inventario ──────────────────────────────────────────────────────────────

export const inventory = {
  /**
   * Entrada de compra.
   * body: { productId, qty, unitCost?, supplier?, invoice?, date?, notes? }
   */
  addEntry: (body) =>
    http.post('/inventory/entries', body).then((r) => r.data),

  /**
   * Ajuste manual.
   * body: { productId, mode: 'set'|'delta', value, reason?, notes? }
   */
  adjust: (body) =>
    http.post('/inventory/adjustments', body).then((r) => r.data),

  /** Bitácora histórica de movimientos */
  entries: (productId, params) =>
    http.get('/inventory/entries', { params: { productId, ...params } }).then((r) => r.data),
};

// ─── Asistencia / Checador ───────────────────────────────────────────────────

export const timeclock = {
  today: () =>
    http.get('/timeclock/today').then((r) => r.data),

  punchIn: () =>
    http.post('/timeclock/punch-in').then((r) => r.data),

  punchOut: () =>
    http.post('/timeclock/punch-out').then((r) => r.data),

  editEntry: (id, body) =>
    http.patch(`/timeclock/entries/${id}`, body).then((r) => r.data),

  history: (params) =>
    http.get('/timeclock/history', { params }).then((r) => r.data),

  /** Resumen de horas por empleada. range: 'week'|'biweek'|'month' */
  summary: (params) =>
    http.get('/timeclock/summary', { params }).then((r) => r.data),
};

// ─── Metas / Bonos ───────────────────────────────────────────────────────────

export const goals = {
  list: () =>
    http.get('/goals').then((r) => r.data.items),

  /** Progreso del usuario en sus metas activas */
  progress: (userId = 'me') =>
    http.get('/goals/progress', { params: { userId } }).then((r) => r.data),

  create: (body) =>
    http.post('/goals', body).then((r) => r.data),

  update: (id, body) =>
    http.patch(`/goals/${id}`, body).then((r) => r.data),

  remove: (id) =>
    http.delete(`/goals/${id}`),
};

// ─── Promociones ─────────────────────────────────────────────────────────────

export const promotions = {
  list: () =>
    http.get('/promotions').then((r) => r.data.items),

  create: (body) =>
    http.post('/promotions', body).then((r) => r.data),

  update: (id, body) =>
    http.patch(`/promotions/${id}`, body).then((r) => r.data),

  remove: (id) =>
    http.delete(`/promotions/${id}`),
};

// ─── Alertas ─────────────────────────────────────────────────────────────────

export const alerts = {
  /** Devuelve { summary, lowStock, discountReviews, slowMovers, promotions } */
  list: (params) =>
    http.get('/alerts', { params }).then((r) => r.data),

  resolve: (alertId, notes) =>
    http.post(`/alerts/${alertId}/resolve`, { notes }),

  snooze: (alertId, until) =>
    http.post(`/alerts/${alertId}/snooze`, { until }),

  reopen: (alertId) =>
    http.post(`/alerts/${alertId}/reopen`),

  /** Configuración global de alertas de stock */
  setStockConfig: (body) =>
    http.put('/alerts/stock-config', body).then((r) => r.data),

  /** Edita oferta sugerida de producto sin movimiento */
  updateSlowMover: (id, body) =>
    http.patch(`/alerts/slow-movers/${id}`, body).then((r) => r.data),
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

export const analytics = {
  /** Ventas/costos/utilidad por día. range ej: '30d' */
  salesByDay: (range = '30d') =>
    http.get('/analytics/sales-by-day', { params: { range } }).then((r) => r.data),

  /** Mix por categoría (pie chart) */
  categoryRevenue: (range = '30d') =>
    http.get('/analytics/category-revenue', { params: { range } }).then((r) => r.data),

  /** Top empleadas por ventas */
  topEmployees: (range = '30d') =>
    http.get('/analytics/top-employees', { params: { range } }).then((r) => r.data),

  /** Tráfico por hora en una fecha */
  hourlyTraffic: (date) =>
    http.get('/analytics/hourly-traffic', { params: { date } }).then((r) => r.data),

  /** KPIs con deltas vs periodo anterior */
  kpis: (range = '30d') =>
    http.get('/analytics/kpis', { params: { range } }).then((r) => r.data),
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

// ─── Ajustes ─────────────────────────────────────────────────────────────────

export const settings = {
  get: () =>
    http.get('/settings').then((r) => r.data),

  update: (body) =>
    http.put('/settings', body).then((r) => r.data),

  backup: () =>
    http.post('/settings/backup').then((r) => r.data),
};

// ─── Preferencias del usuario (sync entre terminales, opcional) ───────────────

export const prefs = {
  get: () =>
    http.get('/me/preferences').then((r) => r.data),

  update: (body) =>
    http.put('/me/preferences', body).then((r) => r.data),
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Extrae el mensaje de error del backend en formato estándar:
 * { error: { code, message, fields? } }
 */
export function apiError(err) {
  return err.response?.data?.error?.message
    ?? err.response?.data?.message
    ?? err.message
    ?? 'Error desconocido';
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
