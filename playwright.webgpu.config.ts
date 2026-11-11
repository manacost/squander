import type { PlaywrightTestConfig } from "@playwright/test";

const webgpu_args =
  process.platform === "linux"
    ? [
        "--headless=new",
        "--enable-gpu",
        "--enable-unsafe-webgpu",
        "--use-angle=vulkan",
        "--enable-features=Vulkan",
        "--disable-vulkan-surface",
      ]
    : ["--enable-unsafe-webgpu", "--enable-gpu"];

const config: PlaywrightTestConfig = {
  testDir: "tests",
  testMatch: /webgpu.*\.spec\.[jt]s/,
  use: {
    browserName: "chromium",
    baseURL: "http://127.0.0.1:5173",
    headless: true,
    launchOptions: {
      args: webgpu_args,
    },
  },
  webServer: {
    command: "vite dev --host 127.0.0.1",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: true,
  },
};

export default config;
