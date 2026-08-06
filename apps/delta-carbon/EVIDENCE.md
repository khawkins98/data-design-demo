# Evidence: IBM Carbon on the Delta host

Structured record in `evidence.json`. This is the prose.

**Summary.** Of 30 requirements: **19 native, 10 composed, 1 custom, 0
unsupported**, for 171 custom lines. Leakage clean **in the shipped
configuration** — and catastrophic in the documented one, which is the finding
this pairing existed to produce. Scoped axe: **2 violations (0 critical, 2
serious)**, 2 incomplete. Long labels clean at every viewport, after five CSS
escape hatches. 51 Playwright tests pass across three viewports.

The single `custom` entry is `table-column-resize-or-reorder`: Carbon has neither,
at any tier, and no upgrade path to either.

**Two headlines.**

1. **Carbon's documented stylesheet import destroys the Delta host.** Loading
   `@carbon/styles/css/styles.css` changes **79 computed style properties across
   all 14 host canaries**. Avoiding it means hand-composing Carbon's Sass
   partials, which works but is undocumented, unmanifested, and fails silently in
   two distinct ways that this run walked into and had to measure its way out of.
2. **Once you are past that, Carbon is the most themeable and the most
   RTL-correct candidate measured so far.** Its theme *is* CSS custom properties,
   so tokens are live-referenced rather than build-time-copied; and its CSS is
   authored entirely in logical properties, so RTL cost **zero lines**. MUI's RTL
   needed a theme rebuild per locale.

---

## Leakage: the whole story

This is the reason the pairing was chosen, so it gets the detail.

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

Rather than describe this from reading the CSS, the demo honours a second query
parameter: `?globalcss=on` dynamically imports the prebuilt stylesheet, and
`e2e/demo.spec.ts` snapshots the host canaries with `?candidate=off` and again
with `?candidate=on&globalcss=on` and diffs them. Full output in
`test-results/leakage-carbon-global-css.json`.

**79 differences. 14 of 14 canaries affected. Every single one.**

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

**This is a definitive fail, and it is not a subtle one.** A Delta page that
imports Carbon's documented stylesheet does not look like a Delta page with
Carbon components in it. It looks like a Carbon page with Delta's content
awkwardly inside it. Tailwind Preflight does not save you: Preflight and Carbon's
reset both use bare element selectors at the same specificity, and Carbon's
stylesheet is loaded second, so Carbon wins — including on the properties
Preflight had deliberately set, and on the ones the host set with utility classes
that Carbon's reset overrides by later source order.

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

### The residual leakage surface, stated precisely

"Zero differences" is a statement about the Delta canaries, not about the
stylesheet. Audited against the built bundle, the only selectors in the shipped
CSS that are neither `.cds--`, `.demo` nor `.undrr-tokens` scoped are:

```
input:-webkit-autofill, input:-webkit-autofill:hover, input:-webkit-autofill:focus
textarea:-webkit-autofill, textarea:-webkit-autofill:hover, textarea:-webkit-autofill:focus
input:not(output, [data-invalid]):-moz-ui-invalid
input[type=number], input[type=text].cds--number
.flatpickr-calendar, .flatpickr-day, .flatpickr-month, .flatpickr-weekday,
.numInputWrapper, .dayContainer, .prevMonthDay, … (~50 more, all unprefixed)
```

None of these match anything the Delta host renders, which is why the assertion
passes rather than passing by luck of what we chose to watch. But:

- **`input[type=number]` is a real leak vector.** It sets IBM Plex on any number
  input on the page. Delta's canaries have no inputs; a real Delta page has many.
- **The autofill rules** would paint `box-shadow: 0 0 0 1000px var(--cds-field)
  inset` on any autofilled host input.
- **The ~50 unprefixed flatpickr class selectors** are shipped by
  `components/date-picker`. They are namespaced by nothing at all, and they are a
  collision waiting for a host that happens to use `.day`-ish class names.

