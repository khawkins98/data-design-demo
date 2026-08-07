# Evidence: React Aria Components on the Mangrove host

Structured record in `evidence.json`.

**Summary.** Of 30 requirements: **21 native, 7 composed, 2 custom, 0
unsupported**, for a total of 122 custom lines of behavioural code. React Aria is
the only candidate expected to satisfy `datetime-range-picker` natively. Leakage
was clean: the library ships no CSS at all. The cost lands almost entirely in one
place -- **661 lines of custom CSS across 120 selectors**.

The two `custom` entries are `table-paginate` (no pagination component) and
`cards` (no card component -- a card is styling, not behaviour).

---

## What went well

**Date-time range picker is native.** `DateRangePicker` with
`granularity="minute"` gives both endpoints date and time, in one popover over a
single `RangeCalendar`. Zero custom lines.

**Leakage: 0 differences.** 14 canaries, 27 watched properties. React Aria
injects no stylesheet, no `:root` variables and no global resets.

**Qualification:** the assertion diffs two page loads, so statically imported CSS
cancels out. Result holds by construction -- all 120 selectors in `src/theme.css`
are scoped under `.demo`. Harness limitation documented in
`packages/test-harness/src/leakage.ts` and `docs/requirements.md`.

**RTL needed no work.** Wrapping the tree in `I18nProvider` with an Arabic locale
flipped date segment order, calendar layout, and listbox alignment. No
direction-aware CSS or `dir` plumbing needed.

**State styling.** Components expose `data-hovered`, `data-pressed`,
`data-focused`, `data-selected`, `data-disabled`, `data-invalid`,
`data-resizing`. `data-focus-visible` is set only for keyboard focus, so no
`:focus-visible` gymnastics needed.

**Validation.** Client-side: `isInvalid` + `FieldError`. Server-rejected errors:
`Form`'s `validationErrors` prop routes the message to the named field's
`FieldError` automatically.

---

## Where it cost

**661 lines of CSS.** Every button variant, focus ring, popover shadow, calendar
cell state and table zebra stripe must be authored. 661 lines reached *adequate*,
not polished.

**Pagination does not exist.** No component, no hook. 34 custom lines for page
state, slicing, page-size control, and Previous/Next navigation.

**Table gives behaviour, not a data layer.** `allowsSorting` supplies the UI,
ARIA and keyboard handling but not the comparator; `SearchField` supplies the
input but not the predicate. Sorting: 22 lines. Filtering: 14 lines. The
comparator must handle number, ISO string and locale-aware string correctly.

**Multiselect is composed, not native.** `ListBox selectionMode="multiple"` plus
`TagGroup`/`TagList` for removable chips, joined by a 6-line `onRemove` handler.

**Cards.** No card component. Rendered as plain markup reusing Mangrove's
`mg-card` classes.

---

## Findings

### 1. Hidden native `<select>` elements scroll the page sideways

`Select` renders a hidden native `<select>` for form integration, hidden with
`clip` and `clip-path`. These **do not remove it from layout**, and the container
has no `overflow: hidden`. The select's intrinsic width (495px for the longest
fixture label) causes horizontal scroll at 390px viewport.

Fix reaches into library-rendered markup:

```css
.demo [data-testid="hidden-select-container"] { overflow: hidden; }
.demo select:not(.demo-input) { max-width: 100%; }
```

Targeting `data-testid` is fragile. Recorded as `overridesLibraryInternals:
true`. Should be raised upstream.

### 2. Mangrove defeats the `hidden` attribute -- affects all four Mangrove pairings

Host defect, not a candidate defect. Mangrove's stylesheet:

```css
[hidden], template                            { display: none; }   /* (0,1,0) */
input[type="text"], input[type="date"], ...    { display: block; }  /* (0,1,1) */
```

The second outranks the first, so **Mangrove's `[hidden]` reset loses to its own
input rule.** Any library that hides a helper input with `hidden` has it render
as a visible text box. React Aria's `DatePicker` and `DateRangePicker` rendered
stray visible inputs showing `2026-06-15` and `2026-05-01T00:00:00+00:00[UTC]`.

Caught by screenshot, not by assertion -- the leakage check watches the opposite
direction (candidate affecting host).

Fixed per-app, no `!important` needed since `.demo [hidden]` is (0,2,0):

```css
.demo [hidden] { display: none; }
```

MUI, Carbon and Mantine all use hidden inputs, so **every Mangrove pairing will
hit this.** Should be fixed in Mangrove rather than worked around four times.

This also resolved a critical axe `label` violation on the formerly-visible
hidden inputs. **Scoped axe went from 1 critical violation to 0.**

### 3. Portalled overlays lose the design tokens entirely

Found by screenshot, not by test. Every popover, calendar, modal and tooltip
rendered transparent and borderless.

React Aria portals overlays to `document.body`, outside `.undrr-tokens`. CSS
custom properties inherit down the DOM tree, so every token resolved to nothing:

