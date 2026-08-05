# Evidence: React Aria Components on the Delta host

Structured record in `evidence.json`. This is the prose.

**Summary.** Of 30 requirements: **20 native, 8 composed, 2 custom, 0
unsupported**, for a total of 128 custom lines of behavioural code. Leakage was
clean — 14 canaries, 0 differences — which is unsurprising, because the library
ships no CSS at all. axe reported **0 violations scoped and 0 whole-page**, with
1 incomplete. Long labels are clean at all three viewports. All 45 e2e tests
pass.

The cost lands almost entirely in one place: **715 lines of custom CSS across
156 selectors**. That is 15% more than the same demo on the Mangrove host, and
the extra is attributable to a single cause — Tailwind Preflight. Unstyled
primitives on a reset host means there is no browser default left to fall back
on.

Two `native` classifications from the Mangrove run are **corrected here**, both
downward, both because this run asserted something that run did not. See
findings 1 and 2.

---

## The host difference, measured

`host-delta/host.css` is Tailwind 4 with Preflight, and Preflight reaches our
subtree exactly as it reaches the host's:

| Preflight rule | What it removes from React Aria |
| --- | --- |
| `*, ::before, ::after { border: 0 solid; margin: 0; padding: 0 }` | every control's box, every paragraph's spacing |
| `h1..h6 { font-size: inherit; font-weight: inherit }` | all heading hierarchy, including `Calendar`'s `Heading` and `Dialog`'s title |
| `a { color: inherit; text-decoration: inherit }` | `Link` becomes body text |
| `button, input, select { font: inherit; background-color: #0000; border-radius: 0 }` | `Button` becomes bare text |
| `ol, ul, menu { list-style: none }` | `ListBox`'s list semantics have no visual form |
| `table { border-collapse: collapse }` | (helpful — one less rule to write) |
| `[hidden] { display: none !important }` | (helpful — see finding 3) |

The rules in `theme.css` marked `PREFLIGHT RECOVERY` exist for no other reason.
They are the honest answer to "what does this host cost a candidate that brings
no CSS of its own": roughly 90 lines, and every heading in the file needing two
declarations where one would do.

It cuts both ways, though, and the second half of that is the more interesting
result — see finding 3.

---

## What went well

**The date-time range picker is genuinely native.** `DateRangePicker` with
`granularity="minute"` gives both endpoints date and time, in one popover with
one focus trap, over a single `RangeCalendar` that exposes
`data-selection-start`, `data-selection-end` and the intervening days as styling
hooks. Zero custom lines. This is the requirement that most separates the
candidates, and React Aria has it in the free tier while MUI's equivalent is
commercially licensed.

**Leakage was clean by construction.** 14 canaries, 0 differences. React Aria
injects no stylesheet, no `:root` variables and no global resets, so there was
nothing to contain. Scoping our own rules under `.demo` was sufficient and took
no effort. Candidates that ship their own CSS have to work harder here.

**axe reported zero violations, whole-page and scoped.** The Delta host's
documented baseline is 0, and the candidate added none, so nothing had to be
subtracted. Contrast the Mangrove run, which had to explain a host-contributed
`link-in-text-block` and, before its `[hidden]` cause was found, a critical
`label` violation.

**RTL needed no work whatsoever.** Wrapping the tree in `I18nProvider` with
`ar-EG` flipped the library's own internals — date segment order, calendar
layout, listbox and tag alignment — and Arabic-Indic digits appeared in the date
segments without being asked for. Our own CSS used logical properties
(`border-inline-start`, `padding-inline-start`, `text-align: start`), so the nav's
active-state border moved to the right side on its own.

**State styling is honest and complete.** Components expose `data-hovered`,
`data-pressed`, `data-focused`, `data-focus-visible`, `data-selected`,
`data-disabled`, `data-invalid`, `data-resizing`, `data-placeholder`,
`data-outside-month`. `data-focus-visible` is set only for keyboard focus, so a
focus ring never appears on a mouse click without any `:focus-visible` gymnastics
from us — and the tooltip correctly declines to open on programmatic focus for
the same reason.

