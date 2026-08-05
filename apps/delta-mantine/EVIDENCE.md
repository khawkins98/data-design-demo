# Evidence: Mantine 9.5.1 on the Delta host

Structured record in `evidence.json`. This file is the prose: what happened, what
was measured, and what a reviewer should not take on trust.

## Headline

Two findings dominate this run, and they pull in opposite directions.

**Mantine has a native, free, date-time RANGE picker.** The brief predicted
`datetime-range-picker` would be `composed` here, on the understanding that
`DateTimePicker` is single-value only. That is true of Mantine 8; it is not true
of 9.5.1. `<DateTimePicker type="range">` renders one calendar with both
endpoints and the intervening days highlighted, two time fields, one popover and
one focus trap — the entirety of what `@mui/x-date-pickers-pro` charges a
per-developer seat for, under MIT. Verified in the browser, not read off a type
definition: `e2e/demo.spec.ts` asserts one `<table>` calendar, two range time
inputs and more than ten `[data-in-range="true"]` days.

**Mantine has no data grid.** `@mantine/core`'s `Table` renders `<table>` with
spacing, striping, hover highlight, sticky header and `tabular-nums`. That is the
whole feature set. No sorting, no filtering, no pagination, no row selection, no
column sizing. Mantine's own documentation points at `mantine-datatable`, a
third-party package, which Brief 1 forbids and which this run did not install.
So section 6 is **339 lines of application code** — 160 in `src/table-model.ts`
plus the markup that consumes it — against six props on `<DataGrid>` in the
`delta-mui` run, which recorded 0 custom lines for all six table requirements.
For an evaluation about *data* design systems, that is the number that matters.

(339 is the sum of the six `table-*` requirements' `customLinesOfCode`. The
section file is 305 code lines and the model 160; the difference is markup that
uses native components without adding behaviour and is not counted.)

Between them: `Pagination` and `EmptyState` are complete, native components that
neither React Aria nor MUI Community ships. Mantine's breadth is real; its depth
in tabular data is not.

## Requirement outcomes

30 requirements: **20 native, 7 composed, 3 custom, 0 unsupported**.

Total `customLinesOfCode` across all 30: **411**, of which **339 are section 6**.

Nothing was `unsupported`. Every gap Mantine has in this brief is reachable by
writing the behaviour ourselves, which by the status rules in
`docs/requirements.md` makes it `custom`, not `unsupported`. That distinction is
load-bearing: `table-column-resize-or-reorder` cost 103 lines rather than a
package, and recording it as `unsupported` would have hidden the cost rather than
measuring it. The one package that would have absorbed all of it,
`mantine-datatable`, is recorded in `licences.md` as deliberately not installed.

## Theming

**Method.** Both halves of Mantine's theming API, because neither alone reaches
the whole token set:

1. `createTheme()` — a JavaScript object, like MUI's. Mantine then emits its own
   `--mantine-*` custom properties from it into a `<style>` tag.
2. `cssVariablesResolver` — a function returning individual `--mantine-*`
   variables that have no slot on the theme object (`--mantine-color-text`,
   `--mantine-color-dimmed`, `--mantine-color-default-border`, and so on).

**66 of 71 tokens applied. 5 unreachable.** The five are z-index `base`,
`raised`, `sticky`, `header` and `toast`. Mantine has no theme-level z-index
scale at all; each overlay component takes its own `zIndex` prop, so `modal`,
`drawer`, `popover`, `tooltip` and `overlay` are applied through component
`defaultProps` and the other five have no consumer.

### The structural mismatch: Mantine wants a 10-step ramp

`theme.colors[name]` is typed `MantineColorsTuple` — **ten shades**. The UNDRR
token set is semantic, not a scale: one accent, one hover, one active, one subtle
tint. There is no honest way to fill ten slots from four values, so `tuple()` in
`src/theme.ts` repeats them, and any component reaching for a shade nobody
designed (`color="undrrAccent.3"`) silently gets a duplicate.