### The `:root` block, and the one build-time escape hatch

Even without the reset, Carbon's `scss/layer` and `scss/layout` modules emit a
`:root` block — 16 layer/field/border aliases from `layer`, and 12
control-height/inline-padding properties from `layout`. These are custom-property
declarations, so they change nothing about the canaries; **this was measured, not
assumed**, and the leakage assertion passes with or without doing anything about
them.

They were relocated anyway, by a 20-line Vite plugin that rewrites `:root` →
`.undrr-tokens` in `src/carbon.scss` only, so that the shipped stylesheet contains
**zero selectors capable of matching host markup**. The point worth recording is
that **Carbon offers no supported way to do this**: no `$emit-layer-at` option, no
feature flag, no documented alternative. The plugin is deliberately narrowed to
one module, because rewriting `:root` globally would break the host — Tailwind 4
declares its entire theme layer on `:root, :host`.

### What hand-composing the Sass cost: two silent failures

Both of these shipped in the demo before measurement caught them, and both are
worth reading as warnings, not anecdotes.

**1. `scss/layout` is required and nothing says so.**

It is not a component partial and looks like an opt-in utility. It declares
nothing but that `:root` block:

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

Omit the partial and those `var()`s resolve to nothing. **A failed `var()` voids
the entire declaration**, silently — so every input, button, select and combobox
loses its inline padding *and* its height and collapses to content size. Nothing
errors. Nothing warns. It reads as a subtle styling bug, not a missing import. It
was caught by measuring `padding-left` on a text input in a probe run: `0px`,
where it should be `16px`.

**2. `components/data-table/_index.scss` does not include the data table.**

It includes only the *core* table mixin. Sorting, batch actions, the toolbar and
the skeleton are sibling partials its index does not forward:

```scss
@use 'data-table';
@use 'data-table/action';      // batch action bar + toolbar
@use 'data-table/expandable';
@use 'data-table/skeleton';    // DataTableSkeleton
@use 'data-table/sort';        // sortable headers
```

Without `data-table/sort`, the rule `.cds--table-sort__description { display:
none }` never lands. Carbon's screen-reader-only sort instruction therefore
renders **as visible text in every header cell**: "Click to sort rows by Country
header in ascending orderCountry". The table still sorted correctly. No test
failed. It took reading a screenshot.

Two lessons, and the second is the general one:

- **A visually-hidden pattern implemented in CSS rather than in markup fails
  open.** Omit the stylesheet and text intended only for screen readers becomes
  public.
- **`@use ".../components/X"` is not a reliable way to get component X.** There is
  no manifest of what a Carbon component partial needs, and no error when you
  guess wrong.

### The honest caveat on all of the above

**Shipping Carbon without its reset is a real deviation from the library's
intended setup**, exactly as omitting `CssBaseline` was for the MUI run. It works
here largely because the Delta host already loads Tailwind Preflight, which covers
much of the same ground — `box-sizing: border-box` on `*`, `font: inherit` and
`border: 0 solid` on form controls, zeroed heading and list margins. The two
resets are substitutes.

**That substitution is a property of this host pairing and will not hold on a host
without Preflight.** `mangrove-carbon` should be expected to differ. Whoever owns
this decision needs to decide whether shipping Carbon without its reset is
supportable long term, or whether the host absorbs the reset centrally.

---

## Portalled overlays: measured per overlay type

`docs/requirements.md` warns that a candidate portalling overlays to
`document.body` puts them outside the `.undrr-tokens` element, where every
`var(--undrr-*)` resolves to nothing. The corrected framing is the right one:
what matters is not *how* a library is themed but **whether any declaration
inside the portal references a `var()` scoped outside it**.

**Measured, by grepping `createPortal` across `@carbon/react/lib/components/`:
exactly one component portals — `Menu/Menu.js`.** Modal, ComposedModal, Tooltip,
Toggletip, Popover, Dropdown, ComboBox, MultiSelect and every DataTable overlay
render in place in the React tree, inside `.demo`, and inherit the tokens.

