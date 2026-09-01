import { createServer } from 'node:http';
const storeId = '01f5b02f-d7c0-42cd-b880-59f78ea70aa3';
const products = [
  { id: 'p1', name: 'Trail Pack 24L', description: 'Pack', price: { amount: '89', currency: 'USD' }, available: true },
  { id: 'p2', name: 'Camp Mug', description: 'Mug', price: { amount: '24', currency: 'USD' }, available: true },
  { id: 'p3', name: 'Alpine Shell', description: 'Shell', price: { amount: '219', currency: 'USD' }, available: false },
];
createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1:3101'); res.setHeader('content-type', 'application/json');
  if (url.pathname === `/v1/headless/stores/${storeId}/config`) return res.end(JSON.stringify({ data: { storeId, apiUrl: 'http://127.0.0.1:3101', publishableKey: 'pk_test_demo', apiVersion: 'v1', capabilities: ['catalog', 'cart', 'checkout-preparation'] }, requestId: 'r' }));
  if (url.pathname === '/v1/headless/products') { const q = (url.searchParams.get('query') ?? '').toLowerCase(); return res.end(JSON.stringify({ data: products.filter((p) => p.name.toLowerCase().includes(q)), nextCursor: null, requestId: 'r' })); }
  if (url.pathname === '/v1/headless/carts' && req.method === 'POST') { res.statusCode = 201; return res.end(JSON.stringify({ data: { items: [] }, cartToken: `hc_${'a'.repeat(43)}`, created: true, requestId: 'r' })); }
  if (url.pathname === '/v1/headless/carts/current/items' && req.method === 'POST') { res.statusCode = 201; return res.end(JSON.stringify({ data: { items: [{ id: 'line', quantity: 1 }] }, requestId: 'r' })); }
  res.statusCode = 404; res.end('{}');
}).listen(3101, '127.0.0.1');
