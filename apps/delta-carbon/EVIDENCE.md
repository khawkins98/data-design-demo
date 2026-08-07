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

### What Carbon documents you should do

```ts
import "@carbon/styles/css/styles.css";
```

957,968 bytes. 29,567 lines. 6,734 selectors. It opens with a full
Eric-Meyer-style reset:

```css
html, body, div, span, applet, object, iframe, h1, h2, h3, h4, h5, h6, p,
blockquote, pre, a, abbr, ..., ol, ul, li, fieldset, form, label, legend,
table, caption, tbody, tfoot, thead, tr, th, td, article, aside, canvas,
details, embed, figure, figcaption, footer, header, hgroup, menu, nav,
output, ruby, section, summary, time, mark, audio, video {
  padding: 0; border: 0; margin: 0; font: inherit;
  font-feature-settings: "liga" 1; font-size: 100%;
  vertical-align: baseline;
}
button, select, input, textarea { border-radius: 0; font-family: inherit; }
```

In total the prebuilt file carries **46 bare element-level selectors**, including
`*`, `*::before`, `*::after`, `html`, `body`, `h1`–`h6`, `p`, `a`, `table`, `ul`,
`ol`, `nav`, `section`, `header`, `footer`, `aside`, `button`, `input`, `select`,
`textarea`, `code`, `em`, `strong`, `blockquote` and `q`.

### What that does to Delta, measured

A `?globalcss=on` query parameter dynamically imports the prebuilt stylesheet.
`e2e/demo.spec.ts` snapshots canaries with `?candidate=off` and again with
`?candidate=on&globalcss=on` and diffs them. Full output in
`test-results/leakage-carbon-global-css.json`.

**79 differences across all 14 canaries.**

17 properties change: `color`, `font-family`, `font-size`, `font-weight`,
`line-height`, `margin-top`, all four `padding-*`, all four `border-*-width`,
`border-top-color`, `border-top-style`, `border-radius`.

The worst of it:

| Canary | Diffs | What happens |
| --- | --- | --- |
| `card-first`, `card-second` | 12 each | Lose **all four borders**, **all four paddings** and their border style. Delta's cards become unstyled blocks of text. |
| `nav-link` | 10 | Loses its 3px active-state border and all four paddings; turns IBM blue `rgb(0, 98, 254)`. |
| `table-cell` | 7 | Loses all four paddings; font-size 14px → 16px, line-height 20px → 16px. |
| `table` | 6 | Loses its 24px top margin and its border colour. |
| `heading-1` | 5 | **20px/700 → 42px/300.** Delta's page title doubles in size and goes light-weight. |
| `heading-2` | 5 | 24px/700 → 32px/400. |
| `heading-3` | 6 | 18px/600 → 28px/400, loses its 8px top margin. |
| `link` | 4 | Delta's `oklch(0.443 0.11 240.79)` → IBM blue, loses `text-decoration`'s border treatment. |
| `paragraph` | 3 | Loses its 12px top margin. |
| all three buttons | 2 each | `border-radius: 4px → 0px`, font-family → IBM Plex. |

Every canary also loses the host font stack to `"IBM Plex Sans", system-ui, …`,
which is Carbon setting `html`/`body`.

A Delta page importing this stylesheet no longer looks like a Delta page. Tailwind
Preflight does not help: both resets use bare element selectors at the same
specificity, and Carbon loads second, so Carbon wins.

### What this demo does instead

`src/carbon.scss` compiles Carbon's Sass, importing only
`scss/components/*` and `scss/layout`, and deliberately **not**:

| Omitted | Why |
| --- | --- |
| `@carbon/styles/scss/reset` | The global reset above. |
| `@carbon/styles/scss/fonts` | `@font-face` for IBM Plex from a CDN. The tokens name Roboto, and a network font would race the screenshots. |
| `@carbon/styles/scss/grid` | Delta lays out with Tailwind. |

The result is 542,925 bytes, 16,824 lines, 4,094 selectors — **43% smaller than
the prebuilt file** — with the reset gone.

**Result: 14 canaries, 27 watched properties, zero differences.** The leakage
assertion passes on the merits.

### Residual leakage surface