**Validation covered the hard case.** The three client-side cases are `isInvalid`
+ `FieldError`. `server-rejected` has no client trigger, and `Form`'s
`validationErrors` prop is the documented channel: it routes the message to the
named field's `FieldError` with no custom wiring. Many libraries have no answer
for this.

**Section 5's cards cost nothing.** They carry Delta's own utility strings
verbatim, so they are pixel-identical to the host's canary cards. That is the
right answer for a library with no card component — but see the caveat in
finding 6.

---

## Findings worth acting on

### 1. `selectionMode="multiple"` renders no checkboxes, so there is no select-all

**This corrects the Mangrove run, which recorded `table-multiselect` as
`native` with the note "select-all in the header".**

`selectionMode="multiple"` gives real selection *behaviour* — click, shift-click,
modifier-click, keyboard — and it is excellent. It renders **no checkbox at
all**. There is no select-all control until you add a selection column plus a
`<Checkbox slot="selection">` in the header and in every row.

The slot does real work once it is there: tri-state `isIndeterminate`, the
localised accessible names (`Select All` / `Select`), and the header/row wiring.
But `Checkbox` itself renders only a visually hidden native `<input>` and
whatever children you give it, so the visible box is 100% ours — and on a
Preflight host it does not even have a border to start from.

16 custom lines and a 30-line CSS block. Status corrected to `composed`.

**How it was found matters.** The Mangrove run's e2e suite never asserted
select-all, so nothing contradicted the claim. This run wrote
`expect(getByRole("checkbox", { name: "Select All" })).toHaveCount(1)` and it
failed immediately. **Recommendation: the Mangrove evidence should be corrected,
and every other pairing should assert select-all rather than assume it.**

### 2. A visually hidden control silently scrolled the document by 335px

**The best finding in this run, and a genuine React Aria bug worth filing.**

At 390px in German the document scrolled horizontally by 260px. Every element
looked contained: the 250-row table sat inside a `ResizableTableContainer` with
`overflow: auto`, `max-width: 100%`, measured 342px wide with 721px of internal
scroll content. Correct behaviour, verified in computed styles.

`contain: paint` on the wrapper fixed it. `overflow-x: hidden` did not. That
combination only means one thing: an absolutely positioned descendant escaping
the container.

`ColumnResizer` renders a visually hidden `<input type="range">` for keyboard
resizing, using the standard recipe:

```
position: absolute; clip: rect(0 0 0 0); clip-path: inset(50%);
height: 1px; width: 1px; margin: -1px; overflow: hidden
```

With **no positioned ancestor**, those inputs resolve against the *initial
containing block*. An ancestor's `overflow` cannot clip an element it is not the
containing block for, so all eight of them sat outside the scroll box — the
rightmost at x=725 in a 390px viewport — and expanded the document.

The fix is one declaration on our own wrapper:

```css
.demo-tablewrap { position: relative; }
```

Cheap, and not fragile, because it is on our element rather than the library's.
But **the symptom points at the table, not at the resizer**, and nothing warns
you. It cost most of the debugging time in this run.

This is the second instance of the same class of bug — React Aria's `Select`
renders a hidden native `<select>` that is clipped visually but stays in layout,
whose intrinsic width is set by its longest option label. **A visually hidden
control should not be able to change document layout.** Worth filing upstream as
one issue covering both.

**And this reframes the Mangrove run's unresolved 261px overflow.** That run
concluded the remaining scroll needed "a design decision: stack the range
picker's two endpoints vertically at mobile, or accept horizontal scroll". Same
library, same viewport, same locale — and here it is 0px at all three viewports.
The residue was not a design trade-off, it was this bug plus the cascade bug in
finding 4. **Recommendation: re-measure the Mangrove pairing with
`position: relative` on its table wrapper before accepting its `longLabels:
issues` result.**

### 3. Preflight *saved* this candidate, where Mangrove broke it

React Aria's `DatePicker` and `DateRangePicker` render hidden `<input>` elements
for form integration. Tailwind Preflight declares:

```css
[hidden]:where(:not([hidden=until-found])) { display: none !important }
```

So they stay hidden, and axe correctly skips them.

