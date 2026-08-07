# Evidence: Mantine 9.5.1 on the Delta host

Structured record in `evidence.json`. This file adds prose context.

## Headline

**Mantine has a native, free, date-time RANGE picker.** `<DateTimePicker
type="range">` (new in 9.x) renders one calendar with both endpoints highlighted,
two time fields, one popover and one focus trap -- equivalent to what
`@mui/x-date-pickers-pro` charges a per-developer seat for, under MIT. Verified
in browser: `e2e/demo.spec.ts` asserts one `<table>` calendar, two range time
inputs and more than ten `[data-in-range="true"]` days.

**Mantine has no data grid.** `@mantine/core`'s `Table` provides spacing,
striping, hover highlight, sticky header and `tabular-nums` -- no sorting,
filtering, pagination, row selection, or column sizing. Mantine's docs point at
`mantine-datatable` (third-party, not installed per Brief 1 rules). Section 6
required **339 lines of application code** (160 in `src/table-model.ts` plus
consuming markup) vs. six props / 0 custom lines in the `delta-mui` run.

`Pagination` and `EmptyState` are complete native components that neither React
Aria nor MUI Community ships.

## Requirement outcomes

30 requirements: **20 native, 7 composed, 3 custom, 0 unsupported**.

Total `customLinesOfCode` across all 30: **411**, of which **339 are section 6**.

Nothing was `unsupported` -- every gap was reachable by writing the behaviour,
making it `custom` per `docs/requirements.md` rules.
`table-column-resize-or-reorder` cost 103 lines. `mantine-datatable`, which would
have absorbed all table code, is recorded in `licences.md` as deliberately not
installed.

## Theming

Both halves of Mantine's theming API are needed:

1. `createTheme()` -- emits `--mantine-*` custom properties into a `<style>` tag.
2. `cssVariablesResolver` -- sets variables with no slot on the theme object
   (`--mantine-color-text`, `--mantine-color-dimmed`, etc.).

**66 of 71 tokens applied. 5 unreachable:** z-index `base`, `raised`, `sticky`,
`header` and `toast`. Mantine has no theme-level z-index scale; overlay
components take individual `zIndex` props, so `modal`, `drawer`, `popover`,
`tooltip` and `overlay` are applied through `defaultProps`.

### Structural mismatch: Mantine wants a 10-step ramp

`theme.colors[name]` requires `MantineColorsTuple` -- **ten shades**. The UNDRR
token set is semantic (one accent, one hover, one active, one subtle tint), not a
scale. `tuple()` in `src/theme.ts` repeats values to fill the slots; any
component reaching for an undesigned shade (`color="undrrAccent.3"`) gets a
duplicate.

`variantColorResolver` pins filled, outline, light, subtle and default variants
to exact token values, so rendered output is correct. **A design system adopting
Mantine must publish a ten-step ramp per colour, or accept that six tenths of its
palette is invented at the integration layer.**

### cssVariablesResolver specificity trap

`cssVariablesResolver` returns three buckets written at three selectors:

```
variables -> :root, :host
light     -> :root[data-mantine-color-scheme="light"]
dark      -> :root[data-mantine-color-scheme="dark"]
```

Mantine's own `default-css-variables.css` declares variables inside scheme blocks
(specificity 0,1,1). Overrides placed in `variables` (specificity 0,1,0) lose
regardless of stylesheet order. The fix is to put every scheme-dependent variable
in both scheme buckets.

This trap is silent: the build succeeds, variable values read back correctly, but
Mantine's defaults win at computed time. In this demo, axe caught it by reporting
contrast failures on Mantine's `#868e96` and `#fa5252` instead of the UNDRR
values. **A Mantine theme can look applied and not be.**

## Style leakage

**As shipped: 14 canaries, 0 differences.** (`test-results/leakage.json`)

**With Mantine's documented stylesheet import: 23 differences across all 14
canaries.** (`test-results/leakage-with-baseline.json`)