Per overlay type, with computed `background-color` asserted in `e2e/demo.spec.ts`
rather than inferred:

| Overlay | Portalled? | Result |
| --- | --- | --- |
| `Modal` | No | `rgb(255, 255, 255)` — the surface token. Asserted. |
| `Toggletip` (the `popover` requirement) | No | `rgb(20, 35, 46)` — the token **inverse** surface, because Carbon's Toggletip is high-contrast by default. Asserted as neither `rgba(0,0,0,0)` nor Carbon's stock `rgb(57, 57, 57)`. |
| `Tooltip` | No | Same inverse surface; asserted open on keyboard focus. |
| `Dropdown` / `ComboBox` / `MultiSelect` menus | No | In-tree; themed. |
| **`DatePicker` calendar** | **Yes** | **The one exception.** See below. |

### The exception, and why its failure mode is worse than a transparent overlay

Carbon's `DatePicker` wraps **flatpickr**, which is not React and manipulates the
DOM itself. By default flatpickr appends `.flatpickr-calendar` to
`document.body`. Carbon documents this in the prop itself:

```
appendTo?: HTMLElement   // "The DOM element the flatpickr should be inserted
                         //  into `<body>` by default."
```

Left at the default, the calendar renders outside the token scope. But Carbon's
theming is a **`var()` fallback chain**, not a bare `var()`:

```css
color: var(--cds-text-primary, #161616);
```

So the failure mode is *not* React Aria's transparent, borderless overlay. The
calendar renders in Carbon's stock white theme — IBM grey `#f4f4f4` fields, IBM
blue `#0f62fe` selection, square corners — fully visible, fully usable, and
**silently off-brand**. That is arguably harder to catch in review than an
invisible one: an invisible popover gets reported as a bug on the first click, an
off-brand one gets reported as "looks a bit odd" or not at all.

**This is the concrete case for the corrected guidance.** Carbon is themed by CSS
`var()`, which the old heuristic would have predicted makes it vulnerable to
transparent overlays. It is vulnerable to *losing the tokens*, but the visible
symptom is completely different, because the declarations carry fallbacks. Predict
from the declarations, not from the theming mechanism.

Fixed by passing `appendTo` a container inside the candidate subtree
(`src/overlay-scope.ts`). The e2e run asserts both halves:

```ts
expect(calendar.closest("[data-candidate-root]") !== null).toBe(true);
expect(dayColour).not.toBe("rgba(0, 0, 0, 0)");
expect(dayColour).not.toBe("rgb(244, 244, 244)");  // Carbon's default field grey
```

---

## The date-time range: what composition cost

**Carbon has a free, native date *range* picker.** `datePickerType="range"` gives
one calendar, two associated inputs, the intervening days highlighted,
click-to-select across the span, one popover, one focus context. That is
materially more than MUI's community tier — MUI's range pickers are behind a
commercial licence, so the MUI run composed two entirely separate `DateTimePicker`s
and lost the shared calendar altogether.

**What Carbon does not have is a date-*time* range.** `DatePicker` is date-only at
every granularity; time lives in a separate `TimePicker`; no prop, variant or flag
joins them. So: one range `DatePicker` for both dates, plus two `TimePicker`s.
**46 custom lines.** Status `composed`.

What the join costs, relative to a true date-time range control:

- **Time is disconnected from the calendar.** Picking 3 May does not move focus to
  the start time, and changing a time does not re-validate against the calendar.
  The user assembles the endpoints from two unrelated widgets.
- **Same-day ranges are unguarded by the library.** flatpickr's `minDate`/`maxDate`
  order the *dates*, so date inversion is not reachable through the calendar. But
  when both dates are the same day, nothing stops an end *time* before a start
  time. That check is ours.
