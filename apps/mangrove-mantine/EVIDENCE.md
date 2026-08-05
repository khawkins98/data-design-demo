# Evidence: Mantine on the Mangrove host

Structured record in `evidence.json`. This is the prose.

**Summary.** Of 30 requirements: **19 native, 10 composed, 1 custom, 0
unsupported**, for **293 lines of custom behavioural code** — 229 of them (78%)
in the data table. Leakage was clean, but only because Mantine's global baseline
stylesheet was deliberately not imported; imported, it changes **36 computed
properties across all 14 host canaries**. Scoped axe is **0 violations**, after
fixing two `button-name` criticals that Mantine ships by default. **103 lines of
custom CSS across 44 selectors**, of which 30 lines are a scoped replacement for
the baseline Mantine would otherwise have applied globally.

Two headline results:

1. **Mantine has a native date-time range picker, under MIT.** This is the
   requirement that most separates the candidates, and it is the one thing MUI
   charges for.
2. **Mantine's `Table` is presentational only.** Sort, filter, select, paginate
   and resize are all yours. This is the sharpest gap in the library for a
   disaster-loss data application, and it is not a small one.

---

## What went well

### The date-time range picker is native, and free

**This corrects the brief.** The run was told `DateTimePicker` was single-only and
that `datetime-range-picker` would need the composed two-picker fallback from
`docs/requirements.md`. That is not true of `@mantine/dates` 9.5.1. The
coordinator has since confirmed the correction independently, and the
delta-mantine run reached the same conclusion; this run found it before either,
by reading the installed types rather than trusting the briefing.

`<DateTimePicker type="range">` gives one popover, one focus trap, one calendar
with the intervening days highlighted, and two `TimePicker`s — start and end —
inside it. Verified in the browser, not from the types:
`screenshots/desktop/03-dates-range-open.png` is the open dropdown, and
`e2e/demo.spec.ts` asserts `[data-in-range]` is visible and that the input value
contains the `labelSeparator`. Zero lines of range plumbing.

Evidence it is a real implementation rather than a permissive generic:

| Source | What it shows |
| --- | --- |
| `types/DatePickerValue.d.ts` | `DatePickerType = 'default' \| 'multiple' \| 'range'` |
| `DateTimePicker.mjs:27` | `const isRange = type === "range"` |
| `DateTimePicker.d.ts` | `endTimePickerProps`: "props passed down to the **end** time TimePicker component in range mode" |
| `DateTimePicker.d.ts` | `allowSingleDateInRange?: Type extends 'range' ? boolean : never` |
| `DateTimePicker.mjs` | `clearIncompleteRange()` resets `[start, null]` on dropdown close |

**Why this matters to the evaluation's conclusion.** MUI's range pickers live
only in `@mui/x-date-pickers-pro`, licence `SEE LICENSE IN LICENSE` — commercial.
The delta-mui run composed two free pickers instead and recorded what that costs:
no shared calendar, no drag-to-select, two focus traps, no single accessible name
for the range. Mantine gives all of that for nothing, matching React Aria.
Mantine has no paid tier at all, so there is no requirement in this evaluation
that a Mantine licence fee could unlock.

### Determinism came for free

Mantine 8+ dropped `Date` objects for plain strings — `YYYY-MM-DD` and
`YYYY-MM-DD HH:mm:ss` — with no timezone concept anywhere in the API. The fixture
ISO strings are *sliced* into that shape in `demo-state.ts`; nothing is parsed.

That removes by construction the bug the react-aria run hit, where
`parseAbsoluteToLocal` resolved to the runner's timezone and the same build
rendered 00:00 in London and 02:00 in Berlin. There is no instant to resolve, so
no runner can shift it. No `new Date()` in any component; the only `Date`
constructions are in `Intl` formatting paths, all with `timeZone: "UTC"`.

### Selection is the strongest section

`Select`, `MultiSelect` and `Autocomplete` are one component each. `searchable`
is a prop. `MultiSelect` renders removable `Pill`s with no composition at all —
React Aria has no multiselect component and needed `ListBox` + `TagGroup` wired
together with a custom `onRemove`. `nothingFoundMessage`, `clearable` and
`limit` are props too. Zero custom lines for five requirements.

