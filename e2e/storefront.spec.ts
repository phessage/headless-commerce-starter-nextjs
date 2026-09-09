import { expect, test } from '@playwright/test';
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