| Property | Canaries affected | Example |
| --- | --- | --- |
| `font-family` | 14 | host's `-apple-system, system-ui, …` becomes `Roboto, Noto Sans Arabic, …` |
| `line-height` | 9 | `nav` goes from `24.8px` to `24px` |

The cause is `baseline.css`, the first file inside `@mantine/core/styles.css`:

```css
body, :host {
  margin: 0;
  font-family: var(--mantine-font-family);
  font-size: var(--mantine-font-size-md);
  line-height: var(--mantine-line-height);
  background-color: var(--mantine-color-body);
  color: var(--mantine-color-text);
}
```

Five inherited declarations on `body` affect every element on the page, including
host markup.

**Mitigation.** `src/mantine-styles.css` imports Mantine's 98 per-component
stylesheets individually (`@mantine/core/styles/*`) plus
`default-css-variables.css` and `global.css`. Neither writes to `body`.

**Cost:** Mantine components expect `baseline.css`'s resets (`box-sizing`,
`font: inherit`), which now come from the host's Tailwind Preflight instead. On
Delta these are equivalent; on a host without Preflight they would not be.

**Import order matters.** Mantine's component styles are single-class selectors
of equal specificity, so source order decides winners. `Button` composes
`UnstyledButton`; alphabetical ordering puts `UnstyledButton.css` last, breaking
every button. The order in `src/mantine-styles.css` is lifted from Mantine's own
`styles.css`; the extraction command is in the file header.

### Tailwind Preflight against Mantine

Preflight's element selectors (0,0,1) lose to Mantine's single-class rules
(0,1,0). Both are unlayered, so no cascade-layer interaction arises. No collision
observed once import order was correct.

## Portalled overlays

Mantine emits `--mantine-*` custom properties at `:root, :host`, so they reach
portals at `document.body`. Measured (`test-results/overlays-desktop.json`):

| Overlay | background | `--mantine-color-body` | `--undrr-color-focus` |
| --- | --- | --- | --- |
| Select dropdown | `rgb(255,255,255)` | `#ffffff` | `#b8531f` |
| Popover | `rgb(255,255,255)` | `#ffffff` | `#b8531f` |
| Modal | `rgb(255,255,255)` | `#ffffff` | `#b8531f` |
| Date-time range dropdown | `rgb(255,255,255)` | `#ffffff` | `#b8531f` |

What does **not** reach a portal: anything written as `var(--undrr-*)`, because
`packages/undrr-tokens` scopes to `.undrr-tokens`. `theme.focusClassName` points
at `.demo-focus` with `outline-color: var(--undrr-color-focus)`. Inside a portal
this resolves to nothing, silently removing focus indicators. The table above is
green only because `portalProps` carries the token scope class onto each portal
container.