### States are better covered than in either sibling demo

Mantine 9.5 ships `EmptyState`, a documented component for the empty case, plus
`Loader`, `LoadingOverlay` and `Skeleton`. Neither sibling demo had an empty-state
component; React Aria needed hand-written `role="alert"`/`role="status"` banners.

### Overlays are native and survive portalling

Modal, Tooltip, Popover and Accordion are four components with focus trap, focus
restore, Escape, outside-click dismiss and the ARIA wiring already done.
`Accordion order={4}` wraps each control in a heading, which is what WAI-ARIA asks
for and what most accordion implementations omit.

On the portalled-token trap: **Mantine is immune, and this was verified rather
than assumed.** `test-results/overlay-backgrounds.json` records that
`--undrr-color-surface` reads as the empty string on `document.body`, i.e. the
tokens genuinely are out of scope inside the portal — and every overlay still
renders an opaque background, because Mantine's theme resolved the token values
at build time into `--mantine-*` properties written at `:root`. Same mechanism
that makes MUI immune, and the same trade: build-time inlining means a token
change needs a rebuild.

---

## Where it cost

### The data table: 229 custom lines for what MUI gets from props

`@mantine/core`'s `Table` is **presentational only**. It renders `<table>` and
friends with `striped`, `highlightOnHover`, `withTableBorder`, `stickyHeader`,
`tabularNums`, `layout` and a `ScrollContainer`. That is the whole of it. There is
no `sortable`, no `checkboxSelection`, no filter model, no pagination model, no
column sizing, and there is no headless table hook in `@mantine/hooks` either.

| Requirement | Status | Lines | What Mantine gave |
| --- | --- | --- | --- |
| `table-render` | composed | 30 | the markup; the row/cell loop and all `Intl` formatting are ours |
| `table-sort` | composed | 40 | nothing — comparator, direction state, `aria-sort` and the header buttons are ours |
| `table-multiselect` | composed | 33 | `Checkbox` with a real `indeterminate` prop; the selection set and select-all logic are ours |
| `table-filter` | composed | 26 | `TextInput` and `Select`; the predicate is ours |
| `table-paginate` | composed | 28 | `Pagination` — a complete accessible pager. Page state, slicing and the page-size control are ours |
| `table-column-resize-or-reorder` | **custom** | 72 | nothing at all |

The comparison is stark. `apps/delta-mui` got sort, multi-select, filter,
pagination *with* a page-size control, and column resize from props on a single
`<DataGrid />`, for **0 custom lines**. `apps/mangrove-react-aria` sat in between:
sorting cost 22 lines and pagination 34, but `Table` supplied `allowsSorting`,
the ARIA, the keyboard handling and `ResizableTableContainer`.

Two details worth carrying into the decision:

**Sorting is not just a comparator.** Because `Table.Th` has no sorting
affordance, the `aria-sort` contract is ours too, not only the visual arrow. A
team that writes the comparator and forgets `aria-sort` ships a table that is
unusable with a screen reader and looks fine in review.

**The comparator has to be locale-aware or the French and German fixtures sort
wrong.** `Intl.Collator` with `sensitivity: "base"`, because a naive `<` sorts by
code point and puts "Éthiopie" after "Zimbabwe".

### `table-column-resize-or-reorder` is `custom`, not `unsupported` — and why

There is no column sizing behaviour anywhere in `@mantine/core` or
`@mantine/hooks`. `Splitter` exists but resizes layout panes and cannot live
inside a `<tr>`.

The Mantine ecosystem's usual answer is **`mantine-datatable`**, which is a
third-party package outside `@mantine/*`. Brief 1 forbids installing one to fill a
gap, so nothing was installed. The status is `custom` rather than `unsupported`
because the requirement *is* reachable — `unsupported` is reserved for what cannot
be met at all within the free tier, and this can be, at a cost of 72 lines.

