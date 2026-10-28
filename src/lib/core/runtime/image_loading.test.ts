import { describe, expect, it, vi } from "vitest";
import { decode_image_source, ImageDecodeError } from "./image_loading.js";

describe("[dynamic-assets] image source decoding", () => {
  it("decodes a Blob through the browser bitmap API", async () => {
    const bitmap = { close: vi.fn() } as unknown as ImageBitmap;
    const decode = vi.fn(async () => bitmap);
    vi.stubGlobal("createImageBitmap", decode);

    await expect(decode_image_source(new Blob(["image"]))).resolves.toBe(bitmap);
    expect(decode).toHaveBeenCalledOnce();
  });

  it("accepts File values through the Blob contract", async () => {
    const bitmap = { close: vi.fn() } as unknown as ImageBitmap;
    vi.stubGlobal("createImageBitmap", vi.fn(async () => bitmap));
    const file = new File(["image"], "avatar.png", { type: "image/png" });

    await expect(decode_image_source(file)).resolves.toBe(bitmap);
  });

  it("rejects invalid, unsupported, and already-aborted inputs", async () => {
    vi.stubGlobal("createImageBitmap", undefined);
    const controller = new AbortController();
    controller.abort();
    await expect(decode_image_source({} as Blob)).rejects.toBeInstanceOf(TypeError);
    await expect(decode_image_source(new Blob(), controller.signal)).rejects.toThrow("image decode was aborted");
    await expect(decode_image_source(new Blob())).rejects.toBeInstanceOf(ImageDecodeError);
  });

  it("closes a decoded bitmap that finishes after cancellation", async () => {
    let resolve_decode!: (bitmap: ImageBitmap) => void;
    const bitmap = { close: vi.fn() } as unknown as ImageBitmap;
    vi.stubGlobal(
      "createImageBitmap",
      () =>
        new Promise<ImageBitmap>((resolve) => {
          resolve_decode = resolve;
        }),
    );
    const controller = new AbortController();
    const pending = decode_image_source(new Blob(), controller.signal);
    controller.abort();
    await expect(pending).rejects.toThrow("image decode was aborted");
    resolve_decode(bitmap);
    await Promise.resolve();
    await Promise.resolve();
    expect(bitmap.close).toHaveBeenCalledOnce();
  });

  it("wraps browser decode failures with a typed error", async () => {
    vi.stubGlobal("createImageBitmap", vi.fn(async () => Promise.reject(new Error("bad image"))));
    await expect(decode_image_source(new Blob())).rejects.toMatchObject({ name: "ImageDecodeError" });
  });

  it("ignores a decode rejection that arrives after cancellation", async () => {
    let reject_decode!: (error: Error) => void;
    vi.stubGlobal(
      "createImageBitmap",
      () =>
        new Promise<ImageBitmap>((_, reject) => {
          reject_decode = reject;
        }),
    );
    const controller = new AbortController();
    const pending = decode_image_source(new Blob(), controller.signal);
    controller.abort();
    await expect(pending).rejects.toThrow("image decode was aborted");
    reject_decode(new Error("late failure"));
    await Promise.resolve();
    await Promise.resolve();
  });
});