- **No single accessible name for the range.** A screen-reader user meets four
  fields. Carbon does associate the two date inputs as a range; the two time
  inputs are associated with nothing. Same class of loss as the MUI run, slightly
  smaller.
- **The duration summary is ours.** "1 May 2026, 00:00 – 15 Jun 2026, 23:59
  (46 days)" is application code; Carbon renders no summary.
- **`TimePicker` is a free-text input with a `pattern` attribute, not a spinner.**
  It accepts `99:99` and reports nothing. The validity regex is ours.

### A separate finding about flatpickr and `Intl`

**flatpickr formats dates with a printf-style pattern string, not `Intl`.** There
is no way to make the picker's own input render `15 Jun 2026` in English and
`15 juin 2026` in French — you choose one `dateFormat` pattern for all locales.
Carbon's `locale` prop swaps flatpickr's month and weekday *names* inside the
calendar, but not the input format.

Every other formatted value on this page comes from `Intl` with
`timeZone: "UTC"`. The two date inputs are the exception, and they cannot be fixed
without replacing flatpickr. For an organisation publishing in four locales that
is a real, if narrow, defect.

---

## Where Carbon clearly wins

**RTL, decisively, at zero cost.** Carbon's stylesheets are authored entirely in
logical properties — `padding-inline-start`, `inset-inline-end`,
`border-inline-end`, `margin-inline` — so a `dir` attribute on any ancestor flips
every component internal. **No provider, no theme rebuild, no stylis/RTL plugin,
no adapter locale, zero lines of code.** MUI needs
`createTheme(base, { direction })` rebuilt on every locale change. Asserted on a
component internal rather than the `dir` attribute: the accordion heading's
chevron padding is `0px / 16px` in LTR and `16px / 0px` in RTL.

**Theming depth, and it is live.** Carbon's theme *is* custom properties: every
colour a component draws with is `var(--cds-token, <white-theme-literal>)`. So
theming against `packages/undrr-tokens` is pure CSS aliasing — 164 `--cds-*`
declarations on one element, no theme object, no provider, no rebuild. Change a
`--undrr-*` value at runtime and every Carbon component follows it in the same
frame. MUI's `createTheme()` resolves token values at **build** time and emits
literals, so a token change needs a rebuild. Carbon's type scale is reachable too,
on all four axes (`font-size`, `line-height`, `font-weight`, `letter-spacing`).

**Two validation tiers.** `invalid`/`invalidText` **and** a separate
`warn`/`warnText`, which is exactly the distinction the `out-of-range` fixture
case needs: a value in the right shape but out of bounds. Neither MUI nor React
Aria offers a warning tier without inventing one.

**`Select` is a real `<select>`.** The 400-option fixture costs 400 `<option>`
nodes, which is the browser's problem, not React's, so no virtualisation question
arises at all. MUI's `Select` mounts 400 `MenuItem` components for the same data.

**`InlineLoading` is the whole form lifecycle in one component.** Its `status`
prop covers `active → finished → error` with the right ARIA at each step. MUI
needs `LinearProgress` plus two `Alert`s.

**`DataTableSkeleton` beats a spinner or an overlay**, because the placeholder has
the right column count, so the layout does not jump when the rows arrive.

**`Modal` is unusually complete.** Focus trap, Escape, and an explicit
`launcherButtonRef` prop for focus restore — verified by e2e that the trigger is
focused after Escape — plus `preventCloseOnClickOutside` and
`selectorPrimaryFocus`, both of which the other candidates make you reach into a
portal API for.

**`Tile` matches Delta's cards out of the box.** Carbon's tile is *flat* — a
background plus a hairline border, no elevation — which is what Delta's cards are.
MUI needed `variant="outlined" elevation={0}` to get there.

**No commercial tier to trip over, and Apache-2.0 throughout** — with an explicit
patent grant, which MIT does not carry, and the same licence as Mangrove and Delta
themselves.