`src/use-column-resize.ts` implements pointer-drag resizing with pointer capture,
a minimum width, and **keyboard resizing**: the handle is a focusable
`role="separator"` with `aria-valuenow`, adjustable with arrow keys and PageUp/
PageDown and resettable with Home. The keyboard half is included deliberately —
React Aria's `ResizableTableContainer` is keyboard-accessible, so a mouse-only
hand-rolled resizer would have flattered Mantine rather than measured it. The e2e
suite asserts the keyboard path.

What it still does not do, and a native implementation would: announce the new
width to assistive technology as it changes, derive a maximum width from content,
or persist widths across a change to the column set.

**For UNDRR this is the finding that should drive the decision.** This is a *data*
design system evaluation. If Mantine is chosen, the realistic path is to add
`mantine-datatable` — a well-maintained MIT package, but a single-maintainer
third-party dependency in the critical path of the application's most important
screen — or to budget for building and maintaining the table layer in-house.

### Mantine's global baseline had to be dropped, and that is a real deviation

`@mantine/core/styles.css` is a concatenation of `baseline.css`, `global.css`,
`default-css-variables.css` and 98 per-component files. `baseline.css` is a
**global reset**, and every one of its rules reaches the host:

```css
*, *::before, *::after           { box-sizing: border-box }
input, button, textarea, select  { font: inherit }
button, select                   { text-transform: none }
body, :host                      { margin; font-family; font-size; line-height;
                                   background-color; color }
```

`src/mantine-styles.css` imports items 2–4 and omits item 1, and `src/demo.css`
re-applies the equivalent reset scoped to `.demo` and `.demo-overlay`. This is
exactly the trade `apps/delta-mui` made by using `ScopedCssBaseline` instead of
`CssBaseline`, and it carries the same caveat: **Mantine components are built
expecting that baseline, so omitting it is a real deviation from the library's
documented setup, not a free win.**

**Measured, not argued.** `e2e/demo.spec.ts` injects `baseline.css` over the
host-only page and records the result:
`test-results/leakage-with-baseline.json` — **36 differences across all 14
canaries.** Every canary loses Mangrove's `Roboto` for Mantine's system stack;
every text canary goes from `rgb(26,26,26)` to `rgb(0,0,0)`; `nav` and `nav-link`
line-height shifts 24px → 24.8px.

The delta-mantine run measured **23** differences for the same file. The gap is
the hosts: **Mangrove has no global `box-sizing` reset**, where Delta's Tailwind
Preflight supplies both `box-sizing: border-box` and `font: inherit` already. So
on Mangrove the `*` selector alone changes the computed `box-sizing` of the
headings, paragraph, cards and nav, and the scoped replacement has to supply
what Preflight would have. The coordinator's warning not to copy the Delta
approach blindly was correct; the reset in `demo.css` BLOCK 1 is written with
`:where()` so its specificity is (0,0,0), matching the real baseline's, and the
cascade inside the subtree behaves identically. Raising the specificity would
have been wrong: `font: inherit` at (0,1,1) beats Mantine's own input font-size
and breaks every field.

### The import-order trap, which cost an afternoon and looked like a theming bug

Every Mantine class is a single hashed class at (0,1,0), so the cascade between
component stylesheets is decided **purely by source order**. `UnstyledButton.css`
sets `background: transparent; border: 0; padding: 0`; `Button.css` sets the real
appearance; a `<Button>` carries **both** classes. In `styles.css` UnstyledButton
is 5th and Button 37th, so Button wins.

Imported alphabetically — the obvious thing to do — Button came first and **every
button on the page rendered as bare text.** No background, no border, no padding.
Nothing warned: the build was clean, `tsc` was clean, all 16 e2e tests passed,
and axe reported nothing, because every button still worked and axe does not check
whether a button looks like one. `useMantineTheme()` returned the correct token
values throughout, so it presented as a theming failure rather than an ordering
one. **It was caught by looking at a screenshot.** The delta-mantine run hit the
identical trap.

The fix is to derive the order from the byte offsets of each file's content
inside `@mantine/core/styles.css`, which is what the list in
`src/mantine-styles.css` is. Verified: 461 of 461 hashed classes present in the
built chunk, no baseline rules, no extras.

