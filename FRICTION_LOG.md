# Friction log

Record recurring development and deployment problems here with their cause and prevention.

## 2026-11-05 — Root-relative static resources break GitHub Pages deployments

- Symptom: a resource such as `/fonts/GeostarFill-Regular.ttf` works at the local site root but fails on the published site at `/squander/docs/examples/text`.
- Cause: a leading slash resolves from the domain root, so the browser requests `https://manacost.github.io/fonts/GeostarFill-Regular.ttf` instead of preserving the repository base path.
- Prevention: in SvelteKit site code, resolve files from `static/` with `asset("fonts/example.ttf")` from `$app/paths`; pass the resulting path to the loader or markup. Keep the core runtime independent of the site's deployment base.
- Verification: build with `BASE_PATH=/squander` and inspect the emitted page and JavaScript for `/squander/`-prefixed resource URLs.