| Declaration | Computed |
| --- | --- |
| `background: var(--undrr-color-surface)` | `rgba(0, 0, 0, 0)` |
| `border: 1px solid var(--undrr-color-border-strong)` | `0px` -- the whole declaration voided |
| `z-index: var(--undrr-z-popover)` | `100000`, React Aria's inline default |

A failed `var()` is silent -- no console message, and the component functions
normally. The e2e suite passed throughout because it asserted behaviour, not
visual rendering.

Fixed by putting the token scope class on each portalled overlay
(`src/overlay-class.ts`).

Not a React Aria defect -- it is an interaction between portalling and scoping
tokens to a class instead of `:root`. Will recur for any candidate that styles
via `var()`. Documented in `docs/requirements.md`.

**Comparison with MUI:** MUI's portalled popper is also outside the token scope,
yet renders correctly because MUI resolves tokens at build time and emits literal
colours. MUI's build-time inlining is a drawback elsewhere (tokens cannot change
at runtime) but an advantage here.

React Aria also sets `z-index` **inline** at 100000 on the portal container,
which outranks any class rule. The token z-index scale requires `!important` to
override.

### 4. `Radio` intercepts pointer events, so `getByRole("radio").click()` fails

React Aria's `Radio` renders a `<label>` wrapping a visually hidden `<input>`.
Playwright's `getByRole("radio").click()` times out with "label intercepts
pointer events". Clicking the label works. Teams adopting React Aria should
expect to write click helpers for form controls.

### 5. Horizontal scroll at 390px in German -- RESOLVED

Now 0px at all three viewports. The `delta-react-aria` run got 0px with the same
library, viewport and locale, which prompted re-measurement. Two causes:

1. **CSS cascade error.** `.demo-sbs`'s base two-column rule sat *below* an
   equally specific `@media (max-width: 48rem)` block. Media queries add no
   specificity, so the later rule won at every viewport. `.demo-chrome` was
   declared above the media block and worked correctly.
2. **`ColumnResizer`'s hidden range input escaping its container.** It renders at
   `position: absolute` with no positioned ancestor, resolving against the
   initial containing block. `position: relative` on the scroll wrapper fixed
   it. `overflow-x: hidden` did not.

### 6. Table selection had no select-all, and the evidence claimed it did

`selectionMode="multiple"` gives selection behaviour (click, shift-click,
keyboard) but renders **no checkboxes** and provides no select-all. A selection
column with `<Checkbox slot="selection">` in the header and every row is
required; the slot supplies the tri-state and localised accessible name.

`table-multiselect` was originally recorded as `native`. Corrected to `composed`
(16 lines), the column implemented, and an e2e test added that drives select-all
through all three states. Found by the `delta-react-aria` run.

Measured: **desktop 0px, tablet 0px, mobile 261px.** Recorded in
`test-results/long-labels-*.json`.

Fixed: unconstrained native `<select>`, a missing `min-width: 0` that let the
table's intrinsic width scroll the document, and a `ResizableTableContainer`
sizing to summed column widths rather than its parent. Those fixed tablet.

The 261px at mobile remains. The e2e assertion still fails. `longLabels.status`
is `"issues"` -- needs a design decision: stack the range picker's endpoints
vertically at mobile, or accept horizontal scroll.

### 7. 400 options render 400 DOM nodes

`ListBox` virtualises only when wrapped in `Virtualizer`. Left unwrapped for
like-for-like comparison across candidates.

---

## Accessibility

**No conformance is claimed.** Results recorded verbatim.

Scoped to the candidate subtree: **0 violations, 1 incomplete
(`color-contrast`)**. Per-section JSON in `test-results/`.

All eight sections report 0 violations. Sections 2 and 6 each report one
`color-contrast` incomplete (axe could not decide automatically).

Whole-page count is 1 due to Mangrove host's `link-in-text-block` serious
violation (base `a` rule underlines only on hover). Documented in
`docs/host-derivation.md`; the scoped number is used in `evidence.json`.

Getting to 0 required fixing the host's `[hidden]` specificity bug (finding 2).

Still needs: keyboard and screen-reader testing. axe is static analysis only.

---

## Theming

47 of 71 tokens applied, **0 unreachable**. The 24 unapplied tokens have no use
on this page (`--undrr-color-info`, `--undrr-font-family-mono`, larger spacing
steps, unused z-index layers) -- none were blocked by the library.

Method: token custom properties consumed directly in a scoped stylesheet. No
theme provider, no CSS-in-JS, no `!important`, no specificity escalation.

Mangrove 2.0 preview tokens were **not** used; numbers describe theming against
`packages/undrr-tokens` only.

---

## Determinism

`parseAbsoluteToLocal` resolves to the runner's timezone, producing different
screenshots per machine. Replaced with `parseAbsolute(iso, FIXED_TIME_ZONE)`.

No `new Date()` in demo code. All dates derive from `TODAY_ISO` and
`DEFAULT_RANGE`.

---

## Shared packages

Not modified. No findings against `fixtures`, `undrr-tokens`, `host-mangrove` or
`test-harness`.