**Worth raising upstream.** Mantine documents per-component imports as a
supported optimisation but does not document that the order is load-bearing, and
the failure is silent. A `styles.css` with the baseline factored out — or a
documented canonical order — would remove a whole class of consumer bug.

### Two components collide with the host, and finding the second one needed a screenshot

The other direction of the two-stylesheet problem, and the one the leakage
assertion cannot see: the **host** reaching into the **candidate**.

Mangrove's `_form-legacy.scss` compiles to seven `input[type=…]` selectors plus a
bare `textarea`, all setting `border: 2px solid #1a1a1a; height: 46px;
appearance: none; border-radius: 0; width: 100%; font: Roboto 1rem`. The
prediction — mine and the brief's — was that this would wreck every Mantine form
control, because `input[type=text]` is (0,1,1) and Mantine's input rule is
(0,1,0).

Measured, the blast radius is **5 elements from 2 components, out of the 50 inputs
this page renders** (`test-results/host-collision.json`):

1. **Mantine sets no `type` attribute on its inputs.** 50 inputs, `type` present
   on 33, and every one of those is `checkbox`, `radio`, `hidden` — or, five
   times, `text`. An attribute selector needs the attribute present, so
   `TextInput`, `Select`, `Autocomplete`, `NumberInput` and the date-picker inputs
   are untouched.
2. **The `textarea` selector matches but loses.** On its own it is (0,0,1), below
   Mantine's (0,1,0) class. **Specificity is computed per selector in a comma
   list, not per rule** — the heavier siblings in that list do not help it. The
   Textarea keeps Mantine's 1px token border and its autosized 97px height.

The two that do collide are the only components in the library that emit
`type="text"`:

- **`PillsInputField`** (`@mantine/core`), the search field inside `MultiSelect`.
  It is designed to be an invisible flex child of the pill group — `border: 0`,
  transparent, `height: 1.6em`, `padding: 0`, `flex: 1`. Mangrove turned it into a
  2px-bordered, 46px-tall, 858px-wide white box stacked under the pills.
- **`TimePicker`'s hour and minute fields** (`@mantine/dates`). Four of them
  render inside the date-time range popover. Mangrove turned each into a
  183px-wide, 46px-tall white box with a black border — wrecking the very popover
  that is this run's headline finding.

Two scoped rules at (0,3,1) restore both, using Mantine's own values. **Note how
each was found.** The MultiSelect one by reading a computed style. The TimePicker
one only by opening the popover and looking at a screenshot — the first version of
the collision measurement queried `[data-candidate-root] input` and could not see
them, because they live in a portal and only exist while the dropdown is open. The
e2e inventory now opens the range picker and sweeps every `.demo-overlay` too.

### The `[hidden]` trap does not reproduce

`apps/mangrove-react-aria/EVIDENCE.md` finding 2 — Mangrove's
`[hidden] { display: none }` at (0,1,0) losing to `input[type=text]
{ display: block }` at (0,1,1) — **does not affect Mantine**, and by the same two
facts above. Every helper input Mantine renders (`HiddenDatesInput`,
`ComboboxHiddenInput`, and the hidden inputs in `Checkbox.Group`, `Switch.Group`,
`PinInput`, `Slider`, `ColorPicker`) is `type="hidden"`, which is not in
Mangrove's selector list and which the user agent hides regardless.

**No `.demo [hidden]` guard is shipped, deliberately.** Adding one would have made
the e2e assertion tautological instead of a measurement of Mantine's behaviour
against the unmodified host. The host bug is still real and still worth fixing in
Mangrove — it just happens not to bite this candidate.

### Ten shades per colour, from a token set that has four

Mantine requires every colour to be a **ten-shade tuple**, and
`theme.primaryColor` must be a *key* of `theme.colors` — a hex string is rejected
by `validateMantineTheme`. The token set gives four accent stops, six neutrals and
one stop per status colour.