"Zero differences" describes the Delta canaries, not the stylesheet. The only
selectors in the shipped CSS that are neither `.cds--`, `.demo` nor
`.undrr-tokens` scoped are:

```
input:-webkit-autofill, input:-webkit-autofill:hover, input:-webkit-autofill:focus
textarea:-webkit-autofill, textarea:-webkit-autofill:hover, textarea:-webkit-autofill:focus
input:not(output, [data-invalid]):-moz-ui-invalid
input[type=number], input[type=text].cds--number
.flatpickr-calendar, .flatpickr-day, .flatpickr-month, .flatpickr-weekday,
.numInputWrapper, .dayContainer, .prevMonthDay, … (~50 more, all unprefixed)
```

None match anything the Delta host renders, but three are real leak vectors:

- **`input[type=number]`** sets IBM Plex on any number input on the page.
- **The autofill rules** paint `box-shadow: 0 0 0 1000px var(--cds-field) inset`
  on any autofilled host input.
- **The ~50 unprefixed flatpickr class selectors** from `components/date-picker`
  are namespaced by nothing and will collide with hosts using `.day`-ish classes.

### The `:root` block, and the one build-time escape hatch

Even without the reset, Carbon's `scss/layer` and `scss/layout` modules emit a
`:root` block — 16 layer/field/border aliases from `layer`, and 12
control-height/inline-padding properties from `layout`. These are custom-property
declarations and do not affect the canaries (measured, not assumed).

A 20-line Vite plugin rewrites `:root` to `.undrr-tokens` in `src/carbon.scss`
only, so the shipped stylesheet contains **zero selectors capable of matching
host markup**. **Carbon offers no supported way to do this** — no
`$emit-layer-at` option, no feature flag, no documented alternative. The plugin
is narrowed to one module because rewriting `:root` globally would break the
host (Tailwind 4 declares its entire theme layer on `:root, :host`).

### Two silent failures from hand-composing the Sass

**1. `scss/layout` is required and nothing says so.**

It looks like an opt-in utility. It declares only a `:root` block:

```css
--cds-layout-size-height-md: 2.5rem;
--cds-layout-density-padding-inline-normal: 1rem;   /* + 10 more */
```

Every Carbon form control sizes itself from those through a `clamp()` chain:

```css
.cds--text-input {
  padding: 0 var(--cds-layout-density-padding-inline-local);
  block-size: var(--cds-layout-size-height-local);
}
```

Omit the partial and those `var()`s resolve to nothing, voiding the declarations
silently. Every input, button, select and combobox loses its inline padding and
height, collapsing to content size. Caught by measuring `padding-left` on a text
input: `0px`, where it should be `16px`.

**2. `components/data-table/_index.scss` does not include the full data table.**

It includes only the core mixin. Sorting, batch actions, toolbar and skeleton are
sibling partials its index does not forward:

```scss
@use 'data-table';
@use 'data-table/action';      // batch action bar + toolbar
@use 'data-table/expandable';
@use 'data-table/skeleton';    // DataTableSkeleton
@use 'data-table/sort';        // sortable headers
```

Without `data-table/sort`, the rule `.cds--table-sort__description { display:
none }` never lands, so Carbon's screen-reader-only sort instruction renders
**as visible text in every header cell**. The table still sorted correctly; no
test failed; it took reading a screenshot.

- **A visually-hidden pattern implemented in CSS rather than in markup fails
  open** — omit the stylesheet and screen-reader text becomes public.
- **`@use ".../components/X"` is not a reliable way to get component X.** No
  manifest exists for what a Carbon component partial needs, and no error fires
  when you guess wrong.

### Caveat

Shipping Carbon without its reset works here because Delta already loads Tailwind
Preflight, which covers much of the same ground (`box-sizing: border-box` on `*`,
`font: inherit` on form controls, zeroed heading and list margins). The two resets
are substitutes.

**That substitution is specific to this host pairing and will not hold without
Preflight.** `mangrove-carbon` should be expected to differ.

---

## Portalled overlays

Only `Menu/Menu.js` portals. All others render in-tree and inherit tokens.

**DatePicker exception:** wraps flatpickr, which appends to `document.body`.
Outside token scope, falls back to Carbon's stock theme (usable but off-brand).
Fixed via `appendTo` a container inside the candidate subtree. Asserted in e2e.