**Least JavaScript of the three runs so far**: 207.7 kB gzipped, against React
Aria's 237.6 kB and MUI's 387.4 kB. That follows from the architecture — styling
is a stylesheet, so there is no CSS-in-JS runtime in the bundle. The CSS is
correspondingly the largest at 53.8 kB gzipped.

---

## Where it cost

**Column resize and reorder do not exist.** Not behind a licence, not behind a
feature flag — absent. No prop on `DataTable` or `Table`, no resizer element
anywhere in the compiled stylesheet. The brief accepts one of the two, so reorder
is implemented from scratch: **35 lines**, an ordered key array driving the
`headers` array plus a keyboard-operable move-earlier/move-later control per
column. Buttons rather than drag, because drag-only excludes keyboard users; and a
separate control row rather than buttons in the header cells, because
`TableHeader` with `isSortable` renders its label inside a `<button>` and nesting
a button is invalid HTML.

**This is the one requirement where Carbon is behind both MUI (resize is free on
`GridColDef`) and React Aria (a resizing hook), and unlike MUI there is nothing to
buy.**

**No cell formatter.** `DataTable` has no `valueFormatter` and no cell-level
formatting hook, so every `Intl` call is at the call site — 30 lines for the ten
columns. The flip side is real: because a cell renders whatever you put in it, the
enum column can be a `Tag` with no escape hatch, where MUI needs `renderCell`.

**No cell truncation affordance either.** The 140–200 character narrative column
made every row ~265px tall until a two-line clamp was added by hand.

**Pagination is presentation only.** The `Pagination` component is native and
includes the page-size select, the range text and the controls — but it reports
`{ page, pageSize }` and you slice. The slice has to happen **inside** the render
prop, where `rows` is already filtered and sorted, so paging composes with both.
Nothing in the API says so, and slicing the input to `DataTable` instead would
silently have made search page-local. A trap for a first-time integrator.

**And Carbon hides the page-size control on narrow screens.**
`@container pagination (max-width: 42rem)` sets `display: none` on
`.cds--pagination__left > *`, so at 390px a reviewer cannot change the page size of
a 250-row table at all. Asserted in e2e so the behaviour is on record rather than
noticed later.

**No empty state.** Carbon has no empty-state component and `DataTable` has no
empty slot — it renders a header row and no body, which reads as a rendering bug
rather than "no results". MUI has `localeText.noRowsLabel` and a `noRowsOverlay`
slot; React Aria has `renderEmptyState` on `TableBody`. Carbon has neither.

**`MultiSelect` shows a count, not chips.** "2 ×" plus a clear-all. The brief
accepts "or equivalent" and the badge arguably is one, but removable pills needed
`DismissibleTag` components wired to the same state.

**`ComboBox`'s default filter is a case-sensitive `startsWith`**, which is wrong
for a 400-item list of place names. `shouldFilterItem` is the documented hook; the
predicate is ours. And there is no virtualisation and no result cap — all 400
items mount when the menu opens on an empty query, with no `filterOptions`-style
limit to reach for.

**`SideNav` is not a navigation list.** It is application shell chrome designed to
sit `position: fixed` against the viewport edge beneath a Carbon `Header`, at a
fixed 16rem inline size, with expand/collapse driven by a header hamburger it
expects to exist. Rendering it as an in-page column needs `position`,
`block-size`, `max-inline-size` and the border neutralised, plus
`isChildOfHeader`/`addFocusListeners`/`addMouseListeners` turned off.

**Spacing is unreachable at every layer.** Carbon's scale compiles to literal
`rem` values from `@carbon/layout/scss/_spacing.scss`, which declares **no
`!default`** — so it is not configurable at build time either. Carbon's component
padding and control heights cannot be retargeted to the UNDRR 4px scale without
overriding component CSS. All 12 `space` tokens are unreachable for Carbon
internals.

