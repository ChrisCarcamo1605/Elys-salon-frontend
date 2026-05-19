export const fmtMoney = (v) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(+v || 0);
