import pkg from "../../../package.json" with { type: "json" };

// eslint-disable-next-line @typescript-eslint/naming-convention -- SvelteKit requires the GET export name.
export const GET = (_request: Request) => {
  return Response.json(pkg);
};
