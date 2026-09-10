import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
const store = '11111111-1111-4111-8111-111111111111';
const loader = `globalThis.fetch = async (url, options) => {
  if (options.redirect !== 'error' || !options.signal) throw Error('Expected bounded read without redirects');
  const path = new URL(url).pathname;
  const scenario = process.env.HOST_INSPECTION_SCENARIO;
  if (scenario === 'http-error') return new Response('{}', { status: 503 });
  if (path === '/api/health') return Response.json({status:'ready', storeId: scenario === 'wrong-store' ? 'wrong' : '${store}', apiOrigin: 'https://api.example'});
  if (path === '/api/products') return Response.json(scenario === 'bad-catalog' ? {} : {data:[]});
  throw Error('Unexpected request');
};`;
function run(scenario, host = 'https://store.example') {
  return spawnSync(process.execPath, ['--import', 'data:text/javascript,' + encodeURIComponent(loader), 'scripts/inspect-host.mjs', host, store, 'https://api.example'], {
    encoding: 'utf8', env: { ...process.env, HOST_INSPECTION_SCENARIO: scenario },
  });
}
test('reports matching runtime and empty catalog without claiming checkout qualification', () => {
  const result = run('empty'); assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout); assert.equal(report.storeId, store); assert.equal(report.returnedProducts, 0); assert.equal(report.checkoutQualified, false);
});
for (const scenario of ['wrong-store', 'http-error', 'bad-catalog']) test('fails host inspection for ' + scenario, () => assert.notEqual(run(scenario).status, 0));
for (const origin of ['http://store.example', 'https://user:password@store.example', 'https://store.example/path']) test('rejects non-origin or insecure host ' + origin, () => assert.notEqual(run('empty', origin).status, 0));
