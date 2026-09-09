import { expect, test } from '@playwright/test';
test('loads catalog through the real route and updates cart UI',async({page})=>{
  const catalog=page.waitForResponse(r=>r.url().includes('/api/products')&&r.status()===200);
  await page.goto('/'); const response=await catalog; expect((await response.json()).data).toHaveLength(3);
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