Mantine's theme lives in CSS variables at the document root, so it can be changed
at runtime without a rebuild (unlike MUI's build-time-inlined theme).

### RTL inside portals

Portals appended to `document.body` resolve direction from `<html>` (which stays
`ltr`), not from the host's `dir="rtl"` wrapper div. Result: in Arabic, overlays
rendered LTR while the page rendered RTL.

`Portal` builds its container in an effect dependent only on `target`, so props
from mount are never revisited -- a direction class via `portalProps` is correct
on first paint and stale after locale changes.

Two mitigations, both needed:

- `usePortalProps()` adds `demo-portal--rtl` for overlays mounted while in Arabic.
- An effect in `App.tsx` stamps `dir` on `.demo-portal` containers after each
  locale change, so Mantine's `:where([dir="rtl"])` rules apply.

Asserted in `test-results/rtl-*.json`. Suite fails if any `.demo-portal` is LTR.

`reuseTargetNode: false` is set because the default shared container inherits its
className from whichever overlay mounts first.

## Accessibility

**axe, WCAG 2.2 AA, scoped to candidate subtree: 0 violations, 1 incomplete.**
Whole page: also 0/1. Delta host baseline is 0.

**`button-name`, critical, 5 nodes, before fixing.** Two components ship buttons
with no accessible name:

- `Pagination`'s edge controls (first/previous/next/last) via `withEdges` --
  icon-only buttons, no `aria-label`.
- `InputClearButton` on `Select`, `MultiSelect` and `DatePickerInput`.

Both fixable with documented props (`getControlProps`, `clearButtonProps`); both
default to the inaccessible state. Same pattern: `Tooltip` is hover-only unless
`events={{ focus: true }}` is passed.

**`color-contrast`, serious, 22 nodes, before fixing.** Caused by the
`cssVariablesResolver` specificity bug (see Theming) -- the page rendered
Mantine's palette, not UNDRR's. axe caught a theming defect that visual review
did not.

### Needs human review

- `color-contrast` **incomplete** on one element in section 6 (axe could not
  decide automatically).
- Keyboard/screen-reader testing of the hand-built table. `Table` provides no
  roving tabindex, cell navigation, or selection announcement. Only `aria-sort`
  and a `VisuallyHidden` sort state were implemented; a full grid interaction
  model was not attempted.
- Column resize handle uses `role="separator"` with `aria-valuenow` and arrow
  keys (window-splitter pattern). A resizable table column is not a splitter;
  review before copying.
- In Arabic, the range picker's formatted value shows endpoints visually reversed
  (bidi reordering of LTR string in RTL context). Needs a bidi-isolation decision.
- The 400-option `Select` walks the full list on every keystroke (`limit={100}`
  caps rendering only). No virtualisation in `@mantine/core`.
- Overlays mounted after a locale change get `direction: rtl` from the portal
  class but may not be reached by the `dir`-stamping effect. In practice Mantine
  mounts portals eagerly so all are stamped, but this relies on library internals.

## Metrics

| | |
| --- | --- |
| Custom CSS | 72 lines, 17 selectors (`src/demo.css`) |
| Generated CSS | `src/mantine-styles.css`: 98 `@import`s, 0 rules of our own |
| Overrides library internals | yes — 3 selectors reach `.mantine-*` class names |
| Wrappers | 4 (`useColumnResize`, `useSelection`, `usePortalProps`, `toData`) |
| Custom behaviour code | 160 lines in `src/table-model.ts` |
| Tokens applied | 66 of 71 |
| Tokens unreachable | 5 (z-index base, raised, sticky, header, toast) |
| Gzipped bundle | 238.8 kB (40.9 CSS + 197.5 JS + 0.3 baseline probe) |
| Dependency count | 112 unique packages, whole tree including tooling |
| Build time | 2.0–3.2 s across three runs |
| Playwright | 51 tests, 3 viewports, all passing |
| Long labels (German) | 0 px horizontal overflow at 390, 1024 and 1440 |

For comparison, `delta-mui` measured 387.4 kB gzipped over 142 packages. Mantine
is smaller, but the MUI number includes a data grid; 339 lines of table code is
the trade-off.

## What a reviewer should not take on trust

- Date-time range picker **drag-to-select** was not driven in tests; range was
  verified by rendered value, single calendar, two time inputs and
  `[data-in-range]` days.
- Same-day time-inversion check in `SectionDates.tsx` never fires in the demo
  (calendar's second click always becomes the end). The case is reachable by
  typing but was not tested.
- Pointer-drag column resize was not exercised in Playwright -- only keyboard
  resize. RTL delta inversion in `useColumnResize` is unverified.
- `tokensApplied: 66` counts values that reach generated CSS. Twelve are spacing
  steps declared as extra `theme.spacing` keys (`--mantine-spacing-*`); Mantine's
  own components only consume `xs`--`xl`. Read as "reachable", not "consumed".
- `EmptyState` and `DataList` are new in Mantine 9; long-term API stability is
  unknown. `EmptyState`'s `variant` accepts only `filled` and `light`.
