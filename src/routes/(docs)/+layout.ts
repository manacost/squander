import type { LayoutLoad } from "./$types.js";
import { resolve } from "$app/paths";

export const load: LayoutLoad = async (event) => {
  const response = await event.fetch(resolve("/package"), { method: "GET" });
  const json = await response.json();
  return {
    package: json,
  };
};
