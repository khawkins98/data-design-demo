# Evidence: IBM Carbon on the Delta host

Structured record in `evidence.json`. This is the prose.

**Summary.** Of 30 requirements: **19 native, 10 composed, 1 custom, 0
unsupported**, for 171 custom lines. Leakage clean **in the shipped
configuration** — catastrophic in the documented one. Scoped axe: **2 violations
(0 critical, 2 serious)**, 2 incomplete. Long labels clean at every viewport
after five CSS escape hatches. 51 Playwright tests pass across three viewports.

The single `custom` entry is `table-column-resize-or-reorder`: Carbon has neither
at any tier.

**Headlines.**

1. **Carbon's documented stylesheet import destroys the Delta host.** Loading
   `@carbon/styles/css/styles.css` changes **79 computed style properties across
   all 14 host canaries**. Avoiding it means hand-composing Carbon's Sass
   partials — undocumented, unmanifested, and silently incomplete.
2. **Once past that, Carbon is the most themeable and the most RTL-correct
   candidate measured so far.** Its theme *is* CSS custom properties
   (live-referenced, not build-time-copied), and its CSS uses logical properties
   throughout, so RTL cost **zero lines**.

---

## Leakage

### The documented import

`import "@carbon/styles/css/styles.css"` — 957,968 bytes, 29,567 lines, 6,734
selectors. Opens with a full Eric-Meyer-style reset plus **46 bare
element-level selectors** (`*`, `html`, `body`, `h1`–`h6`, `p`, `a`, `table`,
`button`, `input`, `select`, `textarea`, etc.).

**79 differences across all 14 canaries.** 17 properties change: `color`,
`font-family`, `font-size`, `font-weight`, `line-height`, `margin-top`, all
`padding-*`, all `border-*-width`, `border-top-color`/`style`, `border-radius`.
Worst: cards lose all borders and paddings (12 diffs each); `heading-1` goes
20px/700 → 42px/300; links turn IBM blue; all canaries lose the host font stack
to IBM Plex. Full breakdown in `test-results/leakage-carbon-global-css.json`.

### Shipped configuration

`src/carbon.scss` compiles only `scss/components/*` and `scss/layout`, omitting
`scss/reset` (the global reset), `scss/fonts` (IBM Plex `@font-face`), and
`scss/grid` (Delta uses Tailwind). Result: 542,925 bytes, 4,094 selectors —
**43% smaller**. **14 canaries, 27 properties, zero differences.**

### Residual leakage surface

Unscoped selectors that survive: `input:-webkit-autofill` (paints
`box-shadow: 0 0 0 1000px var(--cds-field) inset` on any autofilled host
input), `input[type=number]` (sets IBM Plex), and ~50 unprefixed flatpickr
class selectors. None match current Delta markup.

### The `:root` block

Carbon's `scss/layer` and `scss/layout` emit `:root` custom properties. A
20-line Vite plugin rewrites `:root` to `.undrr-tokens` in `src/carbon.scss`
only. **Carbon offers no supported way to scope this** — no option, no feature
flag. Narrowed to one module because Tailwind 4 declares its theme on `:root`.

### Silent failures from hand-composing the Sass

**`scss/layout` is required and nothing says so.** Every form control sizes from
its `--cds-layout-*` vars via `clamp()`. Omit it and inputs/buttons/selects lose
padding and height silently.

**`data-table/_index.scss` does not include the full data table.** Sorting,
toolbar and skeleton are sibling partials not forwarded. Without
`data-table/sort`, screen-reader-only sort text renders **visibly in every header
cell**. No test caught it — only a screenshot.

Shipping without the reset works because Delta loads Tailwind Preflight.
**That substitution is host-specific.**

---

## Portalled overlays

Only `Menu/Menu.js` portals. All others render in-tree and inherit tokens.
`DatePicker` wraps flatpickr (appends to `document.body`); fixed via `appendTo`
a container inside the candidate subtree. Asserted in e2e.

---

## Date-time range composition

No native date-*time* range. Composed as range `DatePicker` + two `TimePicker`s.
**46 custom lines.** Gaps: time disconnected from calendar, same-day range
unguarded, no single accessible name (four fields), duration summary is ours,
`TimePicker` accepts `99:99`. flatpickr uses printf-style formatting, not `Intl`.

---

## Where Carbon clearly wins

**RTL at zero cost.** Logical properties throughout; `dir` attribute flips every
component. Zero lines. Asserted: accordion chevron padding flips correctly.

