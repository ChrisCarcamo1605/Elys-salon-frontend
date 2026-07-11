import React from 'react';
import { Icons } from './icons.jsx';
import { TopBar } from './menu.jsx';
import { catalog as catalogApi, sales as salesApi, apiError } from './api.js';
import { fmtMoney } from './utils.js';

function parsePromoOff(off) {
  if (!off) return null;
  const pct = off.match(/^(\d+(?:\.\d+)?)\s*%/);
  if (pct) return { kind: 'percent', value: parseFloat(pct[1]) };
  const amt = off.match(/^\$?\s*(\d+(?:\.\d+)?)\s*(?:off)?$/i);
  if (amt) return { kind: 'amount', value: parseFloat(amt[1]) };
  return null;
}

function SaleScreen({ user, onLock, onBack, onComplete, lockAfterSale = true }) {
  const isAdmin = user.role === "admin";
  const canDiscount = isAdmin || user.permissions?.['tickets.discount'] === true;
  const [items, setItems] = React.useState([]);
  const [categories, setCategories] = React.useState([]);
  const [cat, setCat] = React.useState(null);
  const [query, setQuery] = React.useState("");
  const [cart, setCart] = React.useState([]);
  const [discountFor, setDiscountFor] = React.useState(null);
  const [payOpen, setPayOpen] = React.useState(false);
  const [cartOpen, setCartOpen] = React.useState(false);
  const [customerName, setCustomerName] = React.useState("");
  const cartRef = React.useRef(null);
  const cartHeadRef = React.useRef(null);
  const cartTouch = React.useRef(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    catalogApi.get().then((d) => {
      setItems(d.items);
      setCategories(d.categories);
      if (d.categories.length > 0) setCat(d.categories[0].id);
    }).catch(() => {});
  }, []);

  const visible = cat ? items.filter(
    (p) =>
      (!query
        ? p.cat === cat
        : (p.name + " " + p.cat).toLowerCase().includes(query.toLowerCase()))
  ) : [];

  const addToCart = (p) => {
    const promo = p.promotions && p.promotions.length > 0 ? p.promotions[0] : null;
    const parsed = promo ? parsePromoOff(promo.off) : null;
    setCart((c) => {
      const idx = c.findIndex((x) => x.id === p.id);
      if (idx >= 0) {
        const copy = [...c];
        copy[idx] = { ...copy[idx], qty: copy[idx].qty + 1 };
        return copy;
      }
      const basePrice = p.price;
      let price = basePrice;
      let discount = null;
      if (promo && parsed) {
        price =
          parsed.kind === "amount"
            ? Math.max(0, +(basePrice - parsed.value).toFixed(2))
            : Math.max(0, +(basePrice * (1 - parsed.value / 100)).toFixed(2));
        discount = {
          kind: parsed.kind,
          value: parsed.value,
          saved: +(basePrice - price).toFixed(2),
          promoName: promo.name,
          promoOff: promo.off,
          promoId: promo.id,
        };
      }
      return [
        ...c,
        {
          id: p.id,
          name: p.name,
          basePrice,
          price,
          qty: 1,
          type: p.type,
          duration: p.duration,
          discount,
        },
      ];
    });
  };

  const setQty = (id, delta) =>
    setCart((c) =>
      c
        .map((l) => (l.id === id ? { ...l, qty: l.qty + delta } : l))
        .filter((l) => l.qty > 0)
    );

  const removeLine = (id) => setCart((c) => c.filter((l) => l.id !== id));

  const applyDiscount = (id, kind, value, mode = 'discount') => {
    setCart((c) =>
      c.map((l) => {
        if (l.id !== id) return l;
        if (!kind) return { ...l, price: l.basePrice, discount: null };
        let newPrice;
        if (mode === 'surcharge') {
          newPrice = kind === "amount"
            ? +(l.basePrice + value).toFixed(2)
            : +(l.basePrice * (1 + value / 100)).toFixed(2);
        } else {
          newPrice = kind === "amount"
            ? Math.max(0, +(l.basePrice - value).toFixed(2))
            : Math.max(0, +(l.basePrice * (1 - value / 100)).toFixed(2));
        }
        return {
          ...l,
          price: newPrice,
          discount: { kind, value, mode, saved: +(l.basePrice - newPrice).toFixed(2) },
        };
      })
    );
    setDiscountFor(null);
  };

  const subtotal = cart.reduce((s, l) => s + l.basePrice * l.qty, 0);
  const savings = cart.reduce(
    (s, l) => s + ((l.discount ? l.discount.saved : 0) * l.qty),
    0
  );
  const total = +(subtotal - savings).toFixed(2);
  const itemCount = cart.reduce((s, l) => s + l.qty, 0);

  const finishSale = async (cash, card) => {
    const body = {
      employeeId: user.id,
      lines: cart.map((l) => ({
        itemId: l.id,
        itemType: l.type,
        itemName: l.name,
        basePrice: l.basePrice,
        price: l.price,
        qty: l.qty,
        ...(l.discount ? { discount: l.discount } : {}),
      })),
      payments: [
        ...(+cash > 0 ? [{ method: 'cash', amount: +cash }] : []),
        ...(+card > 0 ? [{ method: 'card', amount: +card }] : []),
      ],
      ...(customerName ? { customer: { name: customerName, isNew: false } } : {}),
    };
    setLoading(true);
    try {
      await salesApi.create(body);
      setPayOpen(false);
      setCart([]);
      onComplete({ total, items: itemCount });
    } catch (err) {
      alert(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  const discLine = cart.find((l) => l.id === discountFor);

  const onCartTouchStart = (e) => {
    const el = cartRef.current;
    if (!el) return;
    e.preventDefault(); // prevent click from also firing after touch
    cartTouch.current = { startY: e.touches[0].clientY, startOpen: cartOpen, lastDy: 0, moved: false };
    el.style.transition = 'none';
  };

  const onCartTouchMove = (e) => {
    const t = cartTouch.current;
    if (!t) return;
    e.preventDefault();
    const dy = e.touches[0].clientY - t.startY;
    t.lastDy = dy;
    if (Math.abs(dy) > 6) t.moved = true;
    const el = cartRef.current;
    const maxSlide = el.offsetHeight - 66;
    const base = t.startOpen ? 0 : maxSlide;
    const clamped = Math.max(0, Math.min(maxSlide, base + dy));
    el.style.transform = `translateY(${clamped}px)`;
  };

  const onCartTouchEnd = () => {
    const t = cartTouch.current;
    if (!t) return;
    cartTouch.current = null;
    const el = cartRef.current;
    el.style.transition = '';
    el.style.transform = '';
    if (!t.moved) {
      setCartOpen((o) => !o);
      return;
    }
    const maxSlide = el.offsetHeight - 66;
    const dy = t.lastDy;
    if (t.startOpen) {
      setCartOpen(dy < maxSlide * 0.35);
    } else {
      setCartOpen(dy < -(maxSlide * 0.3));
    }
  };

  // React 18 registra los listeners de touch de JSX como pasivos, así que
  // preventDefault() dentro de onTouchStart/onTouchMove no hace nada: el tap
  // togglea la bandeja por el touch handler y luego el click sintético que
  // el navegador dispara después la vuelve a togglear, cancelándose entre sí.
  // Con listeners nativos {passive:false} preventDefault sí aplica.
  React.useEffect(() => {
    const el = cartHeadRef.current;
    if (!el) return;
    el.addEventListener('touchstart', onCartTouchStart, { passive: false });
    el.addEventListener('touchmove', onCartTouchMove, { passive: false });
    el.addEventListener('touchend', onCartTouchEnd, { passive: false });
    return () => {
      el.removeEventListener('touchstart', onCartTouchStart);
      el.removeEventListener('touchmove', onCartTouchMove);
      el.removeEventListener('touchend', onCartTouchEnd);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartOpen]);

  return (
    <div className="screen sale-screen">
      <TopBar
        user={user}
        title="Registrar venta"
        onLock={onLock}
        onBack={onBack}
        right={
          <div className="sale-context">
            <Icons.Receipt size={14} />
            Ticket #{1247 + Math.floor((Date.now() / 60000) % 99)}
          </div>
        }
      />

      <div className="sale-body">
        <section className="catalog">
          <div className="catalog-head">
            <div className="search">
              <Icons.Search size={16} />
              <input
                placeholder="Buscar producto o servicio…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button className="search-clear" onClick={() => setQuery("")}>
                  <Icons.X size={14} />
                </button>
              )}
            </div>
          </div>

          {!query && (
            <div className="tabs">
              {categories.map((c) => (
                <button
                  key={c.id}
                  className={`tab ${cat === c.id ? "active" : ""}`}
                  onClick={() => setCat(c.id)}
                >
                  {c.label}
                </button>
              ))}
            </div>
          )}

          <div className="catalog-grid">
            {visible.map((p) => {
              const inCart = cart.find((l) => l.id === p.id);
              const promo = p.promotions && p.promotions.length > 0 ? p.promotions[0] : null;
              return (
                <button
                  key={p.id}
                  className={`prod ${inCart ? "in-cart" : ""}`}
                  onClick={() => addToCart(p)}
                >
                  <div
                    className="prod-image"
                    style={{ backgroundImage: `url(${p.image})` }}
                  >
                    <div className="prod-image-overlay">
                      <span className={`prod-type t-${p.type}`}>
                        {p.type === "S" ? "Servicio" : "Producto"}
                      </span>
                      {promo && (
                        <span className="prod-promo-badge" title={promo.name}>{promo.off}</span>
                      )}
                      {inCart && (
                        <div className="prod-qty-badge">
                          {inCart.qty} <Icons.Check size={11} />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="prod-body">
                    <div className="prod-name">{p.name}</div>
                    {promo && (
                      <div style={{ fontSize: 10, color: 'var(--magenta)', fontWeight: 600, marginTop: 1, marginBottom: 1 }}>
                        {promo.name}
                      </div>
                    )}
                    <div className="prod-meta">
                      {p.duration && (
                        <span className="prod-dur">
                          <Icons.Clock size={11} /> {p.duration}
                        </span>
                      )}
                      {p.stock != null && (
                        <span className={`prod-stock ${p.stock < (p.stockMin || 8) ? "low" : ""}`}>
                          {p.stock} en stock
                        </span>
                      )}
                    </div>
                    <div className="prod-bottom">
                      <div className="prod-price">
                        {promo ? (
                          <>
                            <s>{fmtMoney(p.price)}</s>{" "}
                            <span className="prod-promo-price">
                              {fmtMoney(parsePromoOff(promo.off)
                                ? parsePromoOff(promo.off).kind === "amount"
                                  ? +(p.price - parsePromoOff(promo.off).value).toFixed(2)
                                  : +(p.price * (1 - parsePromoOff(promo.off).value / 100)).toFixed(2)
                                : p.price)}
                            </span>
                          </>
                        ) : (
                          <>{fmtMoney(p.price)}</>
                        )}
                      </div>
                      {inCart ? (
                        <div className="prod-qty">{inCart.qty} ×</div>
                      ) : (
                        <div className="prod-add">
                          <Icons.Plus size={14} /> Agregar
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
            {visible.length === 0 && (
              <div className="empty-cat">
                Sin resultados para "<b>{query}</b>"
              </div>
            )}
          </div>
        </section>

        <aside className={`cart ${cartOpen ? "open" : ""}`} ref={cartRef}>
          <div
            className="cart-head"
            ref={cartHeadRef}
            onClick={() => setCartOpen((o) => !o)}
          >
            <div className="cart-title">
              <Icons.Cart size={18} /> Carrito
            </div>
            <div className="cart-count">
              {itemCount} {itemCount === 1 ? "ítem" : "ítems"}
              {cart.length > 0 && (
                <span className="cart-count-total"> · {fmtMoney(total)}</span>
              )}
            </div>
          </div>

          <div className="cart-lines">
            {cart.length === 0 && (
              <div className="cart-empty">
                <div className="cart-empty-art">
                  <Icons.Cart size={36} />
                </div>
                <div className="cart-empty-title">Aún no hay nada</div>
                <div className="cart-empty-sub">
                  Toca un producto o servicio del catálogo para agregarlo.
                </div>
              </div>
            )}
            {cart.map((l) => (
              <div className="line" key={l.id}>
                <div className="line-main">
                  <div className="line-name">
                    {l.name}
                    {l.discount && (
                      <span className="line-tag" style={l.discount.mode === 'surcharge' ? { color: 'var(--teal)', background: 'color-mix(in srgb, var(--teal) 12%, transparent)' } : {}}>
                        <Icons.Tag size={11} />
                        {l.discount.promoOff ?? (
                          l.discount.mode === 'surcharge'
                            ? (l.discount.kind === "amount" ? `+${fmtMoney(l.discount.value)}` : `+${l.discount.value}%`)
                            : (l.discount.kind === "amount" ? `-${fmtMoney(l.discount.value)}` : `-${l.discount.value}%`)
                        )}
                      </span>
                    )}
                  </div>
                  <div className="line-meta">
                    <span className={`pill p-${l.type}`}>
                      {l.type === "S" ? "Servicio" : "Producto"}
                    </span>
                    {l.discount ? (
                      <span className="line-price">
                        <s>{fmtMoney(l.basePrice)}</s>{" "}
                        <b style={{ color: l.discount.mode === 'surcharge' ? "var(--teal)" : "var(--magenta)" }}>{fmtMoney(l.price)}</b>
                        {" c/u"}
                      </span>
                    ) : (
                      <span className="line-price">{fmtMoney(l.basePrice)} c/u</span>
                    )}
                  </div>
                </div>

                <div className="line-right">
                  <div className="qty">
                    <button onClick={() => setQty(l.id, -1)}>
                      <Icons.Minus size={12} />
                    </button>
                    <span>{l.qty}</span>
                    <button onClick={() => setQty(l.id, 1)}>
                      <Icons.Plus size={12} />
                    </button>
                  </div>
                  <div className="line-total">
                    {fmtMoney(l.price * l.qty)}
                  </div>

                  <div className="line-acts">
                    {canDiscount && (
                      <button
                        className="line-disc"
                        onClick={() => setDiscountFor(l.id)}
                        title="Ajustar precio"
                      >
                        <Icons.Tag size={13} />
                        {l.discount ? "Editar" : "Ajustar"}
                      </button>
                    )}
                    <button
                      className="line-rm"
                      onClick={() => removeLine(l.id)}
                      title="Quitar"
                    >
                      <Icons.Trash size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="cart-totals">
            <div className="trow">
              <span>Subtotal</span>
              <span>{fmtMoney(subtotal)}</span>
            </div>
            {savings > 0 && (
              <div className="trow t-save">
                <span>Descuentos aplicados</span>
                <span>−{fmtMoney(savings)}</span>
              </div>
            )}
            {savings < 0 && (
              <div className="trow" style={{ color: 'var(--teal)', fontWeight: 600 }}>
                <span>Recargos aplicados</span>
                <span>+{fmtMoney(-savings)}</span>
              </div>
            )}
            <div className="trow t-grand">
              <span>Total</span>
              <span>{fmtMoney(total)}</span>
            </div>
          </div>

          <button
            className="btn-pay"
            disabled={cart.length === 0}
            onClick={() => setPayOpen(true)}
          >
            Cobrar {fmtMoney(total)}
            <Icons.ArrowRight size={16} />
          </button>
          {!canDiscount && (
            <div className="cart-note">
              <Icons.Lock size={11} /> Ajuste de precios requiere permiso especial.
            </div>
          )}
        </aside>
      </div>

      {discountFor && (
        <DiscountModal
          line={discLine}
          onClose={() => setDiscountFor(null)}
          onApply={(kind, value, mode) => applyDiscount(discountFor, kind, value, mode)}
          onClear={() => applyDiscount(discountFor, null)}
        />
      )}

      {payOpen && (
        <PaymentModal
          total={total}
          loading={loading}
          onClose={() => setPayOpen(false)}
          onFinish={finishSale}
          lockAfterSale={lockAfterSale}
        />
      )}
    </div>
  );
}

function DiscountModal({ line, onClose, onApply, onClear }) {
  const [mode, setMode] = React.useState(line?.discount?.mode || 'discount');
  const [kind, setKind] = React.useState(line?.discount?.kind || "amount");
  const [value, setValue] = React.useState(line?.discount?.value ?? 0);
  if (!line) return null;

  const preview = mode === 'surcharge'
    ? (kind === "amount"
        ? +(line.basePrice + +value).toFixed(2)
        : +(line.basePrice * (1 + +value / 100)).toFixed(2))
    : (kind === "amount"
        ? Math.max(0, +(line.basePrice - +value).toFixed(2))
        : Math.max(0, +(line.basePrice * (1 - +value / 100)).toFixed(2)));

  const diff = +(preview - line.basePrice).toFixed(2);
  const quick = kind === "amount" ? [1, 2, 5, 10] : [5, 10, 15, 20];
  const isSurcharge = mode === 'surcharge';

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="modal-eyebrow" style={isSurcharge ? { color: 'var(--teal)' } : {}}>
              {isSurcharge ? 'Recargo al precio' : 'Descuento exclusivo'}
            </div>
            <div className="modal-title">{line.name}</div>
            <div className="modal-sub">Precio base {fmtMoney(line.basePrice)}</div>
          </div>
          <button className="iconbtn" onClick={onClose}>
            <Icons.X size={16} />
          </button>
        </div>

        <div className="disc-toggle">
          <button
            className={`disc-tog ${mode === 'discount' ? 'active' : ''}`}
            onClick={() => setMode('discount')}
          >
            Descuento
          </button>
          <button
            className={`disc-tog ${mode === 'surcharge' ? 'active' : ''}`}
            onClick={() => setMode('surcharge')}
          >
            Recargo
          </button>
        </div>

        <div className="disc-toggle" style={{ marginTop: 8 }}>
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
                {kind === "amount" ? `$${q}` : `${q}%`}
              </button>
            ))}
          </div>
        </div>

        <div className="disc-preview">
          <div>
            <div className="dp-label">Precio base</div>
            <div className="dp-old">{fmtMoney(line.basePrice)}</div>
          </div>
          <Icons.ArrowRight size={18} />
          <div>
            <div className="dp-label">Cliente paga</div>
            <div className="dp-new" style={isSurcharge ? { color: 'var(--teal)' } : {}}>
              {fmtMoney(preview)}
            </div>
          </div>
          <div className="dp-saved" style={isSurcharge ? { color: 'var(--teal)' } : {}}>
            {isSurcharge
              ? <>Recargo de <b>+{fmtMoney(diff)}</b></>
              : <>Ahorra <b>{fmtMoney(-diff)}</b></>
            }
          </div>
        </div>

        <div className="modal-foot">
          {line.discount && (
            <button className="btn-ghost" onClick={onClear}>
              Quitar ajuste
            </button>
          )}
          <button className="btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn-primary"
            onClick={() => onApply(kind, +value || 0, mode)}
          >
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );
}

function PaymentModal({ total, loading, onClose, onFinish, lockAfterSale = true }) {
  const [cash, setCash] = React.useState(total);
  const [card, setCard] = React.useState(0);
  const sum = +(+cash + +card).toFixed(2);
  const ok = Math.abs(sum - total) < 0.005;

  const setSplit = (c, k) => {
    setCash(c);
    setCard(k);
  };

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal pay-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="modal-eyebrow">Cobrar</div>
            <div className="modal-title">Total {fmtMoney(total)}</div>
            <div className="modal-sub">Acepta pago mixto: efectivo + tarjeta</div>
          </div>
          <button className="iconbtn" onClick={onClose}>
            <Icons.X size={16} />
          </button>
        </div>

        <div className="pay-presets">
          <button onClick={() => setSplit(total, 0)}>
            <Icons.Cash size={14} /> Solo efectivo
          </button>
          <button onClick={() => setSplit(0, total)}>
            <Icons.Card size={14} /> Solo tarjeta
          </button>
          <button onClick={() => setSplit(+(total / 2).toFixed(2), +(total / 2).toFixed(2))}>
            50 / 50
          </button>
        </div>

        <div className="pay-fields">
          <label className="pay-field">
            <div className="pay-field-head">
              <Icons.Cash size={14} /> Efectivo
            </div>
            <div className="pay-field-input">
              <span>$</span>
              <input
                type="number"
                min="0"
                value={cash}
                onChange={(e) => setCash(e.target.value)}
              />
            </div>
          </label>
          <label className="pay-field">
            <div className="pay-field-head">
              <Icons.Card size={14} /> Tarjeta
            </div>
            <div className="pay-field-input">
              <span>$</span>
              <input
                type="number"
                min="0"
                value={card}
                onChange={(e) => setCard(e.target.value)}
              />
            </div>
          </label>
        </div>

        <div className="pay-summary">
          <div className="trow">
            <span>Suma capturada</span>
            <span>{fmtMoney(sum)}</span>
          </div>
          <div className="trow">
            <span>Total a cobrar</span>
            <span>{fmtMoney(total)}</span>
          </div>
          <div className={`trow t-diff ${ok ? "ok" : "bad"}`}>
            <span>{ok ? "Cuadra" : "Diferencia"}</span>
            <span>
              {ok ? <Icons.Check size={14} /> : fmtMoney(sum - total)}
            </span>
          </div>
        </div>

        <div className="modal-foot">
          <button className="btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn-primary"
            disabled={!ok || loading}
            onClick={() => onFinish(cash, card)}
          >
            <Icons.Check size={14} /> {lockAfterSale ? "Cobrar y bloquear" : "Cobrar"}
          </button>
        </div>

        {lockAfterSale && (
          <div className="pay-foot">
            <Icons.Lock size={11} /> Al cobrar, la terminal se bloquea automáticamente.
          </div>
        )}
      </div>
    </div>
  );
}

export { SaleScreen };