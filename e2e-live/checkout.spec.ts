import { expect, test } from "@playwright/test";
test("places and renders a real non-hosted order through the server proxy", async ({
  page,
}) => {
  const productId = process.env.HEADLESS_PRODUCT_ID;
  if (!productId || !process.env.HEADLESS_PUBLISHABLE_KEY) throw new Error("Allocated fixture environment is required");
  await page.goto("/");
  const add = page.locator(
    `button[data-product-id="${productId}"]`,
  );
  await expect(add).toBeVisible();
  const added = page.waitForResponse(
    (r) =>
      r.url().endsWith("/v1/headless/carts/current/items") &&
      r.status() === 201,
  );
  const variants = page.waitForResponse((r) => r.url().endsWith(`/products/${productId}/variants`)).then(async (response) => {
    expect(response.status(), 'Deploy the compatible public variants API before adopting this starter').toBe(200);
    const body = await response.json();
    expect(body.data.map((variant: { id: string }) => variant.id)).toEqual([process.env.HEADLESS_VARIANT_ID]);
  });
  await Promise.all([added, variants, add.click()]);
  await expect(page.getByText("Cart (1)")).toBeVisible();
  await page.getByLabel("Email", { exact: true }).fill("next-live@example.test");
  await page.getByLabel("First name").fill("Headless");
  await page.getByLabel("Last name").fill("Fixture");
  await page.getByLabel("Address").fill("1 Test Way");
  await page.getByLabel("City").fill("Vancouver");
  await page.getByLabel("State").fill("BC");
  await page.getByLabel("Postal code").fill("V6B1A1");
  const prepared = page.waitForResponse(
    (r) =>
      r.url().endsWith("/v1/headless/carts/current/checkout") &&
      r.request().method() === "PATCH" &&
      r.status() === 200,
  );
  await page
    .getByRole("button", { name: "Load delivery and payment options" })
    .click();
  const preparation = (await (await prepared).json()).data;
  const shipping = page.getByLabel("Shipping method"),
    payment = page.getByLabel("Payment method");
  await expect(payment.locator("option")).toHaveCount(2);
  if (preparation.shippingOptions.length > 0) {
    await expect(shipping.locator("option")).toHaveCount(preparation.shippingOptions.length + 1);
    const shippingSelected = page.waitForResponse((r) => r.url().endsWith("/checkout/shipping-method") && r.status() === 200);
    await shipping.selectOption({ index: 1 });
    await shippingSelected;
  } else await expect(shipping.locator("option")).toHaveCount(1);
  const paymentSelected = page.waitForResponse(
    (r) => r.url().endsWith("/checkout/payment-method") && r.status() === 200,
  );
  await payment.selectOption({ index: 1 });
  await paymentSelected;
  await expect(page.getByText("No preparation gaps")).toBeVisible();
  const placed = page.waitForResponse(
    (r) =>
      r.url().endsWith("/checkout/order") &&
      r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Place pending order" }).click();
  const response = await placed;
  const body = await response.json();
  expect(response.status(), JSON.stringify(body)).toBe(201);
  expect(body.data.requiresPayment).toBe(false);
  expect(body.data.paymentStatus).toBe("pending");
  console.log(`Next.js live order: ${body.data.orderNumber}`);
  await expect(
    page.getByRole("heading", { name: new RegExp(`Order ${body.data.orderNumber} placed`) }),
  ).toBeVisible();
  await page.reload();
  await page.getByLabel("Order number").fill(body.data.orderNumber);
  await page.getByLabel("Order email").fill("next-live@example.test");
  const reopened = page.waitForResponse((r) => r.url().endsWith("/v1/headless/orders/lookup") && r.request().method() === "POST");
  await page.getByRole("button", { name: "Check order status" }).click();
  const lookup = await reopened; expect(lookup.status()).toBe(201);
  await expect(page.getByRole("heading", { name: `Order ${body.data.orderNumber}` })).toBeVisible();
});