**Z-index is unreachable, and Carbon wins every collision.**
`$z-indexes` in `scss/utilities/_z-index.scss` is a Sass map with no `!default`:
`dropdown: 9100, modal: 9000, header: 8000, overlay: 6000`. The compiled CSS
contains literal `z-index: 8000`, `9000`, `9100`, `99999`. The UNDRR scale tops out
at 800, so **all 10 `z` tokens are unreachable and a Carbon modal or SideNav will
sit above any host chrome regardless of what the host intended.**
`docs/requirements.md` anticipated exactly this failure mode; Carbon is the
candidate that exhibits it.

**No radius token at all.** Carbon is square by design, so `--undrr-radius-*` needs
explicit overrides on eight component classes.

**Font family is unreachable through the supported API.** Carbon's stacks are Sass
values in `@carbon/type`, and `@carbon/styles/scss/type` re-forwards that module
with a `show` list that omits `$font-families`, so `@use ... with ()` cannot reach
them. It happens not to matter: 56 of Carbon's 67 `font-family` declarations are
`font-family: inherit`, so one declaration on the scope element carries the token
stack. Worth noting *why* the other 11 do not matter — they sit inside impossible
descendant selectors like `.cds--label html { font-family: 'IBM Plex Sans' }`,
which can never match. That is a defect in Carbon's own use of its type reset
mixin, repeated across a dozen components.

**`readOnly` silently suppresses validation.** Carbon's
`useNormalizedInputProps` computes:

```ts
invalid: !readOnly && !disabled && invalid
warn:    !readOnly && !invalid && !disabled && warn
```

The first version of `SectionForms` pinned the fixture values with
`value` + `readOnly`, exactly as the MUI run does with
`slotProps={{ input: { readOnly: true } }}` — and **all four validation states
rendered blank**, with no error styling, no icon, no message and no warning. It is
a defensible design decision (a field the user cannot edit arguably should not be
blamed) but it is a behavioural difference from both MUI and React Aria, and it is
not called out in the prop documentation. Now guarded by an e2e assertion on the
*rendered messages* rather than the props.

**Carbon's types do not compile under `exactOptionalPropertyTypes: true`.**
`DataTable`'s render-prop getters return optional properties
(`getSelectionProps(): { checked?: boolean }`, `getHeaderProps(): { isSortable?:
boolean }`, `getToolbarProps(): { size?: ... }`) while the components those objects
are spread into declare the same properties as **required**. Six errors in the
exact code Carbon's own documentation tells you to write. `src/carbon-props.ts`
holds a one-line cast that asserts what the types should have said, rather than
relaxing the tsconfig.

**300 lines of CSS**, against MUI's 14 and React Aria's 624. Carbon sits in the
middle for a reason: 164 of those lines are the token mapping, which is the
*mechanism* of theming rather than an override. 19 selectors reach into `.cds--`
internals, each for a token Carbon's theme cannot express.

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

(4) deserves naming: **Carbon's batch-action bar lays its actions out in a
non-wrapping flex row with no max-width, and it is absolutely positioned, so
nothing clips it.** German labels pushed it 44px past the 390px viewport and
scrolled the whole document. There is no `overflow` or `maxActions` prop.

Worth recording that this only surfaced **after** `data-table/action` was added to
`carbon.scss`. With the partial missing the bar had no layout at all, and the
long-label test passed for the wrong reason. A green test on incomplete CSS is
exactly the failure mode the two silent Sass traps above produce.

Recorded as `composed` rather than `native`: a clean result required author
intervention in five separate places.

---

## Accessibility

**Do not read this as a conformance claim.** axe is recorded verbatim; what needs
human review is listed in `evidence.json.humanReviewRequired`.

The Delta host's baseline is **0 violations**, so scoped and whole-page counts are
identical and every violation below is the candidate's.

**Scoped to `[data-candidate-root]`: 2 violations — 0 critical, 2 serious — and
2 incomplete rules.**

### `aria-valid-attr-value` — was 1 **critical**, now 0, and the correction matters

