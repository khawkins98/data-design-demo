# Evidence: React Aria Components on the Mangrove host

Structured record in `evidence.json`. This is the prose.

**Summary.** Of 30 requirements: **21 native, 7 composed, 2 custom, 0
unsupported**, for 122 custom lines of behavioural code. Leakage clean: the
library ships no CSS at all. The cost lands in one place -- **661 lines of
custom CSS across 120 selectors**.

The two `custom` entries are `table-paginate` (no pagination component) and
`cards` (no card component -- a card is styling, not behaviour).

---

## What went well

**Date-time range picker is native.** `DateRangePicker` with
`granularity="minute"`, one popover, single `RangeCalendar`. Zero custom lines.

**Leakage: 0 differences.** 14 canaries, 27 watched properties. React Aria
injects no stylesheet, no `:root` variables and no global resets. All 120
selectors in `src/theme.css` are scoped under `.demo`.

**RTL needed no work.** `I18nProvider` with an Arabic locale flipped date segment
order, calendar layout, and listbox alignment. No direction-aware CSS needed.

**State styling.** Components expose `data-hovered`, `data-pressed`,
`data-focused`, `data-selected`, `data-disabled`, `data-invalid`,
`data-resizing`. `data-focus-visible` is set only for keyboard focus.

**Validation.** `isInvalid` + `FieldError` for client-side. `Form`'s
`validationErrors` routes server-rejected errors to the named field automatically.

---

## Where it cost

**661 lines of CSS.** Every button variant, focus ring, popover shadow, calendar
cell state and table zebra stripe must be authored.

**Pagination does not exist.** 34 custom lines for page state, slicing,
page-size control, and Previous/Next navigation.

**Table gives behaviour, not a data layer.** `allowsSorting` supplies the UI and
ARIA but not the comparator; `SearchField` supplies the input but not the
predicate. Sorting: 22 lines. Filtering: 14 lines.

**Multiselect is composed.** `ListBox selectionMode="multiple"` + `TagGroup`/
`TagList` for removable chips, joined by a 6-line `onRemove` handler.

**Cards.** No card component. Plain markup reusing Mangrove's `mg-card` classes.

---

## Findings

### 1. Hidden native `<select>` scrolls the page sideways

`Select` renders a hidden native `<select>` with `clip`/`clip-path` that **does
not remove it from layout**. Intrinsic width (495px) causes horizontal scroll at
390px. Fix: `.demo [data-testid="hidden-select-container"] { overflow: hidden; }`.
Targeting `data-testid` is fragile; recorded as `overridesLibraryInternals`.

### 2. Mangrove defeats the `hidden` attribute -- all four Mangrove pairings

Host defect. Mangrove's `input[type="text"]` rule (0,1,1) outranks its
`[hidden]` rule (0,1,0), so libraries that hide helper inputs with `hidden` get
visible text boxes. React Aria's `DatePicker` and `DateRangePicker` rendered
stray inputs showing raw ISO dates.

Fixed per-app: `.demo [hidden] { display: none; }` (0,2,0). MUI, Carbon and
Mantine all use hidden inputs -- **should be fixed in Mangrove**. Also resolved a
critical axe `label` violation. **Scoped axe: 1 critical to 0.**

### 3. Portalled overlays lose design tokens

React Aria portals to `document.body`, outside `.undrr-tokens`. Every token
resolved to nothing:

| Declaration | Computed |
| --- | --- |
| `background: var(--undrr-color-surface)` | `rgba(0, 0, 0, 0)` |
| `border: 1px solid var(--undrr-color-border-strong)` | `0px` -- declaration voided |
| `z-index: var(--undrr-z-popover)` | `100000`, React Aria's inline default |

Fixed by putting the token scope class on each overlay (`src/overlay-class.ts`).
MUI avoids this because it resolves tokens at build time and emits literal
colours. React Aria's inline `z-index: 100000` requires `!important` to override.

### 4. `Radio` intercepts pointer events

Playwright's `getByRole("radio").click()` times out -- React Aria's `<label>`
wrapping intercepts. Clicking the label works.

### 5. Horizontal scroll at 390px in German -- RESOLVED

Now 0px at all three viewports. Causes: (1) CSS cascade error -- `.demo-sbs`'s
base rule sat below an equally specific media query, winning at every viewport.
(2) `ColumnResizer`'s hidden range input at `position: absolute` with no
positioned ancestor; `position: relative` on the wrapper fixed it.

### 6. Table selection had no select-all

`selectionMode="multiple"` renders **no checkboxes** and no select-all. Requires
`<Checkbox slot="selection">` in header and every row. Corrected from `native` to
`composed` (16 lines).

Long labels: **desktop 0px, tablet 0px, mobile 261px.** Mobile remains; needs a
design decision. `longLabels.status` is `"issues"`.

### 7. 400 options render 400 DOM nodes

`ListBox` virtualises only when wrapped in `Virtualizer`. Left unwrapped for
like-for-like comparison.

---

## Accessibility

Scoped to candidate subtree: **0 violations, 1 incomplete (`color-contrast`)**.

All eight sections: 0 violations. Sections 2 and 6 report one `color-contrast`
incomplete each. Whole-page count is 1 due to Mangrove host's
`link-in-text-block` serious violation; scoped number used in `evidence.json`.
Getting to 0 required fixing the `[hidden]` bug (finding 2).

---

## Theming

47 of 71 tokens applied, **0 unreachable**. The 24 unapplied tokens have no use
on this page -- none were blocked by the library. Method: token custom properties
consumed directly in a scoped stylesheet. No theme provider, no CSS-in-JS, no
`!important`. Mangrove 2.0 preview tokens not used.

---

## Determinism

`parseAbsoluteToLocal` resolves to the runner's timezone. Replaced with
`parseAbsolute(iso, FIXED_TIME_ZONE)`. No `new Date()` in demo code.

---

## Shared packages

Not modified.
