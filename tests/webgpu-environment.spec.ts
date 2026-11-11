import { expect, test } from "@playwright/test";

test("records the real WebGPU verification environment", async ({ browser, page }) => {
  await page.goto("/");
  const viewport = page.viewportSize();
  const environment = await page.evaluate(async () => {
    if (!window.isSecureContext) throw new Error("WebGPU verification requires a secure context");
    if (!("gpu" in navigator)) throw new Error("navigator.gpu is unavailable");
    const adapter = await navigator.gpu.requestAdapter();
    if (adapter === null) throw new Error("WebGPU adapter creation failed");
    const device = await adapter.requestDevice();
    const info = adapter.info;
    const adapter_description = info.description.toLowerCase();
    const adapter_architecture = info.architecture.toLowerCase();
    return {
      secure_context: window.isSecureContext,
      browser_gpu: true,
      adapter: true,
      device: true,
      adapter_vendor: info.vendor,
      adapter_architecture: info.architecture,
      adapter_device: info.device,
      adapter_description: info.description,
      hardware_adapter: adapter_architecture !== "swiftshader" && !adapter_description.includes("swiftshader"),
      device_pixel_ratio: window.devicePixelRatio,
      fixture_width: 1,
      fixture_height: 1,
      device_lost_promise: device.lost instanceof Promise,
    };
  });

  const record = {
    browser: browser.version(),
    os: process.platform,
    viewport,
    ...environment,
  };
  void test.info().attach("webgpu-environment.json", {
    body: JSON.stringify(record, null, 2),
    contentType: "application/json",
  });

  expect(record.secure_context).toBe(true);
  expect(record.browser_gpu).toBe(true);
  expect(record.adapter).toBe(true);
  expect(record.device).toBe(true);
  expect(record.hardware_adapter).toBe(true);
  expect(record.device_lost_promise).toBe(true);
});
