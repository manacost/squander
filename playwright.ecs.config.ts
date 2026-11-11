import type { PlaywrightTestConfig } from "@playwright/test";

const config: PlaywrightTestConfig = {
  testDir: "tests",
  testMatch: /ecs-browser\.spec\.[jt]s/,
  use: {
    browserName: "chromium",
    baseURL: "http://127.0.0.1:4174",
    headless: true,
  },
  webServer: {
    command: "vite dev --host 127.0.0.1 --port 4174",
    url: "http://127.0.0.1:4174",
    reuseExistingServer: false,
  },
};

export default config;
