import { defineConfig, devices } from "@playwright/test";
const deployedOrigin = process.env.HEADLESS_STOREFRONT_URL;
if (deployedOrigin) {
  const parsed = new URL(deployedOrigin);
  if (parsed.protocol !== 'https:' || parsed.origin !== deployedOrigin || parsed.username || parsed.password) throw new Error('Use an exact HTTPS storefront origin');
}
export default defineConfig({
  testDir: "e2e-live",
  reporter: [["list"], ["html", { outputFolder: "playwright-live-report", open: "never" }]],
  use: { baseURL: deployedOrigin ?? "http://127.0.0.1:4175" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: deployedOrigin ? undefined : {
    command: "npm run dev -- --hostname 127.0.0.1 --port 4175",
    url: "http://127.0.0.1:4175",
    reuseExistingServer: false,
  },
});
