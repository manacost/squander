---
name: Squander
description: A distinct, creative, tech-y game engine workbench for building browser games
colors:
  signal-red: "var(--red-4)"
  carbon-rail: "#232121"
  ink: "#151923"
  instrument-slate: "#39435b"
  slate-hover: "#4a5a7b"
  canvas-black: "#05070d"
  paper: "#eef2fb"
  paper-ink: "#26334e"
  muted-blue: "#6076a8"
  white: "#ffffff"
  graphite: "#444444"
typography:
  display:
    fontFamily: "Geo, sans-serif"
    fontSize: "1.5em"
    fontWeight: 400
    lineHeight: 1.2
  headline:
    fontFamily: "Geo, sans-serif"
    fontSize: "2rem"
    fontWeight: 400
    lineHeight: 1.2
  body:
    fontFamily: "system-ui, sans-serif"
    fontSize: "1rem"
    lineHeight: 1.5
  label:
    fontFamily: "system-ui, sans-serif"
    fontSize: "0.8rem"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "0.08em"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "0.75rem"
  lg: "1rem"
  xl: "1.25rem"
  section: "2rem"
  rail: "3rem"
components:
  nav-link:
    backgroundColor: "transparent"
    textColor: "{colors.signal-red}"
    padding: "0.25em 0.5em"
  nav-link-active:
    backgroundColor: "hsla(0deg, 0%, 0%, 0.2)"
    textColor: "{colors.white}"
    padding: "0.25em 0.5em"
  proof-surface:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.white}"
    padding: "1.25rem"
  proof-button:
    backgroundColor: "{colors.instrument-slate}"
    textColor: "{colors.white}"
    padding: "0.65rem 0.9rem"
  code-surface:
    backgroundColor: "{colors.ink}"
    textColor: "#b9b5b8"
    padding: "1rem"
---

# Design System: Squander

## Overview

**Creative North Star: "The game engine workbench"**

Squander's interface should feel like a well-used workbench for making game
systems: focused, capable, and built around the tools rather than decoration.
The visual language is distinct, creative, and tech-y through geometric type,
dark instrument surfaces, compact navigation, and a single signal-red accent.
It stays grounded in the actual work of reading API contracts, copying code,
and inspecting live rendering proofs.

The system is flat and practical. Contrast, borders, spacing, and tonal changes
make hierarchy legible without relying on glows, gradients, or ornamental
effects. Controls should feel compact and quietly tactile: small enough to stay
out of the way, clear enough to invite use. Panels and examples stay open to
the page instead of becoming rounded wells.

**Key Characteristics:**

- Workbench-like rather than showroom-like
- Geometric headings with restrained utility text
- Carbon rail, dark proof surfaces, and signal-red navigation
- Flat depth with compact, square controls
- Creative through composition and type, not effects

## Colors

The palette pairs a carbon-black documentation rail with instrument slate proof
surfaces, cool paper notes, and a rare signal-red brand accent.

### Primary

- **Signal red** (`var(--red-4)`): Use for visited links, brand emphasis, and small moments of navigation feedback. Keep it scarce enough to retain signal value.

### Neutral

- **Carbon rail** (`#232121`): The persistent navigation surface.
- **Ink** (`#151923`): Code blocks, proof panels, and dark embedded work areas.
- **Canvas black** (`#05070d`): Game-rendering canvases and GPU-facing examples.
- **Instrument slate** (`#39435b`): Structural controls, flow cards, borders, and action surfaces.
- **Slate hover** (`#4a5a7b`): Hover state for slate actions.
- **Graphite** (`#444444`): Navigation glyphs and quiet separators.
- **White** (`#ffffff`): Active navigation and high-contrast text on dark surfaces.
- **Paper** (`#eef2fb`): The light note surface for explanatory callouts.
- **Paper ink** (`#26334e`): Text on paper notes.
- **Muted blue** (`#6076a8`): The structural edge of paper notes.

### Named Rules

**The Signal Rule.** Use the red accent as a deliberate navigation signal, not
as a general decoration or a full-surface wash.

**The No-Glow Rule.** Do not use luminous halos, neon glows, or gradients to
make the interface feel technical. Let structure and contrast do that work.

## Typography

**Display Font:** Geo, with a sans-serif fallback
**Body Font:** The system sans-serif stack supplied by the normalized document
styles
**Label/Mono Font:** Fira Mono for code; Tomorrow remains available for
technical display variants when explicitly needed.

**Character:** Geo gives the workbench its unmistakable geometric voice.
Utility text stays quieter and more readable, while code uses a compact
monospace face that makes examples feel executable rather than ornamental.

### Hierarchy

