# Quiet game UI research

**Date:** 2026-11-11
**Question:** How should Squander's opt-in UI stylesheet feel quieter and less like a web document while remaining clear, accessible, and useful for HUDs and menus?

## Decision summary

Make “quiet” mean low visual competition, shallow information hierarchy, and restrained decoration. Do not make it mean low contrast, small text, faint focus, or ambiguous controls. A game UI should read as a purposeful instrument: the player can find the next action quickly, while the stylesheet stays out of the way of the game world and the application’s art direction.

The current direction is sound: a dark baseline, compact heading steps, semantic HTML, and opt-in tokens. The main refinement is to make hierarchy come from placement, grouping, spacing, state, and motion before it comes from large type or document-like typography.

## Findings

1. **Game UI is contextual and interactive, not page content.** The attached FUI guide asks designers to establish purpose, user, environment, control method, behavior, timing, and constraints before styling the interface. Its game-UI interview describes UI as a visual tool that carries the player from point A to B and says that less UI is often better for storytelling (Yuen, _FUI_, “Checklist: Approaching Your Interface,” pp. 49-52; “Interview: Davison Carvalho,” pp. 71-73).

2. **Quietness should preserve legibility under pressure.** The same guide asks whether the interface is obvious, readable in the time available, suited to its environment, and still believable in its world. It recommends establishing purpose before adding detail and using hierarchy, typography, space, proportion, color, and contrast deliberately (Yuen, “Checklist: Assessing Your Interface,” pp. 55-57; “Design considerations,” pp. 53-54).

3. **Accessibility sets a floor below which “quiet” cannot go.** WCAG 2.2 requires 4.5:1 contrast for normal text and 3:1 for large text; meaningful control boundaries and states need at least 3:1 non-text contrast. WCAG also requires a visible focus mode, text enlargement to 200%, and reflow without loss of information or functionality. These are web requirements, but they are a useful baseline for HTML-based game HUDs and menus.

4. **Game-specific guidance favors predictable, configurable UI.** Microsoft’s Xbox Accessibility Guidelines call for minimum text sizes, strong contrast for important text and visual elements, consistent navigation order, and focus indicators that remain visible. They also recommend disabling or controlling visual distractions and moving content when text is present. This supports a quiet default: calm presentation, strong state changes, and optional intensity rather than constant ornament.

5. **A stylesheet can provide a baseline without becoming a design system.** The opt-in layer should establish readable defaults and predictable native controls, then leave layout containers, game-specific iconography, HUD anchoring, animation language, and art direction to the application. Semantic elements should carry meaning, but visual treatment should not imply a long-form article hierarchy.

## Recommendations

### Heading scale

- Keep the scale compact and rem-based. A practical default is `1.5rem`, `1.25rem`, `1rem`, and `0.875rem` for display, section, item, and label roles; intermediate native heading levels may share a size.
- Keep heading line height around `1.2-1.3` and use weight, spacing, placement, and color to distinguish roles. Avoid poster-sized `h1` values, extreme letter spacing, drop caps, and serif/document treatments in the baseline theme.
- Treat `h1` as the screen or panel title, `h2` as a major region, and lower levels as compact labels or subgroups. Do not use six visually dramatic levels just because HTML exposes six heading elements.
- Preserve text resizing and allow the type scale to reach at least 200% without clipping or overlapping controls. The scale is a visual default, not a hard ceiling.

### Hierarchy

- Put the most important action or state in the strongest visual position, not necessarily in the largest font.
- Use a small set of roles: canvas, surface, raised surface, primary text, secondary text, accent/action, warning, and success. Reserve accent color for interaction and meaningful state changes.
- Prefer grouping, consistent alignment, and whitespace over rules, cards, shadows, and decorative separators. Use borders only when they communicate a boundary or state.
- Keep labels short and action-oriented. Pair icons with text or another cue when the icon carries gameplay meaning; color alone must not encode critical state.
- Keep HUDs sparse by default. Let an application opt into denser telemetry, ornament, or diegetic effects when the game needs them.

### Contrast

- Target at least `4.5:1` for normal text and important gameplay text against its actual background. Use `3:1` only for large text or as the minimum for meaningful non-text boundaries and states.
- Give text over gameplay imagery a stable semi-opaque or opaque backing surface. Do not rely on a glow, blur, or a favorable screenshot to make text readable.
- Check controls in every state: default, hover, active, disabled, selected, and focused. Keep important inactive text at least `3:1`; do not make “quiet” states disappear.
- Test palettes in grayscale and with color-vision deficiencies. Add shape, text, pattern, position, or icon cues so color is never the only signal.

### Focus and navigation

