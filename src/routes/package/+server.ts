// import pkg from "../../../package.json";
import { read } from "$app/server";
import pkg from "../../../package.json" with { type: "json" };
import { json } from "@sveltejs/kit";

export const GET = async (request: Request) => {
  return json(pkg);
  //   const response = read(pkg);
  //   const json = await response.json();

  //   return json;
};
