import type { LayoutLoad } from "./$types.js";
import { resolve } from "$app/paths";

export const load: LayoutLoad = async (event) => {
  const response = await event.fetch(resolve("/package"), { method: "GET" });
  const json: unknown = await response.json();
  if (json === null || typeof json !== "object" || !("version" in json) || typeof json.version !== "string") {
    throw new Error("package metadata is invalid");
  }
  return {
    package: json,
  };
};