`variantColorResolver` pins the variants that matter — filled, outline, light,
subtle, default — to exact token values, so what renders is correct. But the
scale underneath is padding. **A design system adopting Mantine has to publish a
ten-step ramp per colour, or accept that six tenths of its palette is invented at
the integration layer.** This is the single most consequential theming finding of
the run and it applies to every UNDRR colour, not just the accent.

### The silent failure that cost the first pass

`cssVariablesResolver` returns three buckets and Mantine writes them at three
different selectors:

```
variables -> :root, :host
light     -> :root[data-mantine-color-scheme="light"]
dark      -> :root[data-mantine-color-scheme="dark"]
```

Every variable this demo overrides is **also** declared by Mantine's own
`default-css-variables.css`, inside its light and dark scheme blocks. Those
selectors carry an attribute (specificity 0,1,1); `variables` does not (0,1,0).
So an override placed in `variables` loses to Mantine's default regardless of
stylesheet order.

The first pass of this demo did exactly that. The build succeeded, the theme
"applied", `--button-bg` read back as the correct token — and axe reported
`#868e96` for dimmed text and `#fa5252` for error text, which are Mantine's
gray-6 and red-6. **The theming failure was only visible because axe measured
contrast on values that should never have been on the page.** Fixed by putting
every scheme-dependent variable in both scheme buckets. Recorded here because a
reviewer comparing eight demos should know that a Mantine theme can look applied
and not be.

## Style leakage

**As shipped: clean. 14 canaries, 0 differences.** (`test-results/leakage.json`)

**With Mantine's documented stylesheet import: 23 differences across all 14
canaries.** (`test-results/leakage-with-baseline.json`)

| Property | Canaries affected | Example |
| --- | --- | --- |
| `font-family` | 14 | host's `-apple-system, system-ui, …` becomes `Roboto, Noto Sans Arabic, …` |
| `line-height` | 9 | `nav` goes from `24.8px` to `24px` |

The cause is `baseline.css`, the first file inside
`@mantine/core/styles.css`:

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

Five inherited declarations on `body`. Every element on the page picks them up,
including host markup the candidate has no business touching. Note this is not a
Mantine bug in isolation — it is the normal expectation that the library owns the
document. It becomes a cost the moment it does not.

