// Sales / POS screen
// Left: catalog with category tabs + search
// Right: cart with discount popup, totals, payment

function SaleScreen({ user, data, onLock, onBack, onComplete }) {
  const isAdmin = user.role === "admin";
  const [cat, setCat] = React.useState(data.categories[0].id);
  const [query, setQuery] = React.useState("");
  const [cart, setCart] = React.useState([]); // {id, name, basePrice, price, qty, type, discount}
  const [discountFor, setDiscountFor] = React.useState(null); // line id
  const [payOpen, setPayOpen] = React.useState(false);
  const [cartOpen, setCartOpen] = React.useState(false);

  const visible = data.catalog.filter(
    (p) =>
      (!query
        ? p.cat === cat
        : (p.name + " " + p.cat).toLowerCase().includes(query.toLowerCase()))
  );

  const addToCart = (p) => {
    setCart((c) => {
      const idx = c.findIndex((x) => x.id === p.id);
      if (idx >= 0) {
        const copy = [...c];
        copy[idx] = { ...copy[idx], qty: copy[idx].qty + 1 };
        return copy;
      }
      return [
        ...c,
        {
          id: p.id,
          name: p.name,
          basePrice: p.price,
          price: p.price,
          qty: 1,
          type: p.type,
          duration: p.duration,
          discount: null,
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

  const applyDiscount = (id, kind, value) => {
    setCart((c) =>
      c.map((l) => {
        if (l.id !== id) return l;
        if (!kind) return { ...l, price: l.basePrice, discount: null };
        const newPrice =
          kind === "amount"
            ? Math.max(0, l.basePrice - value)
            : Math.max(0, +(l.basePrice * (1 - value / 100)).toFixed(2));
        return {
          ...l,
          price: newPrice,
          discount: { kind, value, saved: +(l.basePrice - newPrice).toFixed(2) },
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

  const finishSale = () => {
    setPayOpen(false);
    setCart([]);
    onComplete({ total, items: itemCount });
  };

  const discLine = cart.find((l) => l.id === discountFor);

  return (
    <div className="screen sale-screen">
      <TopBar
        user={user}
        title="Registrar venta"
        onLock={onLock}
        onBack={onBack}
        onLogout={onLock}
        right={
          <div className="sale-context">
            <Icons.Receipt size={14} />
            Ticket #{1247 + Math.floor((Date.now() / 60000) % 99)}
          </div>
        }
      />

      <div className="sale-body">
        {/* CATALOG */}
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
              {data.categories.map((c) => (
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
                      {inCart && (
                        <div className="prod-qty-badge">
                          {inCart.qty} <Icons.Check size={11} />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="prod-body">
                    <div className="prod-name">{p.name}</div>
                    <div className="prod-meta">
                      {p.duration && (
                        <span className="prod-dur">
                          <Icons.Clock size={11} /> {p.duration}
                        </span>
                      )}
                      {p.stock != null && (
                        <span className={`prod-stock ${p.stock < 8 ? "low" : ""}`}>
                          {p.stock} en stock
                        </span>
                      )}
                    </div>
                    <div className="prod-bottom">
                      <div className="prod-price">${p.price}</div>
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

        {/* CART */}
        <aside className={`cart ${cartOpen ? "open" : ""}`}>
          <div className="cart-head" onClick={() => setCartOpen((o) => !o)}>
            <div className="cart-title">
              <Icons.Cart size={18} /> Carrito
            </div>
            <div className="cart-count">
              {itemCount} {itemCount === 1 ? "ítem" : "ítems"}
              {cart.length > 0 && (
                <span className="cart-count-total"> · ${total.toFixed(2)}</span>
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
                      <span className="line-tag">
                        <Icons.Tag size={11} />
                        {l.discount.kind === "amount"
                          ? `-$${l.discount.value}`
                          : `-${l.discount.value}%`}
                      </span>
                    )}
                  </div>
                  <div className="line-meta">
                    <span className={`pill p-${l.type}`}>
                      {l.type === "S" ? "Servicio" : "Producto"}
                    </span>
                    {l.discount ? (
                      <span className="line-price">
                        <s>${l.basePrice}</s>{" "}
                        <b style={{ color: "var(--magenta)" }}>${l.price}</b>
                        {" c/u"}
                      </span>
                    ) : (
                      <span className="line-price">${l.basePrice} c/u</span>
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
                    ${(l.price * l.qty).toFixed(2)}
                  </div>

                  <div className="line-acts">
                    {isAdmin && (
                      <button
                        className="line-disc"
                        onClick={() => setDiscountFor(l.id)}
                        title="Aplicar descuento"
                      >
                        <Icons.Tag size={13} />
                        {l.discount ? "Editar" : "Descuento"}
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
              <span>${subtotal.toFixed(2)}</span>
            </div>
            {savings > 0 && (
              <div className="trow t-save">
                <span>Descuentos aplicados</span>
                <span>−${savings.toFixed(2)}</span>
              </div>
            )}
            <div className="trow t-grand">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>

          {!isAdmin && cart.some((l) => false) && (
            <div className="cart-note">
              Solo administradoras pueden modificar precios.
            </div>
          )}

          <button
            className="btn-pay"
            disabled={cart.length === 0}
            onClick={() => setPayOpen(true)}
          >
            Cobrar ${total.toFixed(2)}
            <Icons.ArrowRight size={16} />
          </button>
          {!isAdmin && (
            <div className="cart-note">
              <Icons.Lock size={11} /> Modificar precios requiere admin.
            </div>
          )}
        </aside>
      </div>

      {discountFor && (
        <DiscountModal
          line={discLine}
          onClose={() => setDiscountFor(null)}
          onApply={(kind, value) => applyDiscount(discountFor, kind, value)}
          onClear={() => applyDiscount(discountFor, null)}
        />
      )}

      {payOpen && (
        <PaymentModal
          total={total}
          onClose={() => setPayOpen(false)}
          onFinish={finishSale}
        />
      )}
    </div>
  );
}

function DiscountModal({ line, onClose, onApply, onClear }) {
  const [kind, setKind] = React.useState(line?.discount?.kind || "amount");
  const [value, setValue] = React.useState(line?.discount?.value || 0);
  if (!line) return null;
  const preview =
    kind === "amount"
      ? Math.max(0, line.basePrice - +value)
      : Math.max(0, +(line.basePrice * (1 - +value / 100)).toFixed(2));

  const quick =
    kind === "amount" ? [1, 2, 5, 10] : [5, 10, 15, 20];

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="modal-eyebrow">Descuento exclusivo</div>
            <div className="modal-title">{line.name}</div>
            <div className="modal-sub">Precio base ${line.basePrice}</div>
          </div>
          <button className="iconbtn" onClick={onClose}>
            <Icons.X size={16} />
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
                {kind === "amount" ? `$${q}` : `${q}%`}
              </button>
            ))}
          </div>
        </div>

        <div className="disc-preview">
          <div>
            <div className="dp-label">Precio final</div>
            <div className="dp-old">${line.basePrice}</div>
          </div>
          <Icons.ArrowRight size={18} />
          <div>
            <div className="dp-label">Cliente paga</div>
            <div className="dp-new">${preview.toFixed(2)}</div>
          </div>
          <div className="dp-saved">
            Ahorra <b>${(line.basePrice - preview).toFixed(2)}</b>
          </div>
        </div>

        <div className="modal-foot">
          {line.discount && (
            <button className="btn-ghost" onClick={onClear}>
              Quitar descuento
            </button>
          )}
          <button className="btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn-primary"
            onClick={() => onApply(kind, +value || 0)}
          >
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );
}

function PaymentModal({ total, onClose, onFinish }) {
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
            <div className="modal-title">Total ${total.toFixed(2)}</div>
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
            <span>${sum.toFixed(2)}</span>
          </div>
          <div className="trow">
            <span>Total a cobrar</span>
            <span>${total.toFixed(2)}</span>
          </div>
          <div className={`trow t-diff ${ok ? "ok" : "bad"}`}>
            <span>{ok ? "Cuadra" : "Diferencia"}</span>
            <span>
              {ok ? <Icons.Check size={14} /> : `$${(sum - total).toFixed(2)}`}
            </span>
          </div>
        </div>

        <div className="modal-foot">
          <button className="btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn-primary"
            disabled={!ok}
            onClick={onFinish}
          >
            <Icons.Check size={14} /> Cobrar y bloquear
          </button>
        </div>

        <div className="pay-foot">
          <Icons.Lock size={11} /> Al cobrar, la terminal se bloquea automáticamente.
        </div>
      </div>
    </div>
  );
}

window.SaleScreen = SaleScreen;
