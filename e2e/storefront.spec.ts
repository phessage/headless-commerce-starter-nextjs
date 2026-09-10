import { expect, test } from '@playwright/test';

test('refresh resolves a committed cart update and clears its stale error', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Add Trail Pack 24L to cart' }).click();
  await expect(page.getByText('Quantity: 1', { exact: true })).toBeVisible();
  await page.route('**/carts/current/items/*', async route => {
    const committed = await route.fetch({ maxRetries: 0, maxRedirects: 0 });
    expect(committed.status()).toBe(200);
    expect((await committed.json()).data.items[0].quantity).toBe(2);
    await route.abort('failed');
  }, { times: 1 });
  await page.getByRole('button', { name: 'Increase quantity of Trail Pack 24L' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Cart state is uncertain.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Increase quantity of Trail Pack 24L' })).toBeDisabled();
  await page.getByRole('button', { name: 'Refresh cart', exact: true }).click();
  await expect(page.getByText('Quantity: 2', { exact: true })).toBeVisible();
  await expect(page.getByRole('main').getByRole('alert')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Increase quantity of Trail Pack 24L' })).toBeEnabled();
});
test('loads catalog through the real route and updates cart UI',async({page})=>{
  const catalog=page.waitForResponse(r=>r.url().includes('/api/products')&&r.status()===200);
  await page.goto('/'); const response=await catalog; expect((await response.json()).data).toHaveLength(4);
  await expect(page.getByRole('heading',{name:'Trail Pack 24L'})).toBeVisible();
  await page.getByRole('button',{name:'Add Trail Pack 24L to cart'}).click();
  await expect(page.getByText('Cart (1)')).toBeVisible();
  await expect(page.getByRole('button',{name:'Add Alpine Shell to cart'})).toBeDisabled();
});
test('filters visible products and renders an empty state',async({page})=>{
  await page.goto('/'); await expect(page.getByRole('heading',{name:'Camp Mug'})).toBeVisible();
  await page.getByLabel('Search products').fill('pack');
  await expect(page.getByRole('heading',{name:'Trail Pack 24L'})).toBeVisible(); await expect(page.getByRole('heading',{name:'Camp Mug'})).toBeHidden();
  await page.getByLabel('Search products').fill('spaceship'); await expect(page.getByText(/No products match/)).toBeVisible();
});

test('requires an explicit variant and sends its ID through the real proxy', async ({ page }) => {
  const adds: unknown[] = [];
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().endsWith('/carts/current/items')) adds.push(request.postDataJSON());
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Add Camp Mug to cart' }).click();
  const choice = page.getByLabel('Variant for Camp Mug');
  await expect(choice).toBeVisible();
  await expect(page.getByText('Cart (0)')).toBeVisible();
  expect(adds).toEqual([]);
  await expect(choice.locator('option', { hasText: 'Green' })).toHaveJSProperty('disabled', true);
  await choice.selectOption({ label: 'Red' });
  await expect(page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Camp Mug' }) }).getByText('$28.00')).toBeVisible();
  const changed = page.waitForResponse((r) => r.url().endsWith('/carts/current/items') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Add Camp Mug to cart' }).click();
  expect((await (await changed).json()).data.items[0].unitPrice.amount).toBe('28.00');
  await expect(page.getByText('Cart (1)')).toBeVisible();
  expect(adds).toEqual([{ productId: '00000000-0000-4000-8000-000000000002', variantId: '10000000-0000-4000-8000-000000000002', quantity: 1 }]);
});
test('does not create a cart or choose a default when variant lookup fails', async ({ page }) => {
  const creates: string[] = [];
  page.on('request', (r) => { if (r.method() === 'POST') creates.push(r.url()); });
  await page.route('**/products/*/variants', (route) => route.fulfill({ status: 503, body: '{}' }));
  await page.goto('/');
  await page.getByRole('button', { name: 'Add Trail Pack 24L to cart' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Product options unavailable' })).toBeVisible();
  expect(creates).toEqual([]);
});

test('reviews, updates, restores and removes cart lines through the proxy', async ({ page }) => {
  await page.goto('/');
  const add = page.getByRole('button', { name: 'Add Trail Pack 24L to cart' });
  await expect(add).toBeEnabled();
  await add.click();
  const cart = page.getByRole('region', { name: 'Your cart', exact: true });
  await expect(cart.getByText('Quantity: 1')).toBeVisible();
  const changed = page.waitForResponse(r => /\/carts\/current\/items\/[0-9a-f-]+$/.test(r.url()) && r.request().method() === 'PATCH');
  await cart.getByRole('button', { name: 'Increase quantity of Trail Pack 24L' }).click();
  const response = await changed;
  expect(response.status()).toBe(200);
  expect(response.request().postDataJSON()).toEqual({ quantity: 2 });
  expect((await response.json()).data.totals.total).toBe('178.00');
  await expect(cart.getByText('Quantity: 2')).toBeVisible();
  await expect(cart.locator('dd').last()).toHaveText('$178.00');
  await page.reload();
  await expect(cart.getByText('Quantity: 2')).toBeVisible();
  const removed = page.waitForResponse(r => r.request().method() === 'DELETE' && r.url().includes('/carts/current/items/'));
  await cart.getByRole('button', { name: 'Remove Trail Pack 24L' }).click();
  expect((await (await removed).json()).data.items).toEqual([]);
  await expect(cart.getByText('Your cart is empty.')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Checkout preparation' })).toHaveCount(0);
});

test('keeps server-selected delivery and payment visible after selection', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Add Trail Pack 24L to cart' }).click();
  await page.getByLabel('Email', { exact: true }).fill('shopper@example.test');
  await page.getByLabel('First name').fill('Test');
  await page.getByLabel('Last name').fill('Shopper');
  await page.getByLabel('Address', { exact: true }).fill('1 Test Way');
  await page.getByLabel('City', { exact: true }).fill('Vancouver');
  await page.getByLabel('State', { exact: true }).fill('BC');
  await page.getByLabel('Postal code', { exact: true }).fill('V6B 1A1');
  await page.getByRole('button', { name: 'Load delivery and payment options' }).click();
  await page.getByLabel('Shipping method').selectOption('shipping');
  await expect(page.getByLabel('Shipping method')).toHaveValue('shipping');
  await page.getByLabel('Payment method').selectOption('bank');
  await expect(page.getByLabel('Payment method')).toHaveValue('bank');
  await expect(page.getByLabel('Shipping method')).toHaveValue('shipping');
  await expect(page.getByTestId('checkout-submit')).toBeEnabled();
});


test('uses country rules, persists separate addresses and invalidates prepared checkout after edits', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Add Trail Pack 24L to cart' }).click();
  await expect(page.getByLabel('State', { exact: true })).toHaveAttribute('required', '');
  for (const [label, value] of Object.entries({ Email: 'buyer@example.com', 'First name': 'Ada', 'Last name': 'Buyer', Address: '1 Billing', City: 'Hong Kong', 'Country code': 'HK' })) await page.getByLabel(label, { exact: true }).fill(value);
  await expect(page.getByLabel('State', { exact: true })).not.toHaveAttribute('required');
  await page.getByRole('checkbox', { name: 'Ship to billing address' }).uncheck();
  for (const [label, value] of Object.entries({ 'Shipping first name': 'Grace', 'Shipping last name': 'Buyer', 'Shipping address': '2 Shipping', 'Shipping city': 'Vancouver', 'Shipping state': 'BC', 'Shipping postal code': 'V6B 1A1' })) await page.getByLabel(label, { exact: true }).fill(value);
  const prepared = page.waitForResponse(r => r.url().endsWith('/checkout') && r.request().method() === 'PATCH');
  await page.getByRole('button', { name: 'Load delivery and payment options' }).click();
  const data = (await (await prepared).json()).data;
  expect(data.cart.billingAddress.country).toBe('HK'); expect(data.cart.shippingAddress.country).toBe('CA'); expect(data.cart.shippingAddress.firstName).toBe('Grace');
  await expect(page.getByLabel('Payment method')).toBeVisible();
  await page.getByLabel('Address', { exact: true }).fill('3 Updated');
  await expect(page.getByLabel('Payment method')).toHaveCount(0);
  await expect(page.getByTestId('checkout-submit')).toHaveCount(0);
});

test('persists pickup then delivery and renders eligible location information', async ({ page }) => {
  await page.goto('/'); await page.getByRole('button', { name: 'Add Trail Pack 24L to cart' }).click();
  for (const [label, value] of Object.entries({ Email: 'buyer@example.com', 'First name': 'Ada', 'Last name': 'Buyer', Address: '1 Main', City: 'Vancouver', State: 'BC', 'Postal code': 'V6B 1A1' })) await page.getByLabel(label, { exact: true }).fill(value);
  await page.getByRole('button', { name: 'Load delivery and payment options' }).click();
  await expect(page.getByRole('option', { name: /Sold out pickup/ })).toHaveAttribute('disabled', '');
  const selected = page.waitForResponse(r => r.url().endsWith('/checkout') && r.request().method() === 'PATCH');
  await page.getByLabel('Delivery or pickup').selectOption('20000000-0000-4000-8000-000000000001');
  expect((await (await selected).json()).data.fulfillment.mode).toBe('pickup');
  await expect(page.getByText('1 Main Street', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Shipping method')).toHaveCount(0);
  await page.getByLabel('Delivery or pickup').selectOption('ship');
  await expect(page.getByLabel('Shipping method')).toBeVisible();
});
