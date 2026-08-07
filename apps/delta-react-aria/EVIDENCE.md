# Evidence: React Aria Components on the Delta host

Structured record in `evidence.json`.

**Summary.** Of 30 requirements: **20 native, 8 composed, 2 custom, 0
unsupported**, totalling 128 custom lines of behavioural code. Leakage: 14
canaries, 0 differences. axe: **0 violations scoped and 0 whole-page**, 1
incomplete. Long labels clean at all three viewports. All 45 e2e tests pass.

**715 lines of custom CSS across 156 selectors** — 15% more than the same demo
on Mangrove, attributable to Tailwind Preflight removing all browser defaults
from unstyled primitives.

Two `native` classifications from the Mangrove run are **corrected here** (both
downward) because this run asserted what that run did not. See findings 1 and 2.

---

## The host difference, measured

`host-delta/host.css` is Tailwind 4 with Preflight:

| Preflight rule | What it removes from React Aria |
| --- | --- |
| `*, ::before, ::after { border: 0 solid; margin: 0; padding: 0 }` | every control's box, every paragraph's spacing |
| `h1..h6 { font-size: inherit; font-weight: inherit }` | all heading hierarchy, including `Calendar`'s `Heading` and `Dialog`'s title |
| `a { color: inherit; text-decoration: inherit }` | `Link` becomes body text |
| `button, input, select { font: inherit; background-color: #0000; border-radius: 0 }` | `Button` becomes bare text |
| `ol, ul, menu { list-style: none }` | `ListBox`'s list semantics have no visual form |
| `table { border-collapse: collapse }` | (helpful — one less rule to write) |
| `[hidden] { display: none !important }` | (helpful — see finding 3) |

The rules in `theme.css` marked `PREFLIGHT RECOVERY` exist solely to undo these
resets: roughly 90 lines. Preflight also helps in one case — see finding 3.

---

## What went well

**Date-time range picker is native.** `DateRangePicker` with
`granularity="minute"` gives both endpoints, one popover, one focus trap, one
`RangeCalendar` with `data-selection-start`/`data-selection-end` styling hooks.
Zero custom lines. MUI's equivalent is commercially licensed.

**Leakage clean by construction.** 14 canaries, 0 differences. React Aria
injects no stylesheet, no `:root` variables, no global resets. Scoping under
`.demo` was sufficient.

**axe: zero violations, whole-page and scoped.** Delta host baseline is 0; the
candidate added none.

**RTL needed no work.** `I18nProvider` with `ar-EG` flipped date segment order,
calendar layout, listbox and tag alignment. Arabic-Indic digits appeared
automatically. CSS logical properties handled the nav border.

**State styling is complete.** Components expose `data-hovered`,
`data-pressed`, `data-focused`, `data-focus-visible`, `data-selected`,
`data-disabled`, `data-invalid`, `data-resizing`, `data-placeholder`,
`data-outside-month`. `data-focus-visible` fires only for keyboard focus, so
focus rings never appear on mouse click.

**Validation covered the hard case.** Client-side: `isInvalid` + `FieldError`.
Server-side: `Form`'s `validationErrors` prop routes messages to the named
field's `FieldError` with no custom wiring.

**Section 5's cards cost nothing.** They use Delta's own utility strings
verbatim, pixel-identical to the host's canary cards. See caveat in finding 6.

---

## Findings

### 1. `selectionMode="multiple"` renders no checkboxes, so there is no select-all

**Corrects the Mangrove run, which recorded `table-multiselect` as `native`.**

`selectionMode="multiple"` gives selection behaviour (click, shift-click,
modifier-click, keyboard) but renders **no checkbox**. Select-all requires adding
a selection column with `<Checkbox slot="selection">` in the header and every
row. The slot provides tri-state `isIndeterminate` and localised accessible
names, but the visible box is entirely custom CSS — on a Preflight host it has
no border to start from.

16 custom lines and a 30-line CSS block. Status corrected to `composed`.

The Mangrove run's e2e suite never asserted select-all. This run's
`expect(getByRole("checkbox", { name: "Select All" })).toHaveCount(1)` failed
immediately. **Recommendation: correct the Mangrove evidence and assert
select-all in every pairing.**

### 2. A visually hidden control silently scrolled the document by 260px

