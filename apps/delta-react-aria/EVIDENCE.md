# Evidence: React Aria Components on the Delta host

Structured record in `evidence.json`.

**Summary.** Of 30 requirements: **20 native, 8 composed, 2 custom, 0
unsupported**, totalling 128 custom lines. Leakage: 14 canaries, 0 differences.
axe: **0 violations scoped and 0 whole-page**, 1 incomplete. Long labels clean
at all three viewports. All 45 e2e tests pass.

**715 lines of custom CSS across 156 selectors** — 15% more than Mangrove,
attributable to Tailwind Preflight. Two `native` classifications from the
Mangrove run are **corrected here** (both downward). See findings 1 and 2.

---

## The host difference, measured

`host-delta/host.css` is Tailwind 4 with Preflight:

| Preflight rule | What it removes from React Aria |
| --- | --- |
| `*, ::before, ::after { border: 0 solid; margin: 0; padding: 0 }` | every control's box, every paragraph's spacing |
| `h1..h6 { font-size: inherit; font-weight: inherit }` | heading hierarchy, `Calendar`'s `Heading`, `Dialog`'s title |
| `a { color: inherit; text-decoration: inherit }` | `Link` becomes body text |
| `button, input, select { font: inherit; background-color: #0000; border-radius: 0 }` | `Button` becomes bare text |
| `ol, ul, menu { list-style: none }` | `ListBox`'s list semantics have no visual form |
| `table { border-collapse: collapse }` | (helpful) |
| `[hidden] { display: none !important }` | (helpful — see finding 3) |

Rules marked `PREFLIGHT RECOVERY` in `theme.css`: roughly 90 lines.

---

## What went well

**Date-time range picker is native.** `DateRangePicker` with
`granularity="minute"`: both endpoints, one popover, one focus trap, one
`RangeCalendar`. Zero custom lines. MUI's equivalent is commercially licensed.

**Leakage clean by construction.** React Aria injects no stylesheet, no `:root`
variables, no global resets.

**axe: zero violations.** Delta host baseline is 0; the candidate added none.

**RTL needed no work.** `I18nProvider` with `ar-EG` flipped layout, date
segments, Arabic-Indic digits automatically. CSS logical properties handled the
nav border.

**State styling is complete.** `data-hovered`, `data-pressed`,
`data-focus-visible`, `data-selected`, `data-disabled`, `data-invalid`, etc.
`data-focus-visible` fires only for keyboard focus.

**Validation.** Client-side: `isInvalid` + `FieldError`. Server-side: `Form`'s
`validationErrors` routes messages to the named field with no custom wiring.

---

## Findings

### 1. No rendered checkboxes or select-all

**Corrects Mangrove, which recorded `table-multiselect` as `native`.** 
`selectionMode="multiple"` gives selection behaviour but no visible checkbox.
Select-all requires `<Checkbox slot="selection">` in header and every row, plus
custom CSS (no border on a Preflight host). 16 custom lines, 30-line CSS block.
Status corrected to `composed`.

### 2. Visually hidden controls scrolled the document 260px

`ColumnResizer`'s hidden `<input type="range">` uses `position: absolute` with
no positioned ancestor, resolving against the initial containing block — eight
inputs sat outside the scroll box (rightmost at x=725 in a 390px viewport).
Fix: `.demo-tablewrap { position: relative; }`. `contain: paint` also works;
`overflow-x: hidden` does not. React Aria's `Select` has the same class of bug.
**Reframes the Mangrove run's unresolved 261px overflow** — here it is 0px.

### 3. Preflight saved this candidate where Mangrove broke it

React Aria's date pickers render hidden `<input>` elements. Preflight's
`[hidden] { display: none !important }` keeps them hidden. On Mangrove,
`input[type="text"]` at (0,1,1) outranks `[hidden]` at (0,1,0), making them
**visible** — critical axe `label` violation. Same candidate, opposite outcome.

### 4. Cascade-order media query bug

`@media (max-width: 48rem)` placed *above* an unconditional rule with equal
specificity loses. Side-by-side stayed two columns at 390px. Inherited from
Mangrove. Moved to end of file. Half of Mangrove's overflow.

### 5. Portalled overlays lose design tokens

React Aria portals to `document.body`, outside `.undrr-tokens`. `var()` tokens
resolve to nothing; one bad `var()` voids the entire border shorthand. On Delta,
Preflight also strips padding inside the portal. Fixed via
`src/overlay-class.ts`. Asserted across five overlay types. `z-index: 100000`
set **inline** requires `!important` to override.

### 6. Delta pairings cannot use Tailwind utilities

`@source "./HostShell.tsx"` limits the compiled stylesheet to the host shell's
**75 utilities**. Any other class emits no CSS, silently. Applies to all four
Delta pairings.

### 7. Testing-ergonomics traps

1. **`Radio`/`Checkbox`**: visually hidden `<input>` in a `<label>`;
   `getByRole().click()` and `.check()` time out. Click the label instead.
2. **`locator.hover()`** does not open tooltips — `useHover` rejects teleported
   pointers. Use `mouse.move` with `steps: 8`.

### 8. `ResizableTableContainer` sets `table-layout: fixed`

Headers no longer grow to fit. Resolved with `overflow: hidden` and
`text-overflow: ellipsis`. Long localised headers need a design ruling.

### 9. 400 options render 400 DOM nodes

`ListBox` virtualises only when wrapped in `Virtualizer`. Left unwrapped for
like-for-like comparison.

---

## Where it cost

**715 lines of CSS / 156 selectors**, vs 624 / 115 on Mangrove (+15%).

**Pagination does not exist.** 46 custom lines.

**Table gives behaviour, not a data layer.** Sorting: 17 lines. Filtering: 13
lines. Comparator must handle number, ISO string, and locale-aware string.

**Multiselect and select-all both composed.** 22 lines.

---

## Accessibility

| Scope | Violations | Serious | Critical | Incomplete |
| --- | --- | --- | --- | --- |
| Candidate subtree | 0 | 0 | 0 | 1 |
| Whole page | 0 | 0 | 0 | 1 |

All eight sections: 0 violations. Sections 2 and 6: one `color-contrast`
incomplete each. Needs human review: `color-contrast` on disabled/hint text and
status badges; keyboard/screen-reader testing for range calendar, column
resizer, listbox type-ahead, tri-state select-all.

---

## Theming

**48 of 71 tokens applied, 0 unreachable.** No theme provider, no CSS-in-JS, no
`!important`. Token changes apply at runtime with no rebuild. Exception: portal
`z-index: 100000` inline requires `!important`.

---

## Determinism

No `new Date()`. All dates from `TODAY_ISO` / `DEFAULT_RANGE` via
`parseAbsolute(iso, FIXED_TIME_ZONE)`. All `Intl` formatters pass
`timeZone: "UTC"`.

---

## Shared packages

Not modified. `evidence.json.blockers` is empty.
