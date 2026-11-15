export const is_promise_like = (value: unknown): value is PromiseLike<unknown> => {
  if (value === null || (typeof value !== "object" && typeof value !== "function")) {
    return false;
  }
  return "then" in value && typeof value.then === "function";
};
