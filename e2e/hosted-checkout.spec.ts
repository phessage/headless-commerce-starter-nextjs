import { expect, test } from '@playwright/test';

test('keeps cart proof in HttpOnly cookies, restores a cart, and hands off hosted checkout', async ({ page, request }) => {
  await page.route('https://checkout.stripe.com/fixture', route => route.fulfill({ contentType: 'text/html', body: '<h1>Test payment provider</h1>' }));
  await page.goto('/');
  await page.getByRole('button', { name: 'Add Trail Pack 24L to cart' }).click();
  await expect(page.getByText('Cart (1)')).toBeVisible();
  expect(await page.evaluate(() => document.cookie)).not.toContain('1ecomm-cart');
  await page.reload();
  await expect(page.getByText('Cart (1)')).toBeVisible();
  for (const [label, value] of Object.entries({ Email: 'buyer@example.com', 'First name': 'Ada', 'Last name': 'Buyer', Address: '123 Test Street', City: 'Vancouver', State: 'BC', 'Postal code': 'V6B 1A1' })) {
    await page.getByLabel(label, { exact: true }).fill(value);
  }
  await page.getByRole('button', { name: 'Load delivery and payment options' }).click();
  const shipping = page.waitForResponse(r => r.url().endsWith('/checkout/shipping-method') && r.status() === 200);
  await page.getByLabel('Shipping method').selectOption('shipping');
  await shipping;
  const payment = page.waitForResponse(r => r.url().endsWith('/checkout/payment-method') && r.status() === 200);
  await page.getByLabel('Payment method').selectOption('card');
  await payment;
  const handoff = page.waitForResponse(r => r.url().endsWith('/checkout/payment-session') && r.status() === 201);
  await page.getByTestId('checkout-submit').click();
  expect((await handoff).headers()['x-request-id']).toBe('hosted-upstream');
  await expect(page.getByRole('heading', { name: 'Test payment provider' })).toBeVisible();
  const wire = (await (await request.get('http://127.0.0.1:3101/__requests')).json()).filter((r: { path: string }) => r.path.endsWith('/payment-session'));
  expect(wire.length).toBeGreaterThan(0);
  expect(wire.at(-1).headers['x-publishable-key']).toBe('pk_test_demo');
  expect(wire.at(-1).headers['x-cart-token']).toMatch(/^hc_/);
  expect(wire.at(-1).headers['idempotency-key']).toBeTruthy();
  expect(JSON.parse(wire.at(-1).body).successUrl).toBe('http://127.0.0.1:3100/?checkout=returned');
  await page.goto('/?checkout=returned&session_id=forged-paid');
  await expect(page.getByTestId('storefront-status')).toContainText('Payment is not confirmed');
});

test('fixed proxy rejects unsupported method, foreign origin, extra queries and oversized bodies', async ({ request }) => {
  expect((await request.delete('/api/headless/v1/headless/carts')).status()).toBe(405);
  expect((await request.post('/api/headless/v1/headless/carts', { headers: { origin: 'https://foreign.example' } })).status()).toBe(403);
  expect((await request.get('/api/headless/v1/headless/carts/current?siteId=other')).status()).toBe(400);
  expect((await request.post('/api/headless/v1/headless/carts', { data: 'x'.repeat(70_000) })).status()).toBe(400);
  expect((await request.post('/api/headless/v1/headless/admin/orders')).status()).toBe(404);
});