At 390px in German, the document scrolled horizontally by 260px despite the
250-row table sitting inside a `ResizableTableContainer` with `overflow: auto`,
`max-width: 100%`, measured 342px wide with 721px of internal scroll content.

`contain: paint` fixed it. `overflow-x: hidden` did not -- an absolutely
positioned descendant was escaping the container.

`ColumnResizer` renders a visually hidden `<input type="range">` for keyboard
resizing:

```
position: absolute; clip: rect(0 0 0 0); clip-path: inset(50%);
height: 1px; width: 1px; margin: -1px; overflow: hidden
```

With **no positioned ancestor**, those inputs resolve against the initial
containing block. The ancestor's `overflow` cannot clip them, so all eight sat
outside the scroll box (rightmost at x=725 in a 390px viewport).

Fix:

```css
.demo-tablewrap { position: relative; }
```

This is the second instance of the same class -- React Aria's `Select` also
renders a hidden native `<select>` that stays in layout, sized by its longest
option label. Both should be filed upstream.

**This reframes the Mangrove run's unresolved 261px overflow.** Same library,
same viewport, same locale -- here it is 0px at all three viewports. The Mangrove
residue was this bug plus the cascade bug in finding 4, not a design trade-off.
**Recommendation: re-measure the Mangrove pairing with `position: relative` on
its table wrapper.**

### 3. Preflight saved this candidate where Mangrove broke it

React Aria's `DatePicker` and `DateRangePicker` render hidden `<input>` elements
for form integration. Tailwind Preflight declares:

```css
[hidden]:where(:not([hidden=until-found])) { display: none !important }
```

These stay hidden, and axe correctly skips them.

On Mangrove, the identical components render those inputs **visibly** because
`input[type="text"] { display: block }` at (0,1,1) outranks `[hidden] { display:
none }` at (0,1,0). That caused a critical axe `label` violation.

Same candidate, same components, opposite outcome. Asserted in e2e (`Preflight
does not leave library-hidden inputs visible`).

### 4. A media query that silently did nothing

`@media (max-width: 48rem) { .demo-sbs { grid-template-columns: minmax(0,1fr) } }`
placed *above* an unconditional `.demo-sbs { grid-template-columns: repeat(2,
minmax(0,1fr)) }` loses the cascade tie: a media query adds no specificity, and
the later rule wins. The side-by-side section stayed two columns at 390px.

Inherited from the Mangrove demo, where the same ordering exists. Moved to end
of file. Not a candidate finding; recorded because it is half of the Mangrove
run's overflow.

### 5. Portalled overlays lose design tokens (and here, padding too)

React Aria portals every overlay to `document.body`, outside `.undrr-tokens`, so
tokens resolve to nothing:

| Declaration | Computed |
| --- | --- |
| `background: var(--undrr-color-surface)` | `rgba(0, 0, 0, 0)` |
| `border: 1px solid var(--undrr-color-border-strong)` | `0px` -- the whole shorthand voided |
| `z-index: var(--undrr-z-popover)` | `100000`, React Aria's inline default |

One bad `var()` invalidates the entire border shorthand at computed-value time.

**On Delta it is worse than Mangrove** because Preflight's
`* { padding: 0; margin: 0; border: 0 solid }` applies inside the portal too,
so overlays collapse onto their own text.

Fixed by adding the token scope class to each portalled overlay
(`src/overlay-class.ts`). Asserted in e2e across five overlay types (popover,
calendar, combobox, modal, tooltip) with a check that the element is outside
`[data-candidate-root]`.

Not a React Aria defect -- it is an interaction between portalling and scoping
tokens to a class rather than `:root`. MUI's portalled popper has the same scope
gap but renders correctly because its theme resolves token values at build time.
React Aria's `var()` approach is more flexible and more fragile.

React Aria sets `z-index: 100000` **inline** on portal containers, so the token
z-index scale requires `!important` to override.

### 6. Delta pairings cannot use Tailwind utilities of their own

`host-delta.src.css` declares `@source "./HostShell.tsx"`, so the compiled
stylesheet contains exactly the **75 utilities the host shell uses**. Any other
Tailwind class emits no CSS -- silently, no build error.

This run reused the host's own strings verbatim. **No Delta demo can demonstrate
"style the candidate with Tailwind"** -- the utilities are not there. A real
Delta app runs its own Tailwind build over its own source.