On the Mangrove host the identical components render those inputs **visibly**,
because Mangrove's own `input[type="text"] { display: block }` at (0,1,1)
outranks its own `[hidden] { display: none }` at (0,1,0). That cost the Mangrove
run a critical axe `label` violation and an explicit override.

Same candidate, same components, opposite outcome. Preflight is usually described
as the thing candidate libraries collide with — and it is, for 90 lines of this
stylesheet — but here it is the thing that prevented a critical accessibility
failure. Asserted in e2e (`Preflight does not leave library-hidden inputs
visible`) so that a future Tailwind release dropping the `!important` would be
caught by a test rather than by someone squinting at a screenshot.

### 4. A media query that silently did nothing

`@media (max-width: 48rem) { .demo-sbs { grid-template-columns: minmax(0,1fr) } }`
placed *above* an unconditional `.demo-sbs { grid-template-columns: repeat(2,
minmax(0,1fr)) }` loses the cascade tie: a media query adds no specificity, and
the later rule wins. The side-by-side section stayed two columns at 390px and
pushed the page sideways.

Both rules are valid CSS, no tool complains, and the file reads correctly
top-to-bottom. Inherited from the Mangrove demo's file, where the same ordering
exists and the same section is presumably still two columns at mobile. Now moved
to the end of the file with a comment explaining why it has to stay there.

Not a candidate finding. Recorded because it is half of the reason the Mangrove
run's overflow looked unfixable.

### 5. Portalled overlays lose the design tokens, and here they lose padding too

React Aria portals every overlay to `document.body`, outside the `.undrr-tokens`
element, so inside the portal every token resolves to nothing:

| Declaration | Computed |
| --- | --- |
| `background: var(--undrr-color-surface)` | `rgba(0, 0, 0, 0)` |
| `border: 1px solid var(--undrr-color-border-strong)` | `0px` — the whole shorthand voided |
| `z-index: var(--undrr-z-popover)` | `100000`, React Aria's inline default |

The border case is the nastiest: one bad `var()` invalidates the entire shorthand
at computed-value time, so the border vanishes rather than falling back.

**On this host it is worse than on Mangrove**, because Preflight's
`* { padding: 0; margin: 0; border: 0 solid }` applies inside the portal as well.
An overlay that cannot see the tokens therefore loses its padding too and
collapses onto its own text, over the page content.

Fixed by putting the token scope class on each portalled overlay
(`src/overlay-class.ts`). Asserted in e2e across five overlay types — popover,
calendar, combobox, modal and tooltip — with a check that the element really is
outside `[data-candidate-root]`, so the assertion cannot pass vacuously if a
future version stops portalling.

**Not really a React Aria defect.** It is an interaction between portalling and
the deliberate decision to scope tokens to a class rather than `:root`. The
comparison with MUI is the interesting part: MUI's portalled popper is *also*
outside the token scope and *also* sees an empty `--undrr-color-surface`, yet
renders white correctly, because its theme resolved token values at build time
and emotion emitted literal colours. Elsewhere that build-time inlining is MUI's
drawback — tokens cannot change at runtime without a rebuild. Here it is an
outright advantage. React Aria's `var()` approach is more flexible and more
fragile.

Related: React Aria sets `z-index: 100000` **inline** on the portal container,
which outranks any class rule. The token z-index scale is therefore not honoured
by this candidate without `!important`.

### 6. The Delta pairings cannot use Tailwind utilities of their own

`host-delta.src.css` declares `@source "./HostShell.tsx"`, so the compiled
stylesheet contains exactly the **75 utilities the host shell itself uses**. Any
other Tailwind class in a demo emits no CSS at all — silently, with no build
error, because Tailwind has no way to know the class was intended.

This run stayed inside that set deliberately and reused the host's own strings
verbatim, which is why section 5's cards and section 9's host column are exact
reproductions rather than approximations. It is the right call for a controlled
comparison. But it means **no Delta demo can demonstrate "style the candidate
with Tailwind, the way a real Delta app would"** — the utilities simply are not
there. A real Delta app runs its own Tailwind build over its own source.

Not a blocker and not a shared-package defect: it follows from consuming a
prebuilt host stylesheet, which is what the brief requires. But it bounds how a
Delta demo should be read, and it applies to all four Delta pairings.