**Live theming.** Every colour is `var(--cds-token, <literal>)` — 164
declarations, pure CSS aliasing, no rebuild. Type scale reachable on all four
axes.

**Two validation tiers.** `invalid`/`invalidText` and `warn`/`warnText`. Neither
MUI nor React Aria offers a warning tier. **`Select` is a real `<select>`** (400
browser-native `<option>` nodes vs MUI's 400 `MenuItem` components).

**`InlineLoading`**, **`DataTableSkeleton`**, **`Modal`** (focus trap, Escape,
focus restore, click-outside), **`Tile`** (matches Delta's flat cards out of the
box) all native. **Apache-2.0** with explicit patent grant.

**Least JS**: 207.7 kB gzipped (React Aria 237.6, MUI 387.4). Largest CSS at
53.8 kB gzipped.

---

## Where it cost

**Column resize and reorder do not exist.** Reorder built from scratch: **35
lines**, keyboard-operable buttons per column.

**Data table gaps:** no cell formatter (30 lines of `Intl` calls), no cell
truncation (two-line clamp by hand), no empty state, pagination presentation
only (you slice in the render prop), page-size control hidden below 42rem.

**`MultiSelect`** shows count not chips; removable pills need `DismissibleTag`.
**`ComboBox`** case-sensitive `startsWith`, no virtualisation. **`SideNav`** is
shell chrome, not a nav list — needs overrides for in-page use.

**Unreachable tokens:** spacing (literal `rem`), z-index (dropdown 9100, modal
9000; UNDRR tops at 800), radius (square by design). Font family unreachable but
`font-family: inherit` on 56/67 declarations means one scope rule suffices.

**`readOnly` silently suppresses validation** (`useNormalizedInputProps` clears
`invalid`/`warn`). **Types fail under `exactOptionalPropertyTypes`** (cast in
`src/carbon-props.ts`). **300 lines of CSS** (MUI: 14, React Aria: 624).

---

## Long labels

**0px document overflow in German at 390, 1024 and 1440** — after **five** CSS
escape hatches (Carbon defaults to `white-space: nowrap` and truncation):
table header wrap, list-box option wrap, `overflow-x` containers on three tables
and the batch-action bar, two-line clamp on narrative cells. Batch-action bar
pushed 44px past 390px in German. Recorded as `composed`.

---

## Accessibility

No conformance claimed. Host baseline: 0 violations. **Scoped: 2 violations (0
critical, 2 serious), 2 incomplete.**

**`aria-hidden-focus` (serious):** Batch-action bar sets `aria-hidden` while
inactive but leaves buttons tabbable. Internal markup, not reachable from props.

**`color-contrast` (serious):** Disabled helper text at 2.76:1 (`#8b9aa5` on
`#f8fafc`). Same cause as `delta-mui` — token-driven, needs a ruling on whether
helper text counts as a disabled control.

**`aria-valid-attr-value`:** Carbon's invalid inputs set `aria-errormessage`
pointing at a div with no announcement technique. Workaround:
`aria-describedby="${id}-error-msg"` — relies on undocumented internals.

**Incomplete:** `aria-valid-attr-value` on 3 ComboBoxes (downshift's
`aria-controls` targets menu id existing only while open);
`color-contrast` on 24 elements (Carbon's `::before` backgrounds defeat
automated checking).

**Other:** `Tooltip` `label` replaces trigger's accessible name — use
`description` instead. Custom column-reorder announces nothing after a move.

---

## Determinism

All dates from fixtures, formatters `timeZone: "UTC"`, Playwright
`timezoneId: "UTC"` and `locale: "en-GB"`.

---

## Shared packages

Nothing in `packages/` was modified. `undrr-tokens` lacks
`--undrr-color-*-inverse-surface`; used `--undrr-color-text-primary` for
Carbon's high-contrast overlays. **Sass is a required build dependency** —
without it there is no way to avoid Carbon's global reset.

---

## Escalations

1. **IBM Telemetry runs on install.** `postinstall` in `@carbon/react` and
   `@carbon/styles` POSTs project metadata to IBM. Opt-out:
   `IBM_TELEMETRY_DISABLED=true`. No other candidate does this.

2. **`aria-errormessage` on every invalid Carbon input** lacks an announcement
   technique. Workaround relies on undocumented internals. Worth upstream
   report and screen-reader verification.