- Keep `:focus-visible` obvious, persistent while focus remains, and usable on dark surfaces, imagery, and overlays. A 2px outline with a 3px offset is a good baseline; verify at least 3:1 contrast against the surrounding pixels and against the component’s unfocused state.
- Do not use a subtle glow as the only focus indicator. Combine an outline or boundary change with a fill, weight, or position change when the UI is viewed at a distance.
- Keep focus order aligned with visual and controller order. On a grid, left/right/up/down should move to the spatially corresponding item; in a dialog, constrain focus to the dialog until it closes.
- Ensure overlays, sticky HUD regions, and responsive changes do not fully obscure the focused control. Focus must remain visible when a menu opens, a panel grows, or text scales.
- Make pointer targets at least `24 × 24` CSS pixels or provide equivalent spacing; use larger game-facing controls where the platform and viewing distance require it.

### Responsive behavior

- Reflow menus and forms before shrinking text. At narrow widths, stack actions, wrap menu rows, and let labels grow vertically rather than forcing horizontal scrolling or truncating critical copy.
- Use logical properties and flexible layouts so the same semantic order works across portrait, landscape, desktop, mobile, and embedded game panels. Keep a stable reading and controller order even when columns change.
- Keep HUD regions anchored by role, but give application code control over safe-area insets, canvas scale, and viewport-specific placement. The stylesheet should not assume that a document flow is the right layout for gameplay.
- Treat 320 CSS px at 400% zoom as a useful web stress test for HTML surfaces, while recognizing WCAG’s explicit exception for inherently two-dimensional content such as games and maps. Even where an exception applies, reduce unnecessary scrolling and preserve readable text blocks.
- Test long localized labels, 200% text, high-contrast overrides, keyboard focus, controller-like directional navigation, and overlays at narrow and wide viewports.

### Motion and distraction

- Keep the default theme visually still. Use motion to explain state, direct attention, or confirm an action; do not animate decoration continuously behind important text.
- Provide a way to pause, hide, or disable moving, blinking, scrolling, and auto-updating UI where the application adds those behaviors. Honor `prefers-reduced-motion` for web-hosted UI.

## Suggested acceptance checks

Before changing the opt-in stylesheet, verify that a representative HUD and menu:

- remain readable in grayscale and over a moving or busy game background;
- meet `4.5:1` text contrast and `3:1` meaningful boundary/focus contrast at the actual rendered colors;
- show an unmistakable focus indicator through keyboard navigation and a predictable directional order;
- remain usable at 200% text size and at a narrow viewport without clipped labels or hidden focus;
- communicate warning, success, selection, and disabled states with more than color;
- look calm when idle, with visual energy reserved for player-relevant state changes.

## Sources

### Attached FUI guide

- Jono Yuen, _FUI: How to Design User Interfaces for Film and Games_ (2017), attached at `/Users/rory/Downloads/FUI-How-to-design-User-Interfaces-for-Film-and-Games.pdf`. Relevant sections: “Checklist: Approaching Your Interface,” pp. 49-54; “Checklist: Assessing Your Interface,” pp. 55-57; “Interview: Davison Carvalho,” pp. 71-73; “Interview: Jeremie Benhamou,” pp. 89-90; “Work in greyscale as much as possible,” p. 102. The publisher’s official book page is [HUDS+GUIS: FUI — The book](https://www.hudsandguis.com/fui).

### Standards and official game guidance

- W3C, [Web Content Accessibility Guidelines (WCAG) 2.2](https://www.w3.org/TR/WCAG22/), especially [1.4.3 Contrast (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [1.4.10 Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html), [1.4.11 Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html), [1.4.12 Text Spacing](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html), [1.4.4 Resize Text](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html), [2.4.7 Focus Visible](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html), [2.4.11 Focus Not Obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html), [2.4.13 Focus Appearance](https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance), and [2.5.8 Target Size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).
- Microsoft, [Xbox Accessibility Guidelines](https://learn.microsoft.com/en-us/xbox/accessibility/guidelines), especially [XAG 101: Text display](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/101), [XAG 102: Contrast](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/102), [XAG 103: Additional channels for visual and audio cues](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/103), [XAG 112: UI navigation](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/112), [XAG 113: UI focus handling](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/113), and [XAG 117: Visual distractions and motion settings](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/117).

## Scope note

WCAG is a web standard, not a complete game-accessibility specification. The recommendations above use WCAG as the floor for Squander’s HTML/CSS surfaces and Xbox guidance as the game-specific reference. Rendering inside a WebGPU canvas, platform-native controller navigation, screen narration integration, and device-specific safe areas still require application-level or platform-level work.