### 7. Three separate testing-ergonomics traps

None of these are defects. All three cost real time, and any team adopting React
Aria will meet all three.

1. **`Radio`** renders a `<label>` wrapping a visually hidden `<input>`, and the
   label intercepts pointer events, so `getByRole("radio").click()` times out
   with "label intercepts pointer events". Click the label.
2. **The selection `Checkbox`** has the same shape, and Playwright's `.check()`
   additionally requires a *visible* target, so it times out waiting for a 1px
   clip-pathed input. Click the label; assert the role separately.
3. **`locator.hover()` does not open a tooltip.** Playwright's `hover()`
   teleports the pointer onto the target in a single move, and React Aria's
   `useHover` does not accept that as a hover — no tooltip appears, even after
   several seconds. Moving in from an adjacent point in steps
   (`mouse.move(x-40, y)` then `mouse.move(x, y, { steps: 8 })`) works first
   time.

Expect to write click and hover helpers for React Aria's form controls.

### 8. `ResizableTableContainer` sets `table-layout: fixed`

A consequence worth knowing before choosing it: a column's assigned width no
longer grows to fit its header, so a `white-space: nowrap` header paints straight
over the next column. "Economic loss (USD m)" ran through "Verification status"
until it was truncated. Only visible in a screenshot; no assertion would catch
it.

Resolved with `overflow: hidden` and `text-overflow: ellipsis`, which is
defensible because the resizer is right there. It does mean long localised
headers such as "Wirtschaftlicher Schaden (Mio. USD)" ellipsise at the default
width, and that needs a design ruling.

### 9. 400 options render 400 DOM nodes

`ListBox` virtualises only when wrapped in `Virtualizer`. Left unwrapped so the
comparison stays like-for-like across candidates. Whether that is acceptable, or
whether `Virtualizer` should be mandatory, is a performance decision not taken
here.

---

## Where it cost

**715 lines of CSS across 156 selectors is the headline number**, against 624
lines and 115 selectors for the same demo on Mangrove. React Aria is unstyled by
design, so this is not a defect — but it is the trade, and the Delta host makes
the trade 15% more expensive. Every button variant, focus ring, popover shadow,
calendar cell state, radio dot, checkbox box and table zebra stripe is ours, and
on this host so is every paragraph margin and heading weight. 715 lines reached
*adequate*, not polished.

**Pagination does not exist.** No component, no hook. 46 custom lines.

**The table gives behaviour, not a data layer.** `allowsSorting` supplies the UI,
ARIA and keyboard handling but not the comparator; `SearchField` supplies the
input but not the predicate. A defensible boundary, but sorting (17 lines) and
filtering (13 lines) are real work, and the comparator has to handle number, ISO
string and locale-aware string or accented French and German values sort by code
point.

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
Sections 2 and 6 each report one `color-contrast` incomplete, which axe could not
decide automatically.

The scoped and whole-page counts agree because the Delta host's documented
baseline is 0 violations. Nothing was subtracted, and nothing was inherited.

Still needs a human:

- `color-contrast`, particularly disabled button text, hint text and the four
  status badges against the neutral token palette.
- Keyboard and screen-reader testing. axe cannot tell you whether the range
  calendar, the column resizer, listbox type-ahead or the tri-state select-all
  are usable with a screen reader.

---

## Theming

**48 of 71 tokens applied, 0 unreachable.** React Aria resisted nothing, because
it has no styles of its own to resist with.

The 23 unapplied tokens are ones this page has no use for —
`--undrr-color-info`, `--undrr-font-family-mono`, the larger spacing steps,
unused z-index layers — not ones the library blocked. That distinction matters
when comparing against candidates whose own CSS wins specificity contests.

Method: token custom properties consumed with `var()` in a stylesheet scoped
under `.demo`. No theme provider, no CSS-in-JS, no `!important`, no specificity
escalation. Because the values are referenced rather than copied, a token change
applies at runtime with no rebuild — the opposite trade from MUI.

The one thing the tokens could not reach is React Aria's inline
`z-index: 100000` on portal containers.

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
