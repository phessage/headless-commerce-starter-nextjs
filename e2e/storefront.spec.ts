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