The response here was to **repeat token values rather than interpolate new ones**,
so every colour Mantine renders is one a designer chose. The cost is that shades
Mantine expects to differ do not, which flattens hover and press differentiation
for any component reaching for a shade the tokens do not define. The only derived
values in `theme.ts` are shades 7 and 8 of the four status colours, produced by
Mantine's own documented `darken()` because a filled `color="red"` button with no
hover change reads as broken.

**This turned a token-mapping decision into an accessibility outcome, silently.**
The first version interpolated an even ramp through the six neutral tokens, which
put an invented `#75838f` at `gray-6`. Mantine maps `gray-6` to
`--mantine-color-dimmed`, i.e. every `c="dimmed"` Text on the page, at 3.9:1 on
white — **five serious axe `color-contrast` violations across four sections.**
Pinning `gray-6` to `textSecondary` (7.4:1) removed all five. Nothing in the API
signals that shade 6 of `gray` is the dimmed-text colour; you find out from axe.

The full neutral mapping that has to be got right:

| Shade | Mantine consumer |
| --- | --- |
| `gray-3` | `--table-border-color` |
| `gray-4` | `--mantine-color-default-border`, i.e. every input border |
| `gray-5` | `--mantine-color-placeholder` |
| `gray-6` | `--mantine-color-dimmed` |

### Two icon-only buttons ship with no accessible name

Out of the box, axe reported **2 critical `button-name` violations**:

- `Pagination`'s first/previous/next/last controls — four unnamed icon buttons.
  Fixed with `getControlProps`.
- `InputClearButton`, rendered by `clearable` on `DatePickerInput`, `Select` and
  `MultiSelect`. Fixed with `clearButtonProps={{ "aria-label": … }}`.

Both are fixable through the public API, and both are **inaccessible by default**.
A team that turns on `clearable` and `withEdges` and does not run axe ships
unlabelled controls. Worth raising upstream: a sensible English default with an
override would be strictly better than nothing.

### RTL needs a document-level mutation

`DirectionProvider` holds the direction in React context, but the only way to
change it is `setDirection()`, which writes `dir` to `document.documentElement` —
**outside the candidate subtree**. There is no "be RTL within this element" prop.
Mantine's own CSS is written as `:where([dir="rtl"]) .m_xxx`, which would match
from any ancestor, so the CSS half would have worked from the host's wrapper
alone; it is the JS context that insists on the document element.

So `src/App.tsx` has a 7-line `DirectionSync` component that pushes the fixture
locale's direction to the document. React Aria needed only `I18nProvider`. MUI
needed a theme rebuild per locale, which is arguably worse. Mantine sits between
them, but it is the only one of the three that reaches outside its own subtree to
do it.

Also on locale: `dayjs` is a *peer* dependency, and its locale files must be
imported by the consumer. Four `import "dayjs/locale/…"` lines in `App.tsx`;
without them `DatesProvider` silently formats in English for French, German and
Arabic.

### 400 options render 400 DOM nodes

`Select` and `MultiSelect` render every option. The documented route to
virtualisation is to drop to the `Combobox` primitive and supply your own
virtualiser. Left unwrapped so the comparison stays like-for-like; `Autocomplete`
is capped with `limit={100}`, which is a documented prop. Whether the plain
400-option `Select` is acceptable is a performance decision not taken here — the
same one both sibling demos deferred.

### The host's nav treatment is not reachable

Mangrove's nav links use a 3px inline-start accent bar. `NavLink` marks the active
item with a tinted background and exposes only `--nl-color`, `--nl-bg` and
`--nl-hover`. The bar is not reachable through props or CSS variables, and it was
**not** faked with a `::before` — the mismatch is left visible in the section 9
screenshots on purpose. This is the clearest single case of "themeable, but not to
the host's shape".

---

## Leakage

**Assertion passed: 14 canaries, 27 watched properties, 0 differences.**
`test-results/leakage.json`.

**But read this before believing it.** The harness compares `?candidate=off`
against `?candidate=on`. A library whose CSS arrives through a static
`import "…/styles.css"` is present in **both** loads, so its leakage cancels out
and the assertion passes vacuously. That is fine for MUI, which injects emotion
styles at render time — it is **not** fine for Mantine, which ships a plain
stylesheet.