---

## Date-time range composition

No native date-*time* range. Composed as range `DatePicker` + two `TimePicker`s.
**46 custom lines.** Status `composed`.

Gaps: time disconnected from calendar, same-day range unguarded, no single
accessible name (four fields), duration summary is ours, `TimePicker` accepts
`99:99` (free-text input, not a spinner).

flatpickr uses printf-style formatting, not `Intl`. No locale-aware date display
without replacing flatpickr.

---

## Where Carbon clearly wins

**RTL at zero cost.** Carbon's stylesheets use logical properties throughout, so
a `dir` attribute flips every component. No provider, no theme rebuild, no
stylis/RTL plugin, zero lines. Asserted: the accordion chevron padding is
`0px / 16px` in LTR and `16px / 0px` in RTL.

**Live theming.** Every colour is `var(--cds-token, <white-theme-literal>)`, so
theming is pure CSS aliasing -- 164 `--cds-*` declarations on one element, no
provider, no rebuild. Runtime token changes take effect in the same frame. The
type scale is reachable on all four axes (`font-size`, `line-height`,
`font-weight`, `letter-spacing`).

**Two validation tiers.** `invalid`/`invalidText` and a separate
`warn`/`warnText` -- the distinction the `out-of-range` fixture needs. Neither
MUI nor React Aria offers a warning tier.

**`Select` is a real `<select>`.** 400 `<option>` nodes handled by the browser,
not React. MUI mounts 400 `MenuItem` components for the same data.

**`InlineLoading`** covers `active / finished / error` with correct ARIA at each
step. MUI needs `LinearProgress` plus two `Alert`s.

**`DataTableSkeleton`** renders a placeholder with the right column count, so
layout does not jump when rows arrive.

**`Modal`** includes focus trap, Escape, `launcherButtonRef` for focus restore,
`preventCloseOnClickOutside`, and `selectorPrimaryFocus`.

**`Tile`** matches Delta's flat cards out of the box (background + hairline
border, no elevation). MUI needed `variant="outlined" elevation={0}`.

**Apache-2.0 throughout** with an explicit patent grant.

**Least JavaScript of the three runs**: 207.7 kB gzipped (React Aria 237.6 kB,
MUI 387.4 kB). CSS is correspondingly the largest at 53.8 kB gzipped.

---

## Where it cost

**Column resize and reorder do not exist.** No prop, no feature flag -- absent.
Reorder implemented from scratch: **35 lines**, an ordered key array driving the
`headers` array plus keyboard-operable move-earlier/move-later buttons per column.
Buttons rather than drag (drag-only excludes keyboard users), in a separate
control row (nesting a button inside `TableHeader`'s sortable `<button>` is
invalid HTML).

Carbon is behind both MUI (resize is free on `GridColDef`) and React Aria (a
resizing hook), with nothing to buy.

**No cell formatter.** Every `Intl` call is at the call site (30 lines for ten
columns). No `valueFormatter`, no cell-level hook.

**No cell truncation.** Narrative column made rows ~265px tall; added a two-line
clamp by hand.

**Pagination is presentation only.** Reports `{ page, pageSize }` and you slice
inside the render prop (must be after filter/sort, not before `DataTable`). Also
hides the page-size control below 42rem.

**No empty state.** `DataTable` renders a header and no body when empty.

**`MultiSelect` shows a count, not chips.** "2 ×" plus a clear-all. The brief
accepts "or equivalent" and the badge arguably is one, but removable pills needed
`DismissibleTag` components wired to the same state.

**`ComboBox` default filter is case-sensitive `startsWith`.** No virtualisation
or result cap — all 400 items mount on an empty query.

**`SideNav` is application shell chrome**, not a navigation list. Needs position,
size, border, and listener overrides to render as an in-page column.

**Spacing is unreachable.** Carbon's scale compiles to literal `rem` with no
`!default`. All 12 `space` tokens are unreachable for Carbon internals.

**Z-index is unreachable.** Compiled as literal values (dropdown: 9100, modal:
9000, header: 8000). UNDRR scale tops at 800. All 10 `z` tokens unreachable;
Carbon always wins z-index collisions.