- **Display** (400, `1.5em`, approximately 1.2 line-height): Product title and persistent rail identity.
- **Headline** (400, route-defined `h1`/`h2` scale): Page and section titles that orient the reader.
- **Title** (400, route-defined heading scale): Guide subsections and proof labels.
- **Body** (400, `1rem`, approximately 1.5 line-height): Explanations, summaries, and documentation prose.
- **Label** (400, `0.8rem`, `0.08em`, uppercase where used): Eyebrows and compact metadata.

### Named Rules

**The Two-Speed Type Rule.** Headings carry the personality; body and code
carry the information. Never make utility text compete with a guide title.

## Layout

Documentation uses a two-part workbench: a persistent left rail and a flexible
reading surface. At desktop widths, the rail is 14rem wide and the page sits
beside it with a 2.5vw gap. The rail fills the viewport height, while the page
uses the remaining width and can grow vertically.

On smaller screens, the layout collapses into a single column. The rail becomes
part of the document flow with approximately 2rem horizontal padding, and the
reading surface follows with the same breathing room. Guide content generally
stays within approximately 900–960px, with summaries capped around 48–52rem
for comfortable reading.

The spacing rhythm is compact but deliberate: `0.5rem` for list gaps,
`0.75rem` for small internal gaps, `1.25rem` for proof surfaces, and `2rem`
for section separation. Code and rendered proofs are allowed to scroll rather
than forcing the page to overflow horizontally.

## Elevation & Depth

The system is flat by default. It uses dark and light tonal blocks, open spacing,
and thin rules to separate work areas. There is no established shadow vocabulary;
do not add one casually. A proof surface or code block should read as part of the
workbench through its typography, spacing, and edge rules, not through a floating
card or rounded well.

### Named Rules

**The Flat Workbench Rule.** Depth comes from adjacent surfaces and clear
edges. Reserve stronger contrast for an active, actionable, or rendered state.

## Shapes

Shapes are square and structural. Navigation links, proof surfaces, buttons,
flow diagrams, notes, and code blocks do not use rounded corners. Borders are
thin and used as rules or edges rather than as frames around every object. Avoid
capsules, decorative clipping, and boxed wells.

## Components

### Buttons and action links

- **Shape:** Compact, square, and quietly tactile.
- **Primary/action surface:** Instrument slate background (`#39435b`) with white text and `0.65rem 0.9rem` padding.
- **Hover:** Shift to slate hover (`#4a5a7b`) without glow or lift.
- **Focus:** Preserve a visible browser or project focus treatment; never rely on color alone.

### Navigation

- **Style:** Vertical, compact, and text-led in the carbon rail (`#232121`).
- **Default:** Small padded links with a quiet `⋱` marker and a signal-red visited state.
- **Active:** White text on a translucent black block with a `⋊` marker.
- **Nested items:** Indented by approximately `0.75rem` and slightly reduced in size.

### Cards and proof containers

- **Corner Style:** Square; no rounded container treatment.
- **Background:** Keep proof surfaces open to the page; use dark ink (`#151923`) only when the rendered proof needs a distinct field.
- **Border:** Thin top and bottom rules (`#39435b`) instead of a complete frame.
- **Internal Padding:** `1.25rem` vertical for proof panels; `0.75rem` vertical for flow items.
- **Behavior:** Pair explanation with a live or inspectable proof. The section should make the evidence easier to read, not become a card-shaped well.

### Code blocks

- **Style:** Scrollable code surface with Fira Mono, approximately `1rem` vertical padding, and thin structural rules.
- **Color:** Hopscotch syntax colors are allowed inside the code surface; keep the surrounding UI restrained.

### Notes

- **Style:** Paper ink (`#26334e`) with light structural rules (`#6076a8`); avoid a filled callout well.
- **Behavior:** Use for explanatory scope, limitations, or important caveats—not as a generic callout decoration.

## Do's and Don'ts

### Do:

- **Do** make the interface feel like a capable game-engine workbench.
- **Do** let Geo headings, compact spacing, and dark instrument surfaces carry the identity.
- **Do** use the signal-red accent sparingly for navigation and meaningful emphasis.
- **Do** keep proof panels, code examples, and controls close to the content they explain.
- **Do** preserve flat depth, thin structural rules, and square controls.
- **Do** keep technical surfaces readable at mobile widths through wrapping or scrolling.

### Don't:

- **Don't** use hacker clichés, terminal-wall decoration, or novelty code rain as visual identity.
- **Don't** add glows, neon halos, gradient backgrounds, or gradient text.
- **Don't** turn every surface into a floating card, shadowed panel, or rounded well.
- **Don't** over-round controls into pills or make the documentation feel like a marketing landing page.
- **Don't** spend the accent color everywhere; its rarity is part of the system.