So `src/main.tsx` loads Mantine's CSS through an **awaited dynamic import inside
the `candidate=on` branch**, and the e2e suite asserts that
`--mantine-font-family` is absent from `:root` on the baseline load. With the
candidate off, not one byte of Mantine CSS is in the document. Only then is the
zero a measurement.

Any future run pairing a CSS-shipping candidate with this harness should do the
same, or its leakage result means nothing.

Two things Mantine does mutate outside the subtree, neither watched by the
canaries and both recorded here for completeness:

- `MantineProvider` sets `data-mantine-color-scheme="light"` on
  `<html>` via its default `getRootElement`.
- `DirectionProvider.setDirection()` sets `dir` on `<html>`.

`--mantine-*` custom properties are written at `:root`. That is harmless here
**only because `baseline.css` was omitted** — it is the one thing on the page that
consumes them at global scope.

---

## Accessibility

**No conformance is claimed.** Results recorded verbatim.

Scoped to the candidate subtree: **0 violations, 0 incomplete.** All eight
sections individually: 0 violations, 0 incomplete. Per-section JSON in
`test-results/`.

Whole page: **1 violation, 1 serious** — `link-in-text-block` on
`a[data-canary="link"]`, the host's canary paragraph. That is the documented
Mangrove baseline from `docs/host-derivation.md`, caused by Mangrove's base `a`
rule underlining only on hover. It is not this candidate's.

Reaching 0 scoped took three fixes, all recorded above:

| Before | Fix |
| --- | --- |
| 2 critical `button-name` | `getControlProps` on `Pagination`, `clearButtonProps` on every `clearable` input |
| 5 serious `color-contrast` | pinned `gray-6` to `textSecondary` instead of an interpolated ramp value |
| host `link-in-text-block` reproduced inside the candidate | `Anchor underline="always"`, because Mantine's default is `underline="hover"` and would have inherited the host's own WCAG 1.4.1 failure |

That last one is worth stating plainly: **the candidate would have reproduced the
host's accessibility defect by default.** Mantine's `Anchor` and Mangrove's bare
`a` make the same wrong choice independently.

Still needs a human. axe is static analysis and cannot say whether the range
calendar's two time inputs, the hand-written column resizer or the sort buttons
are actually usable with a screen reader. The resizer is the one to test first: it
is 72 lines of our own code standing in for a library primitive, and it does not
announce width changes.

---

## Theming

**62 of 71 tokens applied, 0 unreachable.**

Method: `createTheme()` mapping the TypeScript token export into Mantine's theme
object — `colors`, `primaryColor`, `white`, `black`, `fontFamily`, `headings`,
`fontSizes`, `lineHeights`, `fontWeights`, `radius`, `spacing`, `focusRing`,
`cursorType` — plus six `components.*.defaultProps` for z-index and three CSS
rules for the focus ring. Mantine serialises the theme into its own
`--mantine-*` custom properties at runtime, so the theme is a build-time **copy**
of the token values: changing a token needs a rebuild, where a `var()`-based
consumer picks it up immediately. Same trade as MUI, and the same upside — it is
why the portalled overlays keep their colours.

The 9 unapplied tokens are ones this page has no use for, not ones Mantine
blocked: `--undrr-color-surface-raised`, `--undrr-color-text-inverse`,
`--undrr-color-on-accent`, `--undrr-color-text-disabled`,
`--undrr-color-focus-ring-offset`, and four z-index layers (`base`, `raised`,
`sticky`, `header`) that have no corresponding Mantine surface.

Three friction points, all recorded in `evidence.json.theming.escapeHatchesUsed`:

1. **Ten shades per colour.** Covered above.
2. **No focus colour in the theme.** Mantine's focus ring is
   `--mantine-primary-color-filled`, i.e. the primary colour, with no separate
   field. The token set keeps focus deliberately distinct from accent, so the only
   route is a CSS override on `.mantine-focus-auto:focus-visible` — and it has to
   be repeated under `.demo-overlay`, because portalled surfaces are outside
   `.demo`.
