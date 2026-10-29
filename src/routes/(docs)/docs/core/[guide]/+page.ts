import { error } from "@sveltejs/kit";
import { core_guides } from "../../../../../lib/docs/core-guides.js";
import type { EntryGenerator, PageLoad } from "./$types.js";

export const prerender = true;

export const entries: EntryGenerator = () => core_guides.map(({ slug }) => ({ guide: slug }));

export const load: PageLoad = ({ params }) => {
  const guide = core_guides.find((candidate) => candidate.slug === params.guide);
  if (guide === undefined) error(404, "Core guide not found");
  return { guide };
};
