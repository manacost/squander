export class ImageDecodeError extends Error {
  public constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = "ImageDecodeError";
  }
}

const create_abort_error = (): Error => new DOMException("image decode was aborted", "AbortError");

export const decode_image_source = async (source: Blob, signal?: AbortSignal): Promise<ImageBitmap> => {
  if (!(source instanceof Blob)) {
    throw new TypeError("image source must be a Blob or File");
  }
  if (signal?.aborted) {
    throw create_abort_error();
  }
  if (typeof createImageBitmap !== "function") {
    throw new ImageDecodeError("image decoding is unavailable in this runtime");
  }

  const bitmap_promise = createImageBitmap(source).catch((cause: unknown) => {
    throw new ImageDecodeError("image decoding failed", cause);
  });
  return new Promise<ImageBitmap>((resolve, reject) => {
    let settled = false;
    const abort = (): void => {
      settled = true;
      reject(create_abort_error());
    };
    signal?.addEventListener("abort", abort, { once: true });
    void bitmap_promise.then(
      (bitmap) => {
        signal?.removeEventListener("abort", abort);
        if (settled) {
          bitmap.close();
          return;
        }
        settled = true;
        resolve(bitmap);
      },
      (error: unknown) => {
        signal?.removeEventListener("abort", abort);
        if (settled) return;
        settled = true;
        reject(error);
      },
    );
  });
};