3. **No z-index scale in the theme.** Mantine's layers live in
   `--mantine-z-index-*`, written by the static stylesheet, which the theme object
   cannot reach. Per-component `defaultProps` is the only documented route, and it
   only covers components that expose a `zIndex` prop. Six token layers are
   reachable that way; the scale as a scale is not. Contrast with MUI, whose
   `theme.zIndex` is a first-class field, and with React Aria, which sets
   `z-index: 100000` **inline** and cannot be pinned at all without
   `!important`.

The token set has no shadow scale, so Mantine's default `shadows` remain. That is
a gap in the tokens, not in Mantine.

The **Mangrove 2.0 preview tokens were not used**, so every number here describes
theming against `packages/undrr-tokens` only, as the brief requires.

---

## Metrics

| | |
| --- | --- |
| Custom CSS | 103 lines, 44 selectors, 18 rules (253 lines including comments) |
| — of which the scoped baseline | 30 lines, replacing a global stylesheet |
| — of which host collision repair | 24 lines, 4 selectors, 2 components |
| Custom behavioural code | 293 lines, 229 of them (78%) in the data table |
| TypeScript in `src/` | 1,410 code lines across 15 files |
| Tokens applied | 62 of 71, 0 unreachable |
| Gzipped bundle | 270.9 kB total; 198.3 kB JS, 37.0 kB Mantine CSS, 35.4 kB host CSS, 0.9 kB ours |
| Build time | 3.58 s (Vite), 4.6 s wall |
| Dependencies | 113 installed (dev included), 21 attributable to Mantine at runtime |
| Licences | MIT 96, Apache-2.0 6, ISC 5, MPL-2.0 2, other 4. No commercial licence |
| Long labels | 0 px horizontal overflow in German at 390, 1024 and 1440 |
| e2e | 48 tests, 16 per viewport, all passing |

On bundle size, the honest comparison: `apps/delta-mui` reported 387.4 kB
gzipped, this run 270.9 kB — but 35.4 kB of that is Mangrove's own stylesheet,
which the Delta host does not carry, so Mantine's own contribution is smaller
still. Mantine ships one 242 kB stylesheet (37 kB gzipped) for the whole library
regardless of what you use, which per-component imports do not reduce because
this page uses most of it.

On long labels, this run is clean at all three viewports. The react-aria run
overflowed **261 px at mobile** and left the assertion failing. The one overflow
found here was 14 px at 390 px in German, caused by a fixed `w={380}` I had put on
the range picker; `w="100%" maw={380}` fixed it. Nothing about Mantine caused it.

---

## Comparison with delta-mantine

Same candidate, different host. Points that can be compared directly:

| | mangrove-mantine | delta-mantine |
| --- | --- | --- |
| `baseline.css` canary differences | **36** | 23 |
| Why | Mangrove has no global reset; the scoped replacement must supply `box-sizing` and `font: inherit` itself | Tailwind Preflight already supplies both |
| Import-order trap | hit, buttons rendered as bare text | hit, same symptom |
| Native `type="range"` | confirmed | confirmed |
| Host-into-candidate collisions | 2 components, 5 elements — Mangrove styles form controls by element and attribute | Preflight is a *reset*, so it strips rather than imposes |

The direction of the host interference is the interesting difference. Delta's
Preflight removes styling and Mantine puts it back through its own classes, which
mostly works. Mangrove *imposes* styling by element selector, and where its
specificity beats Mantine's — which happens only where Mantine emits a `type`
attribute — Mantine has no way to win it back without a consumer-written rule.

---

## Shared packages

Not modified. Nothing in the scaffold blocked this implementation.

One observation about the harness rather than a blocker, recorded because it
affects the other runs: **`checkLeakage` cannot detect leakage from a statically
imported stylesheet**, since the stylesheet is present in both the `off` and `on`
loads. The docstring in `leakage.ts` explains the reload is *for* that case, but
the reload does not help when the CSS arrives at module-import time rather than at
render time. This run works around it in its own `main.tsx` with a dynamic
import; a note in `packages/test-harness` would stop the next run from recording a
clean result it had not earned.
