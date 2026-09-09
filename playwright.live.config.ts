import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "e2e-live",
  reporter: [["list"], ["html", { outputFolder: "playwright-live-report", open: "never" }]],
  use: { baseURL: "http://127.0.0.1:4175" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 4175",
    url: "http://127.0.0.1:4175",
    reuseExistingServer: false,
  },
});