On `#form-required` and `#form-format`, the two invalid `TextInput`s. axe verbatim:

> aria-errormessage value `form-required-error-msg` must use a technique to
> announce the message (e.g., aria-live, aria-describedby, role=alert, etc.)

Carbon's invalid input sets `aria-errormessage` pointing at its
`.cds--form-requirement` div, which carries no `role="alert"`, no `aria-live` and
no `aria-describedby`. **That part is Carbon's, and it deserves an upstream
issue:** it affects every invalid Carbon input in every Carbon application, and
Carbon exposes no prop for it.

**This section previously claimed the violation "cannot be fixed from the
consuming side". That was wrong**, and the `mangrove-carbon` pairing had already
disproved it against the same `@carbon/react` version. Passing an explicit
`aria-describedby="${id}-error-msg"` alongside `invalid` gives axe the
announcement technique it wants and takes the count to 0. The workaround is only
available because `...rest` is spread last in Carbon's `sharedTextInputProps`, and
only if you know the id is derived as `${id}-error-msg` — both internals, and
neither documented — so the library gap is real even though the symptom is
avoidable. What was *ours* was shipping the workaround in one app of two and then
recording the unpatched app's result as an unavoidable library defect.

Still needs confirmation against a real screen reader: `aria-describedby` satisfies
axe, but whether it produces the same announcement as a proper
`aria-errormessage` + live-region pairing is a question automation cannot answer.

Note the interaction with the `readOnly` finding: this violation only appeared
once the validation states actually rendered. The earlier, broken version of the
section was "cleaner" precisely because it was not working.

### `aria-hidden-focus` — 1 serious, also Carbon's

On `.cds--batch-actions`. Carbon's own batch-action bar sets `aria-hidden` while
inactive but leaves its buttons in the tab order. axe verbatim: "Focusable content
should be disabled or be removed from the DOM". Again internal markup, again not
reachable from props. Appeared only once `TableBatchActions` was rendered.

### `color-contrast` — 1 serious, token-driven

On `#form-disabled-helper-text`: **2.76:1** for `#8b9aa5` on `#f8fafc` at 12px,
against a 4.5:1 requirement. Carbon applies its disabled text colour to the
helper text of a disabled field, and `--undrr-color-text-disabled` is `#8b9aa5`.
Disabled *controls* are exempt from WCAG 1.4.3 but helper text is not itself a
disabled control, so this needs a ruling. **Identical in cause to the
`delta-mui` finding**, and `packages/undrr-tokens` is import-only so it could not
be fixed here.

### The two incomplete rules matter more than usual

- **`aria-valid-attr-value`** on the three `ComboBox`es and a downshift toggle:
  "Unable to determine if `aria-controls` referenced ID exists on the page while
  using `aria-haspopup`". downshift points `aria-controls` at a menu id that only
  exists while the menu is open. A known pattern, but worth a screen-reader check.
- **`color-contrast`** on **24 elements**: "Element's background color could not be
  determined due to a pseudo element". Carbon draws button and switch backgrounds
  with `::before` layers, which defeats automated contrast checking on the
  `ContentSwitcher`, the tooltip trigger and every column-reorder button. **Those
  24 elements therefore have no automated contrast coverage at all** and need
  manual measurement. This is a systemic consequence of Carbon's styling approach,
  not a one-off.

### One more accessibility observation, not an axe finding

**Carbon's `Tooltip` `label` prop replaces the trigger's accessible name.** It sets
`aria-labelledby` on the trigger pointing at the tooltip, so a button reading
"Hover or focus for tooltip" announces the 200-character methodology notice
instead of its own visible label. Carbon's `description` prop uses
`aria-describedby` and preserves the name. Both are documented; which is correct
depends on whether the tooltip *is* the label or is supplementary. The default is
surprising, and this demo uses `label` because it is what Carbon's examples use.
The e2e run targets the trigger by `data-testid` for exactly this reason, and
asserts the `aria-labelledby` so the behaviour is on record.

