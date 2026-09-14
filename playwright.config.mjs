import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  outputDir: "build/browser-results",
  workers: 1,
  timeout: 60000,
  use: {
    headless: true,
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
    viewport: { width: 1440, height: 1000 },
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "repository-subpath",
      use: { baseURL: "http://127.0.0.1:4188/life-cellular-playground/" },
    },
    { name: "static-root", use: { baseURL: "http://127.0.0.1:4189/" } },
  ],
  webServer: [
    {
      command:
        "node server.mjs --dir build/wasm/site --base /life-cellular-playground/ --port 4188",
      url: "http://127.0.0.1:4188/life-cellular-playground/",
      reuseExistingServer: false,
    },
    {
      command: "node server.mjs --dir build/wasm/site --port 4189",
      url: "http://127.0.0.1:4189/",
      reuseExistingServer: false,
    },
  ],
});