**No radius token.** Carbon is square by design; `--undrr-radius-*` needs
explicit overrides on eight component classes.

**Font family unreachable through the API** but `font-family: inherit` on 56/67
declarations means one scope-element declaration carries the token stack.

**`readOnly` silently suppresses validation.** `useNormalizedInputProps` clears
`invalid` and `warn` when `readOnly` is true. Guarded by e2e assertion on
rendered messages.

**Types fail under `exactOptionalPropertyTypes: true`.** Render-prop getters
return optional properties that the target components declare as required. Cast
workaround in `src/carbon-props.ts`.

**300 lines of CSS** (MUI: 14, React Aria: 624). 164 are the token mapping; 19
reach into `.cds--` internals for tokens Carbon's theme cannot express.

---

## Long labels

**0px document overflow in German at 390, 1024 and 1440** — but only after **five**
CSS escape hatches, because Carbon's default is `white-space: nowrap` and
truncation almost everywhere:

1. table header wrap
2. list-box option wrap
3. an `overflow-x` container around each of the three tables
4. an `overflow-x` container on the batch-action bar
5. a two-line clamp on the 200-character narrative cell

The batch-action bar is a non-wrapping absolutely-positioned flex row with no
`overflow` or `maxActions` prop. German labels pushed it 44px past 390px.

Recorded as `composed`: a clean result required intervention in five places.

---

## Accessibility

No conformance claimed. Human review items in `evidence.json.humanReviewRequired`.
Host baseline is 0 violations, so all findings below are the candidate's.

**Scoped: 2 violations (0 critical, 2 serious), 2 incomplete.**

### `aria-valid-attr-value` — was 1 critical, now 0

Carbon's invalid inputs set `aria-errormessage` pointing at a div with no
announcement technique (`role="alert"`, `aria-live`, etc.). Workaround:
`aria-describedby="${id}-error-msg"` — relies on two undocumented internals
(`...rest` spread order and id derivation). The library gap is real; the symptom
is avoidable. Needs screen-reader confirmation.

### `aria-hidden-focus` — 1 serious

Batch-action bar sets `aria-hidden` while inactive but leaves buttons tabbable.
Internal markup, not reachable from props.

### `color-contrast` — 1 serious, token-driven

Disabled helper text at 2.76:1 (`#8b9aa5` on `#f8fafc`). Same cause as
`delta-mui`. Needs a ruling: helper text is not itself a disabled control.

### Incomplete rules

- **`aria-valid-attr-value`** on 3 ComboBoxes: downshift's `aria-controls`
  targets a menu id that exists only while open.
- **`color-contrast`** on 24 elements: Carbon's `::before` backgrounds defeat
  automated contrast checking. No automated coverage on these elements.

### Other observations

- `Tooltip` `label` prop replaces trigger's accessible name via
  `aria-labelledby`. Use `description` to preserve the name.
- Custom column-reorder control announces nothing after a move (our code, not
  Carbon's).

---

## Determinism

All dates from fixtures, all formatters `timeZone: "UTC"`. Playwright pins
`timezoneId: "UTC"` and `locale: "en-GB"`. flatpickr uses its own format engine
(not `Intl`), but fixed fixture dates keep output stable.

---

## Shared packages

Nothing in `packages/` was modified.

- `undrr-tokens` lacks `--undrr-color-*-inverse-surface`; used
  `--undrr-color-text-primary` for Carbon's high-contrast overlays.
- Global-stylesheet probe uses the harness's exported utilities directly rather
  than `checkLeakage`, which cannot express the two-parameter comparison.

**Sass is a required build dependency.** Without it there is no way to avoid
Carbon's global reset.

---

## Escalations

1. **IBM Telemetry runs on install.** `postinstall` in `@carbon/react` and
   `@carbon/styles` POSTs project metadata to IBM. Opt-out:
   `IBM_TELEMETRY_DISABLED=true`. Procurement/data-governance question. Detail
   in `licences.md`. No other candidate does this.

2. **`aria-errormessage` on every invalid Carbon input** lacks an announcement
   technique. Workaround exists (see Accessibility above) but relies on
   undocumented internals. Worth an upstream report and screen-reader verification.
