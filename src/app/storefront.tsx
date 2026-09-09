"use client";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
type Product = {
  id: string;
  name: string;
  description: string;
  price: { amount: string; currency: string };
  available: boolean;
};
type Variant = { id: string; title: string; price: Product["price"]; selectedOptions: Record<string, string>; available: boolean };
type Option = { id: string; name: string; capabilities?: { requiresHostedCheckout?: boolean; canPlaceOrder?: boolean } };
type Cart = {
  id: string;
  currency: string;
  items: Array<{ id: string; name: string; quantity: number; unitPrice: Product["price"]; totalPrice: Product["price"] }>;
  totals: { subtotal: string; tax: string; taxIsEstimate: boolean; shipping: string; discount: string; total: string };
};
const money = (amount: string, currency: string) => new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Number(amount));
type Preparation = {
  cart: Cart;
  shippingOptions: Option[];
  paymentMethods: Option[];
  selectedPaymentMethodId: string | null;
  ready: boolean;
  missing: string[];
};
type Order = { orderId: string; orderNumber: string; status: string; paymentStatus: string };
type OrderStatus = { orderNumber: string; status: string; paymentStatus: string; tracking: Record<string, unknown> | null };
const cartHeaders = (token?: string, json = false) => ({
  ...(token ? { "x-cart-token": token } : {}),
  ...(json ? { "content-type": "application/json" } : {}),
});
export function Storefront() {
  const addBusy = useRef(false);
  const [adding, setAdding] = useState(false);
  const [cart, setCart] = useState<Cart>();
  const [cartLoading, setCartLoading] = useState(true);
  const [cartUnavailable, setCartUnavailable] = useState(false);
  const [variants, setVariants] = useState<Record<string, Variant[]>>({});
  const [choices, setChoices] = useState<Record<string, string>>({});
  const paymentBusy = useRef(false);
  const [paying, setPaying] = useState(false);

  const [products, setProducts] = useState<Product[]>([]),
    [query, setQuery] = useState(""),
    [cartCount, setCartCount] = useState(0),
    [cartId, setCartId] = useState(""),
    [cartToken, setCartToken] = useState(""),
    [preparation, setPreparation] = useState<Preparation>(),
    [order, setOrder] = useState<Order>(),
    [orderStatus, setOrderStatus] = useState<OrderStatus>(),
    [orderIntent, setOrderIntent] = useState(""),
    [error, setError] = useState(""),
    [status, setStatus] = useState("");
  useEffect(() => {
    fetch("/api/products")
      .then(async (r) => {
        if (!r.ok) throw new Error("Catalog unavailable");
        return r.json();
      })
      .then((v) => setProducts(v.data))
      .catch((e) => setError(e.message));
    void refreshCart();
    const number = sessionStorage.getItem('1ecomm-checkout-order');
    if (new URLSearchParams(window.location.search).has('checkout')) {
      setStatus(`Payment is not confirmed by this return page. ${number ? `Use order ${number} and your checkout email below to check its status.` : 'Check your order status below.'}`);
    }
  }, []);
  const shown = useMemo(
    () =>
      products.filter((p) =>
        p.name.toLowerCase().includes(query.toLowerCase()),
      ),
    [products, query],
  );
  function acceptCart(value: Cart) {
    setCart(value);
    setCartId(value.id);
    setCartCount(value.items.reduce((count, item) => count + item.quantity, 0));
  }
  async function refreshCart() {
    if (addBusy.current || paymentBusy.current) return;
    addBusy.current = true;
    setCartLoading(true);
    setPreparation(undefined);
    try {
      const response = await fetch('/api/headless/v1/headless/carts/current');
      if (response.status === 401 || response.status === 404) {
        setCart(undefined); setCartId(''); setCartCount(0); setCartToken('');
      } else {
        if (!response.ok) throw new Error('Could not load your cart. Refresh it before continuing.');
        acceptCart((await response.json()).data);
      }
      setCartUnavailable(false);
    } catch {
      setCartUnavailable(true);
      setError('Could not load your cart. Refresh it before continuing.');
    } finally { addBusy.current = false; setCartLoading(false); }
  }
  async function changeCart(itemId: string, quantity?: number) {
    if (addBusy.current || paymentBusy.current || cartLoading || cartUnavailable || order) return;
    addBusy.current = true; setAdding(true); setError(''); setPreparation(undefined);
    try {
      const response = await fetch(`/api/headless/v1/headless/carts/current/items/${encodeURIComponent(itemId)}`, {
        method: quantity === undefined ? 'DELETE' : 'PATCH',
        headers: cartHeaders(cartToken, quantity !== undefined),
        ...(quantity !== undefined ? { body: JSON.stringify({ quantity }) } : {}),
      });
      if (!response.ok) throw new Error('Cart update was not confirmed. Refresh the cart before trying again.');
      acceptCart((await response.json()).data);
      setStatus(quantity === undefined ? 'Item removed from cart' : 'Cart quantity updated');
    } catch (failure) {
      setCartUnavailable(true);
      setError(failure instanceof Error ? failure.message : 'Cart update was not confirmed. Refresh the cart.');
    } finally { addBusy.current = false; setAdding(false); }
  }
  async function add(product: Product) {
    if (addBusy.current || paymentBusy.current || cartLoading || cartUnavailable || order) return;
    addBusy.current = true;
    setAdding(true);
    setPreparation(undefined);
    setError("");
    try {
    let options = variants[product.id];
    if (!options) {
      const response = await fetch(`/api/headless/v1/headless/products/${encodeURIComponent(product.id)}/variants`);
      if (!response.ok) throw new Error("Product options unavailable. Please try again later.");
      const body = await response.json();
      if (!Array.isArray(body.data) || body.data.some((v: Variant) =>
        !v || typeof v.id !== 'string' || typeof v.title !== 'string' || typeof v.available !== 'boolean' ||
        !v.price || typeof v.price.amount !== 'string' || !Number.isFinite(Number(v.price.amount)) || typeof v.price.currency !== 'string'
      )) throw new Error("Product options unavailable");
      options = body.data;
      setVariants((previous) => ({ ...previous, [product.id]: options }));
    }
    const variant = options.find((v) => v.id === choices[product.id]) ?? (options.length === 1 ? options[0] : undefined);
    if (!variant && options.length > 1) {
      setStatus(`Choose an option for ${product.name}, then add it to your cart.`);
      return;
    }
    if (!variant?.available) throw new Error("This product option is unavailable");
    let id = cartId,
      token = cartToken;
    if (!id) {
      const r = await fetch("/api/headless/v1/headless/carts", {
        method: "POST",
      });
      if (!r.ok) throw new Error("Cart creation failed");
      const body = await r.json();
      id = body.data.id;
      token = body.cartToken;
      setCartId(id);
      setCartToken(token);
    }
    const r = await fetch("/api/headless/v1/headless/carts/current/items", {
      method: "POST",
      headers: cartHeaders(token, true),
      body: JSON.stringify({ productId: product.id, variantId: variant.id, quantity: 1 }),
    });
    if (!r.ok) throw new Error("Add to cart failed");
    const updated = (await r.json()).data;
    acceptCart(updated);
    setPreparation(undefined);
    setStatus(`${product.name} added`);
    } catch (failure) {
      setCartUnavailable(true);
      throw failure;
    } finally { addBusy.current = false; setAdding(false); }
  }
  async function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (addBusy.current || paymentBusy.current || cartLoading || cartUnavailable) return;
    setError("");
    const f = new FormData(event.currentTarget);
    addBusy.current = true; setAdding(true); setPreparation(undefined);
    try {
    const address = {
      firstName: f.get("firstName"),
      lastName: f.get("lastName"),
      email: f.get("email"),
      address1: f.get("address1"),
      city: f.get("city"),
      state: f.get("state"),
      postalCode: f.get("postalCode"),
      country: f.get("countryCode"),
    };
    const r = await fetch("/api/headless/v1/headless/carts/current/checkout", {
      method: "PATCH",
      headers: cartHeaders(cartToken, true),
      body: JSON.stringify({
        customerInfo: {
          firstName: address.firstName,
          lastName: address.lastName,
          email: address.email,
        },
        billingAddress: address,
        shippingAddress: { sameAsBilling: true },
      }),
    });
    if (!r.ok) throw new Error("Checkout preparation failed");
    const prepared = (await r.json()).data;
    setPreparation(prepared);
    acceptCart(prepared.cart);
    setStatus("Checkout prepared");
    } finally { addBusy.current = false; setAdding(false); }
  }
  async function select(
    kind: "shipping-method" | "payment-method",
    id: string,
  ) {
    if (!id || addBusy.current || paymentBusy.current || cartLoading || cartUnavailable) return;
    addBusy.current = true; setAdding(true); setPreparation(undefined);
    try {
    const r = await fetch(
      `/api/headless/v1/headless/carts/current/checkout/${kind}`,
      {
        method: "PUT",
        headers: cartHeaders(cartToken, true),
        body: JSON.stringify({ id }),
      },
    );
    if (!r.ok) throw new Error(`${kind} selection failed`);
    const prepared = (await r.json()).data;
    setPreparation(prepared);
    acceptCart(prepared.cart);
    setStatus(`${kind} selected`);
    } finally { addBusy.current = false; setAdding(false); }
  }
  async function placeOrder() {
    if (addBusy.current || cartLoading || cartUnavailable) return;
    if (!preparation?.ready) throw new Error("Checkout is not ready");
    const selected = preparation.paymentMethods.find(
      (method) => method.id === preparation.selectedPaymentMethodId,
    );
    const hosted = selected?.capabilities?.requiresHostedCheckout === true;
    if (!hosted && (selected?.capabilities?.requiresHostedCheckout !== false || selected.capabilities.canPlaceOrder !== true)) {
      throw new Error("Choose a supported payment method");
    }
    if (paymentBusy.current) return;
    paymentBusy.current = true;
    setPaying(true);
    try {
    const storageKey = `1ecomm-checkout-intent:${cartId}`;
    const intent = orderIntent || sessionStorage.getItem(storageKey) || crypto.randomUUID();
    sessionStorage.setItem(storageKey, intent);
    setOrderIntent(intent);
    const response = await fetch(
      `/api/headless/v1/headless/carts/current/checkout/${hosted ? "payment-session" : "order"}`,
      {
        method: "POST",
        headers: {
          ...cartHeaders(cartToken, hosted),
          "Idempotency-Key": intent,
        },
        ...(hosted ? { body: JSON.stringify({ successUrl: `${window.location.origin}/?checkout=returned`, cancelUrl: `${window.location.origin}/?checkout=cancelled` }) } : {}),
      },
    );
    if (!response.ok) {
      const problem = await response.json().catch(() => null) as { detail?: string; title?: string } | null;
      throw new Error(problem?.detail ?? problem?.title ?? `Order placement failed (${response.status})`);
    }
    const result = (await response.json()).data;
    setOrder(result);
    sessionStorage.setItem('1ecomm-checkout-order', result.orderNumber);
    if (hosted) {
      const destination = new URL(result.checkoutUrl);
      if (destination.protocol !== 'https:' || destination.username || destination.password) throw new Error('Invalid payment destination');
      setStatus('Continue with the payment provider. Your order is awaiting payment confirmation.');
      window.location.assign(destination.toString());
    } else {
      setStatus('Order placed without hosted payment');
    }
    } finally { paymentBusy.current = false; setPaying(false); }
  }
  async function lookupOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setOrderStatus(undefined);
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/headless/v1/headless/orders/lookup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ orderNumber: data.get("orderNumber"), email: data.get("orderEmail") }) });
    if (!response.ok) throw new Error("We could not find an order with those details");
    setOrderStatus((await response.json()).data);
  }
  return (
    <>
      <header>
        <a className="brand" href="#">
          Trailhead
        </a>
        <label>
          Search products
          <input
            aria-label="Search products"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <span aria-live="polite">Cart ({cartCount})</span>
      </header>
      <main>
        <section className="hero">
          <p>FIELD TESTED</p>
          <h1>
            Go farther.
            <br />
            Carry less.
          </h1>
          <span>
            Use a dedicated test tenant; never clone production customer data.
          </span>
        </section>
        {error && <p role="alert">{error}</p>}
        <p data-testid="storefront-status" aria-live="polite">{status}</p>
        <section aria-label="Products" className="grid">
          {shown.map((p) => (
            <article key={p.id}>
              <div className="art" aria-hidden="true">
                ▲
              </div>
              <h2>{p.name}</h2>
              <p>{p.description}</p>
              <strong>
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: (variants[p.id]?.find((v) => v.id === choices[p.id])?.price ?? p.price).currency,
                }).format(Number((variants[p.id]?.find((v) => v.id === choices[p.id])?.price ?? p.price).amount))}
              </strong>
              {(variants[p.id]?.length ?? 0) > 1 && <label>
                Variant for {p.name}
                <select aria-label={`Variant for ${p.name}`} value={choices[p.id] ?? ''}
                  onChange={(event) => setChoices((previous) => ({ ...previous, [p.id]: event.target.value }))}>
                  <option value="" disabled>Choose an option</option>
                  {variants[p.id].map((variant) => <option key={variant.id} value={variant.id} disabled={!variant.available}>
                    {variant.title}{variant.available ? '' : ' (unavailable)'}
                  </option>)}
                </select>
              </label>}
                <button
                  data-product-id={p.id}
                  disabled={!p.available || adding || paying || cartLoading || cartUnavailable || !!order}
                onClick={() => add(p).catch((e) => setError(e.message))}
              >
                Add {p.name} to cart
              </button>
            </article>
          ))}
        </section>
        {products.length > 0 && shown.length === 0 && (
          <p>No products match “{query}”.</p>
        )}
        <section className="checkout" aria-label="Your cart">
          <h2>Your cart</h2>
          {cartLoading && <p role="status">Loading cart…</p>}
          <button disabled={adding || paying || cartLoading} onClick={() => void refreshCart()}>Refresh cart</button>
          {cartUnavailable && <p role="alert">Cart state is uncertain. Refresh before making another change or checking out.</p>}
          {!cartLoading && !cartUnavailable && !cart?.items.length && <p>Your cart is empty.</p>}
          {cart && <>
            <ul className="cart-lines">
              {cart.items.map((item) => <li key={item.id}>
                <strong>{item.name}</strong>
                <span>{money(item.unitPrice.amount, item.unitPrice.currency)} each · {money(item.totalPrice.amount, item.totalPrice.currency)} for this line</span>
                <div className="cart-quantity">
                  <button aria-label={`Decrease quantity of ${item.name}`} disabled={item.quantity <= 1 || adding || paying || cartLoading || cartUnavailable || !!order} onClick={() => void changeCart(item.id, item.quantity - 1)}>−</button>
                  <span aria-live="polite">Quantity: {item.quantity}</span>
                  <button aria-label={`Increase quantity of ${item.name}`} disabled={adding || paying || cartLoading || cartUnavailable || !!order} onClick={() => void changeCart(item.id, item.quantity + 1)}>+</button>
                  <button disabled={adding || paying || cartLoading || cartUnavailable || !!order} onClick={() => void changeCart(item.id)}>Remove {item.name}</button>
                </div>
              </li>)}
            </ul>
            {cart.items.length > 0 && <dl className="cart-totals">
              <dt>Subtotal</dt><dd>{money(cart.totals.subtotal, cart.currency)}</dd>
              <dt>Discount</dt><dd>{money(cart.totals.discount, cart.currency)}</dd>
              <dt>Shipping</dt><dd>{money(cart.totals.shipping, cart.currency)}</dd>
              <dt>Tax{cart.totals.taxIsEstimate ? ' (estimated)' : ''}</dt><dd>{money(cart.totals.tax, cart.currency)}</dd>
              <dt>Current total</dt><dd>{money(cart.totals.total, cart.currency)}</dd>
            </dl>}
            <p>Totals come from your cart. Delivery, taxes and availability are checked again at checkout.</p>
          </>}
        </section>
        {cartId && cartCount > 0 && !cartUnavailable && (
          <section className="checkout" aria-label="Checkout preparation">
            <h2>Prepare checkout</h2>
            <form
              onSubmit={(e) => prepare(e).catch((x) => setError(x.message))}
            >
              <input
                name="email"
                type="email"
                aria-label="Email"
                placeholder="buyer@example.com"
                required
              />
              <input
                name="firstName"
                aria-label="First name"
                placeholder="Ada"
                required
              />
              <input
                name="lastName"
                aria-label="Last name"
                placeholder="Lovelace"
                required
              />
              <input
                name="address1"
                aria-label="Address"
                placeholder="123 Test Street"
                required
              />
              <input
                name="city"
                aria-label="City"
                placeholder="Vancouver"
                required
              />
              <input
                name="state"
                aria-label="State"
                placeholder="State/province, when required"
              />
              <input
                name="postalCode"
                aria-label="Postal code"
                placeholder="Postal code, when required"
              />
              <input
                name="countryCode"
                aria-label="Country code"
                defaultValue="CA"
                required
              />
              <button disabled={adding || paying || cartLoading}>Load delivery and payment options</button>
            </form>
            {preparation && (
              <div className="options">
                {(preparation.shippingOptions.length > 0 || preparation.missing.includes("shippingMethod")) && <label>
                  Shipping method
                  <select
                    aria-label="Shipping method"
                    defaultValue=""
                    onChange={(e) =>
                      select("shipping-method", e.target.value).catch((x) =>
                        setError(x.message),
                      )
                    }
                  >
                    <option value="" disabled>
                      Select shipping
                    </option>
                    {preparation.shippingOptions.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name}
                      </option>
                    ))}
                  </select>
                </label>}
                <label>
                  Payment method
                  <select
                    aria-label="Payment method"
                    defaultValue=""
                    onChange={(e) =>
                      select("payment-method", e.target.value).catch((x) =>
                        setError(x.message),
                      )
                    }
                  >
                    <option value="" disabled>
                      Select payment
                    </option>
                    {preparation.paymentMethods.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name}
                      </option>
                    ))}
                  </select>
                </label>
                <p>
                  {preparation.missing.length
                    ? `Preparation gaps: ${preparation.missing.join(", ")}`
                    : "No preparation gaps"}
                </p>
                {!order && (
                  <button
                    data-testid="checkout-submit"
                    disabled={!preparation.ready || paying || adding || cartLoading || cartUnavailable}
                    onClick={() =>
                      placeOrder().catch((x) => setError(x.message))
                    }
                  >
                    {paying ? 'Opening checkout…' : preparation.paymentMethods.find((method) => method.id === preparation.selectedPaymentMethodId)?.capabilities?.requiresHostedCheckout ? 'Continue to payment' : 'Place pending order'}
                  </button>
                )}
                {order && (
                  <section aria-label="Order confirmation">
                    <h3>Order {order.orderNumber} placed</h3>
                    <p>Status: {order.status}</p>
                    <p>Payment: {order.paymentStatus}</p>
                  </section>
                )}
              </div>
            )}
          </section>
        )}
        <section className="checkout" aria-label="Find an order">
          <h2>Find your order</h2><p>Use the order number and email entered at checkout.</p>
          <form onSubmit={(event) => lookupOrder(event).catch((x) => setError(x.message))}>
            <label>Order number<input name="orderNumber" required /></label>
            <label>Order email<input name="orderEmail" type="email" required /></label>
            <button>Check order status</button>
          </form>
          {orderStatus && <section aria-label="Order status"><h3>Order {orderStatus.orderNumber}</h3><p>Status: {orderStatus.status}</p><p>Payment: {orderStatus.paymentStatus}</p><p>{orderStatus.tracking ? "Tracking is available" : "Tracking is not available yet"}</p></section>}
        </section>
      </main>
    </>
  );
}
