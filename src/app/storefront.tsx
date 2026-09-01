"use client";
import { FormEvent, useEffect, useMemo, useState } from "react";
type Product = {
  id: string;
  name: string;
  description: string;
  price: { amount: string; currency: string };
  available: boolean;
};
type Option = { id: string; name: string; capabilities?: { requiresHostedCheckout?: boolean; canPlaceOrder?: boolean } };
type Preparation = {
  shippingOptions: Option[];
  paymentMethods: Option[];
  selectedPaymentMethodId: string | null;
  ready: boolean;
  missing: string[];
};
type Order = { orderId: string; orderNumber: string; status: string; paymentStatus: string };
const cartHeaders = (token?: string, json = false) => ({
  ...(token ? { "x-cart-token": token } : {}),
  ...(json ? { "content-type": "application/json" } : {}),
});
export function Storefront() {
  const [products, setProducts] = useState<Product[]>([]),
    [query, setQuery] = useState(""),
    [cartCount, setCartCount] = useState(0),
    [cartId, setCartId] = useState(""),
    [cartToken, setCartToken] = useState(""),
    [preparation, setPreparation] = useState<Preparation>(),
    [order, setOrder] = useState<Order>(),
    [orderIntent, setOrderIntent] = useState(""),
    [error, setError] = useState(""),
    [status, setStatus] = useState(""),
    [synthetic, setSynthetic] = useState(false);
  useEffect(() => {
    fetch("/api/products")
      .then(async (r) => {
        if (!r.ok) throw new Error("Catalog unavailable");
        setSynthetic(r.headers.get("x-sandbox-mode") === "synthetic");
        return r.json();
      })
      .then((v) => setProducts(v.data))
      .catch((e) => setError(e.message));
  }, []);
  const shown = useMemo(
    () =>
      products.filter((p) =>
        p.name.toLowerCase().includes(query.toLowerCase()),
      ),
    [products, query],
  );
  async function add(product: Product) {
    setError("");
    if (synthetic) {
      setCartCount((v) => v + 1);
      setStatus("Synthetic demo only; configure a live sandbox for checkout");
      return;
    }
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
      body: JSON.stringify({ productId: product.id, quantity: 1 }),
    });
    if (!r.ok) throw new Error("Add to cart failed");
    setCartCount((v) => v + 1);
    setStatus(`${product.name} added`);
  }
  async function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const f = new FormData(event.currentTarget);
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
    setPreparation((await r.json()).data);
    setStatus("Checkout prepared");
  }
  async function select(
    kind: "shipping-method" | "payment-method",
    id: string,
  ) {
    if (!id) return;
    const r = await fetch(
      `/api/headless/v1/headless/carts/current/checkout/${kind}`,
      {
        method: "PUT",
        headers: cartHeaders(cartToken, true),
        body: JSON.stringify({ id }),
      },
    );
    if (!r.ok) throw new Error(`${kind} selection failed`);
    setPreparation((await r.json()).data);
    setStatus(`${kind} selected`);
  }
  async function placeOrder() {
    if (!preparation?.ready) throw new Error("Checkout is not ready");
    const selected = preparation.paymentMethods.find(
      (method) => method.id === preparation.selectedPaymentMethodId,
    );
    if (
      selected?.capabilities?.requiresHostedCheckout !== false ||
      selected.capabilities.canPlaceOrder !== true
    ) {
      throw new Error("Choose a supported non-hosted payment method");
    }
    const intent = orderIntent || crypto.randomUUID();
    setOrderIntent(intent);
    const response = await fetch(
      "/api/headless/v1/headless/carts/current/checkout/order",
      {
        method: "POST",
        headers: {
          ...cartHeaders(cartToken),
          "Idempotency-Key": intent,
        },
      },
    );
    if (!response.ok) {
      const problem = await response.json().catch(() => null) as { detail?: string; title?: string } | null;
      throw new Error(problem?.detail ?? problem?.title ?? `Order placement failed (${response.status})`);
    }
    setOrder((await response.json()).data);
    setStatus("Order placed without hosted payment");
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
        <p aria-live="polite">{status}</p>
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
                  currency: p.price.currency,
                }).format(Number(p.price.amount))}
              </strong>
                <button
                  data-product-id={p.id}
                  disabled={!p.available}
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
        {cartId && (
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
                placeholder="BC"
                required
              />
              <input
                name="postalCode"
                aria-label="Postal code"
                placeholder="V6B 1A1"
                required
              />
              <input
                name="countryCode"
                aria-label="Country code"
                defaultValue="CA"
                required
              />
              <button>Load delivery and payment options</button>
            </form>
            {preparation && (
              <div className="options">
                <label>
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
                </label>
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
                    disabled={!preparation.ready}
                    onClick={() =>
                      placeOrder().catch((x) => setError(x.message))
                    }
                  >
                    Place pending order
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
      </main>
    </>
  );
}
