import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
const storeId = '01f5b02f-d7c0-42cd-b880-59f78ea70aa3';
const products = [
  { id: '00000000-0000-4000-8000-000000000001', name: 'Trail Pack 24L', description: 'Pack', price: { amount: '89', currency: 'USD' }, available: true },
  { id: '00000000-0000-4000-8000-000000000002', name: 'Camp Mug', description: 'Mug', price: { amount: '24', currency: 'USD' }, available: true },
  { id: '00000000-0000-4000-8000-000000000003', name: 'Alpine Shell', description: 'Shell', price: { amount: '219', currency: 'USD' }, available: false },
];
const variants = (product) => product.id.endsWith('2') ? [
  { id: '10000000-0000-4000-8000-000000000001', title: 'Blue', price: { amount: '26.00', currency: 'USD' }, selectedOptions: { Colour: 'Blue' }, available: true },
  { id: '10000000-0000-4000-8000-000000000002', title: 'Red', price: { amount: '28.00', currency: 'USD' }, selectedOptions: { Colour: 'Red' }, available: true },
  { id: '10000000-0000-4000-8000-000000000003', title: 'Green', price: { amount: '24.00', currency: 'USD' }, selectedOptions: { Colour: 'Green' }, available: false },
] : [{ id: '10000000-0000-4000-8000-000000000004', title: 'Default', price: product.price, selectedOptions: {}, available: product.available }];
const carts = new Map();
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
    const cart = { id: randomUUID(), items: [], selectedPaymentMethodId: null, selectedShippingMethodId: null }; carts.set(token, cart);
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
    cart.items.push({ id: randomUUID(), quantity: input.quantity, variantId: selected.id, unitPrice: selected.price }); res.statusCode = 201; return res.end(JSON.stringify({ data: cart, requestId: 'r' }));
  }
  const checkout = () => ({ ...cart, cart, shippingOptions: [{ id: 'shipping', name: 'Delivery' }], paymentMethods: [
    { id: 'card', name: 'Card with merchant provider', capabilities: { requiresHostedCheckout: true, canPlaceOrder: false } },
    { id: 'bank', name: 'Bank transfer', capabilities: { requiresHostedCheckout: false, canPlaceOrder: true } },
  ], ready: Boolean(cart.selectedShippingMethodId && cart.selectedPaymentMethodId), missing: [] });
  if (url.pathname.endsWith('/checkout') && ['PATCH', 'GET'].includes(req.method)) return res.end(JSON.stringify({ data: checkout(), requestId: 'r' }));
  if (url.pathname.endsWith('/shipping-method') && req.method === 'PUT') { cart.selectedShippingMethodId = JSON.parse(raw).id; return res.end(JSON.stringify({ data: checkout(), requestId: 'r' })); }
  if (url.pathname.endsWith('/payment-method') && req.method === 'PUT') { cart.selectedPaymentMethodId = JSON.parse(raw).id; return res.end(JSON.stringify({ data: checkout(), requestId: 'r' })); }
  if (url.pathname.endsWith('/payment-session') && req.method === 'POST') {
    res.statusCode = 201; res.setHeader('x-request-id', 'hosted-upstream');
    return res.end(JSON.stringify({ data: { orderId: 'order-1', orderNumber: 'ORD1', status: 'pending', paymentStatus: 'pending', sessionId: 'cs_test_fixture', checkoutUrl: 'https://checkout.stripe.com/fixture' }, requestId: 'r' }));
  }
  if (url.pathname.endsWith('/checkout/order') && req.method === 'POST') {
    res.statusCode = 201; return res.end(JSON.stringify({ data: { orderId: 'order-1', orderNumber: 'ORD1', status: 'pending', paymentStatus: 'pending', requiresPayment: false }, requestId: 'r' }));
  }
  res.statusCode = 404; res.end('{}');
}).listen(3101, '127.0.0.1');
