// Read-only merchant deployment diagnostic. Does not create carts, orders or payments.
const [host, storeId, apiOrigin] = process.argv.slice(2);
if (!host || !storeId || !apiOrigin) throw new Error('Usage: npm run host:inspect -- https://store.example STORE_UUID https://api.1ecomm.com');
const origin = new URL(host);
const api = new URL(apiOrigin);
if (origin.protocol !== 'https:' || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) throw new Error('Supply the exact HTTPS storefront origin');
if (api.protocol !== 'https:' || api.username || api.password || api.pathname !== '/' || api.search || api.hash) throw new Error('Supply the exact HTTPS API origin');
if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(storeId)) throw new Error('Supply the expected store UUID');
async function read(path) {
  const response = await fetch(new URL(path, origin), { redirect: 'error', signal: AbortSignal.timeout(10000), headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.json();
}
const health = await read('/api/health');
if (health.status !== 'ready' || health.storeId !== storeId || health.apiOrigin !== api.origin) throw new Error('Deployed runtime does not match the expected store/API');
const catalog = await read('/api/products?limit=1');
if (!Array.isArray(catalog.data)) throw new Error('Deployed catalog did not return the headless collection contract');
console.log(JSON.stringify({ observedAt: new Date().toISOString(), storefrontOrigin: origin.origin, storeId, apiOrigin: api.origin, runtimeMatches: true, catalogReachable: true, returnedProducts: catalog.data.length, checkoutQualified: false, nextStep: 'Run the real browser cart, checkout and order journey on this host. An empty catalog requires published products before shopper acceptance.' }, null, 2));