**The mitigation, and its price.** `src/mantine-styles.css` imports Mantine's 98
per-component stylesheets individually — a documented granularity, since
`@mantine/core/styles/*` is a package export — plus `default-css-variables.css`
(required for `MantineProvider`'s variable deduplication) and `global.css`
(hiddenFrom/visibleFrom and rotate-rtl helpers). Neither of those writes to
`body`.

The price: Mantine components are authored expecting `baseline.css`, so
`*, *::before, *::after { box-sizing: border-box }` and
`input, button, textarea, select { font: inherit }` now come from the host's
Tailwind Preflight rather than from Mantine. **On the Delta host those two happen
to be equivalent, which is luck, not design.** On a host without Preflight they
would not be, and the omitted rules would have to be re-added under a scoped
selector. A Mangrove/Mantine pairing should check this rather than copy the file.

**A second trap in the same mitigation.** Mantine's component styles are all
single-class selectors of equal specificity, so which one wins is decided purely
by source order. `Button` composes `UnstyledButton`, and UnstyledButton's
`background-color: transparent; padding: 0` must come *before* Button's
background and padding. Alphabetical order puts `UnstyledButton.css` last, and
every button on the page renders as bare unpadded text — while `--button-bg`
still reads back as `#2f6f8f`, so the theme appears to have worked and the
screenshots look like a styling bug rather than an import-order bug. The order in
`src/mantine-styles.css` is lifted from Mantine's own `styles.css` by locating
each file's first hashed class inside it; the command is in the file header.

### The reverse direction: Tailwind Preflight against Mantine

Preflight's `button { border: 0; margin: 0; padding: 0 }` and
`background-color: #0000` are element selectors (specificity 0,0,1) and Mantine's
component rules are single-class (0,1,0), so Mantine wins everywhere it declares
a value. Tailwind 4.3 emits Preflight unlayered, and the Mantine imports are also
unlayered, so no cascade-layer interaction arises. No collision was observed in
either direction once the import order was right.

## Portalled overlays

`docs/requirements.md` predicts that a candidate theming via a JavaScript object
is "probably immune" to the portalled-token trap. For Mantine that is **half
true**, and the half that is false is easy to miss.

Mantine does not inline literal values into component CSS. It emits its own
`--mantine-*` custom properties from the theme into a `<style>` tag whose
selector defaults to `:root, :host`. That is the document root, so Mantine's
variables **do** reach a portal at `document.body`. Measured for all four overlay
types (`test-results/overlays-desktop.json`):

| Overlay | background | `--mantine-color-body` | `--undrr-color-focus` |
| --- | --- | --- | --- |
| Select dropdown | `rgb(255,255,255)` | `#ffffff` | `#b8531f` |
| Popover | `rgb(255,255,255)` | `#ffffff` | `#b8531f` |
| Modal | `rgb(255,255,255)` | `#ffffff` | `#b8531f` |
| Date-time range dropdown | `rgb(255,255,255)` | `#ffffff` | `#b8531f` |

What does **not** reach a portal is anything the integration writes as
`var(--undrr-*)`, because `packages/undrr-tokens` scopes its properties to
`.undrr-tokens`. In this demo that is one thing and it is not cosmetic:
`theme.focusClassName` points at `.demo-focus`, whose outline colour is
`var(--undrr-color-focus)`. Inside a portal that resolves to nothing, the whole
`outline` declaration is voided, and every focusable control inside a modal,
popover or date dropdown loses its visible focus indicator — silently. The
`--undrr-color-focus` column above is green only because `portalProps` carries
the token scope class onto each portal container.

So: **build-time inlining is not what saves Mantine here — a `:root` variable
selector is.** The practical consequence cuts the other way from MUI: because
Mantine's theme lives in CSS variables at the document root, it *can* be changed
at runtime without a rebuild, which MUI's build-time-inlined theme cannot.

### RTL inside a portal, which nothing else in this evaluation has hit

`DirectionProvider` gives Mantine's React components the direction, and the host
puts `dir="rtl"` on its wrapper div. A portal appended to `document.body` is
outside that div, so the browser resolves direction from `<html>` — which the
host leaves `ltr` and which the candidate must not rewrite. **In Arabic, every
overlay rendered left-to-right while the page around it rendered
right-to-left.**

`Portal` reads only `target`, `reuseTargetNode`, `className`, `style` and `id`
when it builds its container (`createPortalNode` in `Portal.mjs`); a `dir` prop
is dropped. Worse, the container is built inside an effect whose only dependency
is `target`, so it copies the props it had **at mount** and a locale change never
revisits it — a direction class passed through `portalProps` is correct on first
paint and stale forever after.

Two mitigations, both needed:

- `usePortalProps()` adds `demo-portal--rtl` (a `direction: rtl` rule) for
  overlays mounted while already in Arabic.
- An effect in `App.tsx` stamps `dir` on `.demo-portal` containers after each
  locale change, so Mantine's own `:where([dir="rtl"])` rules also apply.

Asserted: `test-results/rtl-*.json` records `rtl` inside the subtree and inside
the portal, and the suite fails if any `.demo-portal` is left in LTR.

`reuseTargetNode: false` is also set. By default every `Portal` in the app shares
one container node, so the first overlay to mount decides that node's className
and every later overlay inherits it — fine while they all pass the same class,
and a trap the moment one does not.

## Accessibility

**axe, WCAG 2.2 AA, scoped to the candidate subtree: 0 violations, 1
incomplete.** Whole page: also 0 violations, 1 incomplete. The Delta host's
baseline is 0, so nothing here is inherited or subtracted.

This is a clean result and it should not be read as a conformance claim. Two
things happened on the way to it, and both are findings about Mantine rather than
about this demo.

**`button-name`, critical, 5 nodes, before fixing.** Two Mantine components ship
buttons with no accessible name:

- `Pagination`'s four **edge controls** (first, previous, next, last) render as
  icon-only buttons with no `aria-label`. A developer using `withEdges` — which is
  the documented prop for them — ships four unnamed buttons.
- `InputClearButton`, the `clearable` affordance on `Select`, `MultiSelect` and
  `DatePickerInput`, likewise has no accessible name.

Both are fixable with documented props (`getControlProps`, `clearButtonProps`),
and both defaults are the inaccessible one. That pattern repeats: **`Tooltip` is
hover-only unless you pass `events={{ focus: true }}`**, so following the
quickstart produces a tooltip no keyboard user can reach. Mantine's components
are well built; its defaults are not conservative.

**`color-contrast`, serious, 22 nodes, before fixing.** Entirely caused by the
`cssVariablesResolver` specificity bug described under Theming — the page was
rendering Mantine's palette, not the UNDRR one. Worth stating plainly: axe caught
a *theming* defect that no visual review had.

### Needs human review

- axe reported `color-contrast` **incomplete** on one element in section 6. axe
  could not decide it automatically; a human should.
- Keyboard and screen-reader testing of the hand-built table by a person. `Table`
  gives no roving tabindex, no cell navigation and no selection announcement, so
  the keyboard model is entirely this demo's, and `aria-sort` plus a
  `VisuallyHidden` sort state is the extent of what was implemented. A real grid
  interaction model was not attempted.
- The column resize handle is `role="separator"` with `aria-valuenow` and arrow
  keys. That is a defensible reading of the ARIA authoring practices for a
  window-splitter, but a resizable table column is not a splitter, and the
  pattern should be reviewed rather than copied.
- In Arabic, the range picker's formatted value (`23:59 15/06/2026 – 00:00
  01/05/2026`) reads with the endpoints visually reversed. This is bidi
  reordering of an LTR-formatted string in an RTL context, not a wrong value. It
  needs a bidi-isolation decision that belongs with the design system, not here.
- The 400-option `Select` renders all 400 options with `limit={100}`, which caps
  what is rendered but still walks the full list on every keystroke. There is no
  virtualisation in `@mantine/core`. Whether that is acceptable at 400 is a
  performance decision not taken here.
- Overlays mounted *after* a locale change into Arabic get `direction: rtl` from
  the portal class but are not reached by the `dir`-stamping effect, so Mantine's
  own `[dir="rtl"]` rules (chevron mirroring) may not apply to them. In practice
  Mantine mounts overlay portals eagerly so all of them are stamped, but this is
  an assumption about library internals rather than a guarantee.

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
is materially smaller — but the MUI number includes a data grid and this one does
not, and 339 lines of table code is the difference.

## What a reviewer should not take on trust

- The date-time range picker's **drag-to-select** across the calendar was not
  driven in the test; the range was verified by its rendered value, its single
  calendar, its two time inputs and its `[data-in-range]` days. Drag was read
  from the implementation, not exercised.
- The same-day time-inversion check in `SectionDates.tsx` is present in code but
  never fires in the demo, because the calendar's second click always becomes the
  end. It exists because `@mantine/dates` has no per-endpoint `minTime`/`maxTime`,
  so the case is reachable by typing; that path was not tested.
- Pointer-drag column resize was not exercised in Playwright — only keyboard
  resize was asserted. The RTL delta inversion in `useColumnResize` is therefore
  unverified.
- `tokensApplied: 66` counts token values that reach Mantine's generated CSS or
  this demo's own themed CSS. Twelve of them are spacing steps declared as extra
  `theme.spacing` keys; they emit `--mantine-spacing-*` variables and are usable
  as `p="s10"`, but Mantine's own components only consume `xs`–`xl`. Read the
  number as "reachable", not "consumed by the library".
- `EmptyState` and `DataList` are new enough in Mantine 9 that their long-term API
  stability is unknown. `EmptyState`'s `variant` accepts only `filled` and
  `light`, which is narrower than the docs' tone suggests.
