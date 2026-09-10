import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
const storeId = '01f5b02f-d7c0-42cd-b880-59f78ea70aa3';
const products = [
  { id: '00000000-0000-4000-8000-000000000004', name: 'Digital Guide', description: 'Guide', price: { amount: '10', currency: 'USD' }, available: true },
  { id: '00000000-0000-4000-8000-000000000001', name: 'Trail Pack 24L', description: 'Pack', price: { amount: '89', currency: 'USD' }, available: true },
  { id: '00000000-0000-4000-8000-000000000002', name: 'Camp Mug', description: 'Mug', price: { amount: '24', currency: 'USD' }, available: true },
  { id: '00000000-0000-4000-8000-000000000003', name: 'Alpine Shell', description: 'Shell', price: { amount: '219', currency: 'USD' }, available: false },
];
const variants = (product) => product.id.endsWith('2') ? [
  { id: '10000000-0000-4000-8000-000000000001', title: 'Blue', price: { amount: '26.00', currency: 'USD' }, selectedOptions: { Colour: 'Blue' }, available: true },
  { id: '10000000-0000-4000-8000-000000000002', title: 'Red', price: { amount: '28.00', currency: 'USD' }, selectedOptions: { Colour: 'Red' }, available: true },
  { id: '10000000-0000-4000-8000-000000000003', title: 'Green', price: { amount: '24.00', currency: 'USD' }, selectedOptions: { Colour: 'Green' }, available: false },
] : [{ id: '10000000-0000-4000-8000-000000000004', title: 'Default', price: product.price, selectedOptions: {}, available: product.available }];
const priceCart = (cart) => {
  const subtotal = cart.items.reduce((sum, item) => sum + Number(item.unitPrice.amount) * item.quantity, 0);
  for (const item of cart.items) item.totalPrice = { amount: (Number(item.unitPrice.amount) * item.quantity).toFixed(2), currency: 'USD' };
  cart.currency = 'USD';
  cart.totals = { subtotal: subtotal.toFixed(2), tax: '0.00', taxIsEstimate: true, shipping: '0.00', discount: '0.00', total: subtotal.toFixed(2) };
  cart.expiresAt = '2027-01-01T00:00:00Z';
  return cart;
};
const carts = new Map();
const orders = new Map();
const requests = [];
createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1:3101'); res.setHeader('content-type', 'application/json');
  let raw = ''; for await (const chunk of req) raw += chunk;
  requests.push({ path: url.pathname, method: req.method, headers: req.headers, body: raw });
  if (url.pathname === '/__requests') return res.end(JSON.stringify(requests));
  if (url.pathname === `/v1/headless/stores/${storeId}/config`) return res.end(JSON.stringify({ data: { storeId, apiUrl: 'http://127.0.0.1:3101', publishableKey: 'pk_test_demo', apiVersion: 'v1', capabilities: ['catalog', 'cart', 'checkout-preparation'] }, requestId: 'r' }));
  if (url.pathname === '/v1/headless/products') return res.end(JSON.stringify({ data: products, nextCursor: null, requestId: 'r' }));
  const variantProduct = products.find((p) => url.pathname === `/v1/headless/products/${p.id}/variants`);
  if (variantProduct) return res.end(JSON.stringify({ data: variants(variantProduct), requestId: 'r' }));
  if (url.pathname === '/v1/headless/carts' && req.method === 'POST') {
    const token = `hc_${randomUUID().replaceAll('-', '').padEnd(43, 'a')}`;
    const cart = { id: randomUUID(), items: [], selectedPaymentMethodId: null, selectedShippingMethodId: null }; priceCart(cart); carts.set(token, cart);
    res.statusCode = 201; return res.end(JSON.stringify({ data: cart, cartToken: token, created: true, requestId: 'r' }));
  }
  const cart = carts.get(req.headers['x-cart-token']);
  if (url.pathname.startsWith('/v1/headless/carts/current') && !cart) { res.statusCode = 404; return res.end('{}'); }
  if (url.pathname === '/v1/headless/carts/current' && req.method === 'GET') return res.end(JSON.stringify({ data: cart, requestId: 'r' }));
  if (url.pathname === '/v1/headless/carts/current/items' && req.method === 'POST') {
    const input = JSON.parse(raw);
    const product = products.find((p) => p.id === input.productId);
    const selected = product && variants(product).find((v) => v.id === input.variantId && v.available);
    if (!selected) { res.statusCode = 400; return res.end('{}'); }
    cart.items.push({ id: randomUUID(), productId: product.id, name: product.name, imageUrl: '', requiresShipping: !product.id.endsWith('4'), quantity: input.quantity, variantId: selected.id, unitPrice: selected.price }); priceCart(cart); res.statusCode = 201; return res.end(JSON.stringify({ data: cart, requestId: 'r' }));
  }
  if (/^\/v1\/headless\/carts\/current\/items\/[0-9a-f-]{36}$/.test(url.pathname) && ['PATCH', 'DELETE'].includes(req.method)) {
    const id = url.pathname.split('/').at(-1);
    const item = cart.items.find(item => item.id === id);
    if (!item) { res.statusCode = 404; return res.end('{}'); }
    if (req.method === 'DELETE') cart.items = cart.items.filter(item => item.id !== id);
    else {
      const quantity = JSON.parse(raw).quantity;
      if (!Number.isInteger(quantity) || quantity < 1) { res.statusCode = 400; return res.end('{}'); }
      item.quantity = quantity;
    }
    cart.selectedShippingMethodId = null; cart.selectedPaymentMethodId = null;
    return res.end(JSON.stringify({ data: priceCart(cart), requestId: 'r' }));
  }
  if (url.pathname.endsWith('/checkout') && req.method === 'PATCH') {
    const input = JSON.parse(raw);
    if (input.fulfillment) cart.fulfillment = input.fulfillment;
    if (input.customerInfo?.email) cart.email = input.customerInfo.email;
    if (input.billingAddress) cart.billingAddress = input.billingAddress;
    if (input.shippingAddress) cart.shippingAddress = input.shippingAddress.sameAsBilling ? { ...cart.billingAddress, sameAsBilling: true } : input.shippingAddress;
  }
  const needsShipping = cart?.fulfillment?.mode !== 'pickup' && cart?.items.some(item => item.requiresShipping !== false);
  const checkout = () => ({ ...cart, cart,
    fulfillment: cart.fulfillment ?? { mode: 'ship', pickupLocationId: null },
    countries: [{ code: 'CA', name: 'Canada', stateRequired: true, postalCodeRequired: true }, { code: 'HK', name: 'Hong Kong', stateRequired: false, postalCodeRequired: false }],
    pickupLocations: [{ id: '20000000-0000-4000-8000-000000000001', name: 'Downtown pickup', addressLine1: '1 Main Street', available: true }, { id: '20000000-0000-4000-8000-000000000002', name: 'Sold out pickup', available: false }], shippingOptions: needsShipping ? [{ id: 'shipping', name: 'Delivery' }] : [], paymentMethods: [
    { id: 'card', name: 'Card with merchant provider', capabilities: { requiresHostedCheckout: true, canPlaceOrder: false } },
    { id: 'bank', name: 'Bank transfer', capabilities: { requiresHostedCheckout: false, canPlaceOrder: true } },
  ], ready: Boolean((!needsShipping || cart.selectedShippingMethodId) && cart.selectedPaymentMethodId), missing: [] });
  if (url.pathname.endsWith('/checkout') && ['PATCH', 'GET'].includes(req.method)) return res.end(JSON.stringify({ data: checkout(), requestId: 'r' }));
  if (url.pathname.endsWith('/shipping-method') && req.method === 'PUT') { cart.selectedShippingMethodId = JSON.parse(raw).id; return res.end(JSON.stringify({ data: checkout(), requestId: 'r' })); }
  if (url.pathname.endsWith('/payment-method') && req.method === 'PUT') { cart.selectedPaymentMethodId = JSON.parse(raw).id; return res.end(JSON.stringify({ data: checkout(), requestId: 'r' })); }
  if (url.pathname.endsWith('/payment-session') && req.method === 'POST') {
    res.statusCode = 201; res.setHeader('x-request-id', 'hosted-upstream');
    return res.end(JSON.stringify({ data: { orderId: 'order-1', orderNumber: 'ORD1', status: 'pending', paymentStatus: 'pending', sessionId: 'cs_test_fixture', checkoutUrl: 'https://checkout.stripe.com/fixture' }, requestId: 'r' }));
  }
  if (url.pathname.endsWith('/checkout/order') && req.method === 'POST') {
    const orderNumber = `ORD-${randomUUID()}`;
    const pickup = cart.fulfillment?.mode === 'pickup';
    orders.set(orderNumber, { email: cart.email, orderNumber, status: 'pending', paymentStatus: 'pending', tracking: null, fulfillment: { mode: pickup ? 'pickup' : 'ship', pickupLocationId: pickup ? cart.fulfillment.pickupLocationId : null, pickupStatus: pickup ? 'pending' : null, pickupReadyAt: null, pickupLocation: pickup ? { id: cart.fulfillment.pickupLocationId, name: 'Saved downtown pickup', addressLine1: '1 Saved Street', phone: '555-0100' } : null } });
    res.statusCode = 201; return res.end(JSON.stringify({ data: { orderId: 'order-1', orderNumber, status: 'pending', paymentStatus: 'pending', requiresPayment: false }, requestId: 'r' }));
  }
  if (url.pathname.endsWith('/orders/lookup') && req.method === 'POST') {
    const input = JSON.parse(raw); const order = orders.get(input.orderNumber);
    if (order && order.email === input.email) { const { email, ...data } = order; return res.end(JSON.stringify({ data, requestId: 'r' })); }
  }
  res.statusCode = 404; res.end('{}');
}).listen(3101, '127.0.0.1');
