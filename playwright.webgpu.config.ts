import type { PlaywrightTestConfig } from "@playwright/test";

const config: PlaywrightTestConfig = {
  testDir: "verification",
  testMatch: /webgpu\.spec\.[jt]s/,
  use: {
    browserName: "chromium",
    baseURL: "http://127.0.0.1:5173",
    headless: true,
    launchOptions: {
      args: ["--enable-unsafe-webgpu", "--enable-gpu"],
    },
  },
  webServer: {
    command: "vite dev --host 127.0.0.1",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: true,
  },
};

export default config;