**Also:** the custom column-reorder control announces nothing after a move. A
keyboard user pressing "Move Hazard type earlier" gets no confirmation that the
column moved or where it landed. That is a gap in *our* code, not Carbon's, and it
is in `humanReviewRequired`.

---

## Determinism

No `new Date()` anywhere. `TODAY_ISO`, `DEFAULT_RANGE`, `FIXED_TIME_ZONE` and
`today()` from `@undrr-eval/fixtures` are the only clock, and every `Intl`
formatter is constructed with `timeZone: "UTC"` via `formattersFor()` in
`src/demo-state.ts`. Playwright pins `timezoneId: "UTC"` and `locale: "en-GB"`,
and animations are disabled for screenshots.

The one place determinism is *not* fully in our hands is flatpickr, which parses
and formats with its own pattern engine; the fixed fixture dates make its output
stable, but it is not `Intl` and its behaviour is not controlled by the Playwright
locale.

---

## Shared packages

Nothing in `packages/` was modified. Two things came close to being blockers and
neither justified an edit:

- **`packages/undrr-tokens` has no `--undrr-color-*-inverse-surface`.** Carbon's
  high-contrast overlays (Toggletip, Tooltip) need an inverse background, and
  `--undrr-color-text-primary` was used for it. Slightly off-label but correct in
  effect, and adding a token would have been a package edit.
- **`packages/test-harness`'s `checkLeakage` toggles only the `candidate`
  parameter.** The global-stylesheet probe needs a baseline *without* the
  stylesheet and a comparison *with* it, which `checkLeakage` cannot express —
  passing `?globalcss=on` in the URL would carry it into both snapshots and cancel
  out. Solved inside `e2e/demo.spec.ts` using the harness's own exported
  `diffSnapshots`, `WATCHED_PROPERTIES` and `ALL_CANARIES_SELECTOR`, so the probe
  uses the same canary contract and the same watched properties as the real
  assertion without changing the harness. If a second candidate needs the same
  shape of measurement, a `params` option on `checkLeakage` would be the right
  addition — noted for whoever owns Brief 0, not done here.

`sass` is a required direct dependency rather than an optional one, and that is
worth restating: **a consumer who cannot run Sass in their build has no way to
avoid Carbon's global reset.** The whole leakage result above depends on it.

---

## Two things to escalate beyond this run

1. **IBM Telemetry runs on install.** Both `@carbon/react` and `@carbon/styles`
   declare `"postinstall": "ibmtelemetry --config=telemetry.yml"`, which performs
   static analysis of the consuming project and POSTs to
   `https://www-api.ibm.com/ibm-telemetry/v1/metrics` — a de-identified repository
   URL and commit hash, the branch and tag names, the project name and version,
   the full dependency list, and **which Carbon components and props the project
   uses**, against an allow-list of ~450 prop names in
   `@carbon/react/telemetry.yml`. IBM documents that it runs only on CI servers and
   in containers, never on a developer's machine, and it is opt-out with
   `IBM_TELEMETRY_DISABLED=true`. It is on by default. This is a procurement and
   data-governance question for whoever owns UNDRR's supplier data policy, and the
   engineering mitigation is one line in CI that should be there from the first
   commit. Full detail in `licences.md`. **No other candidate installs anything
   comparable.**

2. **`aria-errormessage` on every invalid Carbon input.** Not specific to this
   demo: Carbon points `aria-errormessage` at a div it renders itself and gives
   that div no announcement technique, and exposes no prop to add one. A consumer
   *can* work around it — `aria-describedby="${id}-error-msg"`, which is what both
   Carbon apps now do — but only by relying on two undocumented internals (the id
   derivation, and `...rest` being spread last). Worth reporting on
   `carbon-design-system/carbon` regardless of the workaround, and worth
   screen-reader verification either way.