Not a blocker; follows from consuming a prebuilt host stylesheet. Applies to all
four Delta pairings.

### 7. Three testing-ergonomics traps

Not defects, but any team adopting React Aria will encounter all three.

1. **`Radio`** wraps a visually hidden `<input>` in a `<label>`, so
   `getByRole("radio").click()` times out. Click the label instead.
2. **Selection `Checkbox`** has the same shape; Playwright's `.check()` requires
   a visible target and times out on the 1px clip-pathed input. Click the label;
   assert the role separately.
3. **`locator.hover()` does not open tooltips.** Playwright teleports the
   pointer; React Aria's `useHover` rejects that. Moving in with steps
   (`mouse.move(x-40, y)` then `mouse.move(x, y, { steps: 8 })`) works.

### 8. `ResizableTableContainer` sets `table-layout: fixed`

Columns no longer grow to fit headers, so `white-space: nowrap` headers paint
over adjacent columns. "Economic loss (USD m)" ran through "Verification status".

Resolved with `overflow: hidden` and `text-overflow: ellipsis`. Long localised
headers (e.g. "Wirtschaftlicher Schaden (Mio. USD)") ellipsise at default width
and need a design ruling.

### 9. 400 options render 400 DOM nodes

`ListBox` virtualises only when wrapped in `Virtualizer`. Left unwrapped for
like-for-like comparison across candidates.

---

## Where it cost

**715 lines of CSS across 156 selectors**, vs 624 lines / 115 selectors on
Mangrove. Delta's Preflight adds 15% because every paragraph margin and heading
weight must also be authored.

**Pagination does not exist.** No component, no hook. 46 custom lines.

**Table gives behaviour, not a data layer.** `allowsSorting` supplies UI, ARIA
and keyboard handling but not the comparator; `SearchField` supplies the input
but not the predicate. Sorting: 17 lines. Filtering: 13 lines. The comparator
must handle number, ISO string, and locale-aware string.

**Multiselect and select-all are both composed.** No multiselect component; no
rendered checkboxes. 22 lines between them.

---

## Accessibility

**No conformance is claimed.** Results recorded verbatim.

| Scope | Violations | Serious | Critical | Incomplete |
| --- | --- | --- | --- | --- |
| Candidate subtree (`[data-candidate-root]`) | 0 | 0 | 0 | 1 |
| Whole page | 0 | 0 | 0 | 1 |

Per-section JSON in `test-results/`. All eight sections report 0 violations.
Sections 2 and 6 each report one `color-contrast` incomplete (axe could not
decide automatically). Scoped and whole-page counts agree because Delta's
baseline is 0 violations.

Still needs a human:

- `color-contrast`: disabled button text, hint text, four status badges against
  neutral tokens.
- Keyboard and screen-reader testing for the range calendar, column resizer,
  listbox type-ahead, and tri-state select-all.

---

## Theming

**48 of 71 tokens applied, 0 unreachable.** The 23 unapplied tokens have no use
on this page (e.g. `--undrr-color-info`, `--undrr-font-family-mono`, larger
spacing steps) -- the library blocked none.

Method: `var()` references in a stylesheet scoped under `.demo`. No theme
provider, no CSS-in-JS, no `!important`. Token changes apply at runtime with no
rebuild.

Exception: React Aria's inline `z-index: 100000` on portal containers cannot be
overridden without `!important`.

---

## Determinism

No `new Date()` anywhere in demo code. All dates derive from `TODAY_ISO` and
`DEFAULT_RANGE`.

`parseAbsolute(iso, FIXED_TIME_ZONE)` throughout, never
`parseAbsoluteToLocal` — the latter resolves to the *runner's* timezone, so
Playwright's pinned UTC would make tests pass while the same build rendered 00:00
in London and 02:00 in Berlin, and the screenshots would stop being comparable
across demos and machines. All `Intl` formatters pass `timeZone: "UTC"` for the
same reason.

---

## Shared packages

Not modified. Nothing in the scaffold blocked this implementation, so
`evidence.json.blockers` is empty.

One observation rather than a blocker, recorded in finding 6: `host-delta`'s
`@source "./HostShell.tsx"` bounds what any Delta demo can do with Tailwind. That
is a correct design decision for a controlled comparison, and changing it would
be worse — but it should be stated when the Delta results are read.
