import { expect, test } from "@playwright/test";
test("prepares a real fixture cart through the server proxy", async ({
  page,
}) => {
  await page.goto("/");
  const add = page.locator(
    'button[data-product-id="1f7884bd-759d-4f47-9fdb-c7ea3dd3a9ef"]',
  );
  await expect(add).toBeVisible();
  const added = page.waitForResponse(
    (r) =>
      r.url().endsWith("/v1/headless/carts/current/items") &&
      r.status() === 201,
  );
  await add.click();
  await added;
  await expect(page.getByText("Cart (1)")).toBeVisible();
  await page.getByLabel("Email").fill("next-live@example.test");
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
  await prepared;
  const shipping = page.getByLabel("Shipping method"),
    payment = page.getByLabel("Payment method");
  await expect(shipping.locator("option")).toHaveCount(3);
  await expect(payment.locator("option")).toHaveCount(2);
  const shippingSelected = page.waitForResponse(
    (r) => r.url().endsWith("/checkout/shipping-method") && r.status() === 200,
  );
  await shipping.selectOption({ index: 1 });
  await shippingSelected;
  const paymentSelected = page.waitForResponse(
    (r) => r.url().endsWith("/checkout/payment-method") && r.status() === 200,
  );
  await payment.selectOption({ index: 1 });
  await paymentSelected;
  await expect(page.getByText("No preparation gaps")).toBeVisible();
});
