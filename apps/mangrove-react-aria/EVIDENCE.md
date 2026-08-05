# Evidence: React Aria Components on the Mangrove host

Structured record in `evidence.json`. This is the prose.

**Summary.** Of 30 requirements: **21 native, 7 composed, 2 custom, 0
unsupported**, for a total of 122 custom lines of behavioural code. React Aria is
the only candidate expected to satisfy `datetime-range-picker` natively. Leakage
was clean, which is unsurprising: the library ships no CSS at all. The cost lands
almost entirely in one place — **661 lines of custom CSS across 120 selectors** —
because unstyled primitives mean every visual decision is yours.

The two `custom` entries are `table-paginate` (no pagination component exists)
and `cards` (no card component, correctly — a card is styling, not behaviour).

---

## What went well

**The date-time range picker is genuinely native.** `DateRangePicker` with
`granularity="minute"` gives both endpoints date and time, in one popover with
one focus trap, over a single `RangeCalendar` that highlights the intervening
days. Zero custom lines. This is the requirement that most separates the
candidates, and React Aria simply has it in the free tier.

**Leakage was clean by construction.** 14 canaries, 27 watched properties, zero
differences. React Aria injects no stylesheet, no `:root` variables and no
global resets, so there was nothing to contain. Scoping our own rules under
`.demo` was sufficient and took no effort. Candidates that ship their own CSS
will have to work harder here.

**One qualification on the leakage result, found later by the mangrove-mantine
run.** The assertion diffs two loads of the same page, so a statically imported
stylesheet sits in both snapshots and cancels out. This demo imports its own
`src/theme.css` statically, so the assertion never actually tested it.

The result still stands, but by construction rather than by measurement: a check
of all 120 selectors in `src/theme.css` finds **zero** that are not scoped under
`.demo`, so none can match a canary. React Aria itself ships no CSS, which is
why nothing else was at risk here. The harness limitation is now documented in
`packages/test-harness/src/leakage.ts` and the rule for future runs is in
`docs/requirements.md`.

**RTL needed no work whatsoever.** Wrapping the tree in `I18nProvider` with an
Arabic locale flipped the library's own internals — date segment order, calendar
layout, listbox alignment. We wrote no direction-aware CSS and no `dir` plumbing
inside components.

**State styling is honest and complete.** Components expose `data-hovered`,
`data-pressed`, `data-focused`, `data-selected`, `data-disabled`,
`data-invalid`, `data-resizing`. Notably `data-focus-visible` is set only for
keyboard focus, so a focus ring never appears on mouse click without any
`:focus-visible` gymnastics from us.

**Validation covered the hard case.** The three client-side validation cases are
`isInvalid` + `FieldError`. The interesting one is `server-rejected`, which has
no client trigger: `Form`'s `validationErrors` prop is the documented channel
and routes the message to the named field's `FieldError` automatically. Many
libraries have no answer for this and force a custom error-display component.

---

## Where it cost

**661 lines of CSS is the headline number.** React Aria is unstyled by design,
so this is not a defect — but it is the trade. Every button variant, focus ring,
popover shadow, calendar cell state and table zebra stripe is ours. A team
adopting this is adopting a styling commitment, and 661 lines is what it took to
reach *adequate* here, not polished.

**Pagination does not exist.** No component, no hook. Page state, slicing, the
page-size control and the Previous/Next navigation are 34 custom lines. For a
disaster-loss table this is a core interaction, and it is the clearest gap in the
library for this use case.

**The table gives behaviour, not a data layer.** `allowsSorting` supplies the
UI, ARIA and keyboard handling but not the comparator; `SearchField` supplies the
input but not the predicate. That is a defensible boundary — the library does not
presume your data shape — but sorting (22 lines) and filtering (14 lines) are
real work, and the comparator has to handle number, ISO string and locale-aware
string correctly or accented French and German labels sort by code point.

**Multiselect is composed, not native.** There is no multiselect component. The
documented pattern is `ListBox selectionMode="multiple"` plus `TagGroup`/`TagList`
for removable chips, joined by a 6-line `onRemove` handler.

**Cards are not the library's job.** No card component exists, which is correct —
a card is styling, not behaviour. Rendered as plain markup reusing Mangrove's own
`mg-card` classes.

---

## Findings worth acting on

### 1. Hidden native `<select>` elements scroll the page sideways

`Select` renders a hidden native `<select>` for form integration and mobile
autofill, inside a container hidden with `clip` and `clip-path`. Those hide it
visually but **do not remove it from layout**, and the container has no
`overflow: hidden`. The select's intrinsic width is driven by its longest option
label — 495px for the 40-item fixture list, whose longest entry is
"Interministerial coordination secretariat for disaster risk reduction" — so at a
390px viewport the whole document scrolls horizontally.

This is the one place the theme reaches into library-rendered markup:

```css
.demo [data-testid="hidden-select-container"] { overflow: hidden; }
.demo select:not(.demo-input) { max-width: 100%; }
```

Targeting a `data-testid` is fragile and would break silently on upgrade.
Recorded as `overridesLibraryInternals: true`. **Worth raising upstream** —
consumers should not have to know this.

### 2. Mangrove defeats the `hidden` attribute — affects all four Mangrove pairings

**This is the most important finding in this run, and it is a host defect, not a
candidate one.**

Mangrove's stylesheet contains both of these:

```css
[hidden], template                            { display: none; }   /* (0,1,0) */
input[type="text"], input[type="date"], ...    { display: block; }  /* (0,1,1) */
```

The second outranks the first, so **Mangrove's own `[hidden]` reset loses to its
own input rule.** Any component library that hides a helper input with the
`hidden` attribute has it render as a visible text box.

React Aria's `DatePicker` and `DateRangePicker` do exactly that for form
integration, so the dates section rendered stray visible inputs showing
`2026-06-15` and `2026-05-01T00:00:00+00:00[UTC]` under the real controls. It was
caught by looking at a screenshot, not by any assertion — worth noting, because
the leakage assertion cannot see it: this is the host affecting the *candidate*,
the opposite direction from what that check watches.

Fixed per-app with one scoped rule, no `!important` needed since `.demo [hidden]`
is (0,2,0):

```css
.demo [hidden] { display: none; }
```

MUI, Carbon and Mantine all use hidden inputs too, so **every Mangrove pairing
will hit this.** It should be fixed in Mangrove rather than worked around four
times. The `[hidden]` rule needs specificity at least matching the input rule, or
the input rule needs to exclude `[hidden]`.

**This corrects an earlier conclusion.** Before finding the cause, this presented
as a critical axe `label` violation on unlabelled hidden inputs, and I recorded it
as a React Aria defect not fixable through the public API. That was wrong. The
inputs were *visible*, which is why axe flagged them; once `hidden` works, axe
correctly skips them and the violation disappears. **Scoped axe went from 1
critical violation to 0.** React Aria was not at fault.

### 3. Portalled overlays lose the design tokens entirely

**Found by looking at a screenshot, not by any test.** Every popover, calendar,
modal and tooltip rendered transparent and borderless over the page content.

React Aria portals overlays to a container appended to `document.body`, which is
outside the `.undrr-tokens` element. CSS custom properties inherit down the DOM
tree, so inside the portal every token resolved to nothing:

| Declaration | Computed |
| --- | --- |
| `background: var(--undrr-color-surface)` | `rgba(0, 0, 0, 0)` |
| `border: 1px solid var(--undrr-color-border-strong)` | `0px` — the whole declaration voided |
| `z-index: var(--undrr-z-popover)` | `100000`, React Aria's inline default |

The border case is the nastiest: one bad `var()` invalidates the entire shorthand
at computed-value time, so the border vanished rather than falling back to a
default colour. And **nothing warns you** — a failed `var()` is silent, there is
no console message, and the component "works" in every functional sense. The e2e
suite passed throughout, because it asserted behaviour and never asserted that an
overlay had a background.

Fixed by putting the token scope class on each portalled overlay
(`src/overlay-class.ts`), so the properties are declared on the overlay itself
and inherit from there.

**This is not really a React Aria defect.** It is an interaction between
portalling and the decision to scope tokens to a class instead of `:root` — a
decision made deliberately to protect the leakage assertion. The cost of that
protection is this, and it will recur for any candidate that styles via `var()`.
Documented in `docs/requirements.md` so the remaining runs do not rediscover it.

**The comparison here is genuinely interesting.** Measured on both demos: MUI's
portalled popper is *also* outside the token scope and *also* sees an empty
`--undrr-color-surface`, yet renders `rgb(255, 255, 255)` correctly — because
MUI's theme resolves token values at build time and emotion emits literal
colours, so there is no `var()` to fail.

So the same property cuts both ways. Elsewhere in this evaluation MUI's
build-time inlining is a drawback: tokens cannot change at runtime without a
rebuild. Here it is an outright advantage. React Aria's CSS-variable approach is
more flexible and more fragile.

A smaller related finding: React Aria sets `z-index` **inline** on the portal
container at 100000, which outranks any class rule. The token z-index scale is
therefore not honoured by this candidate without `!important`, whereas MUI's
z-index came from its theme object and was pinnable to the token layers.

### 4. `Radio` intercepts pointer events, so `getByRole("radio").click()` fails

React Aria's `Radio` renders a `<label>` wrapping a visually hidden `<input>`,
and the label intercepts pointer events. Playwright's `getByRole("radio").click()`
times out with "label intercepts pointer events". Clicking the label works.

Not a defect — but a real testing-ergonomics cost, and the kind of thing that
silently eats an afternoon. Any team adopting React Aria should expect to write
click helpers for its form controls.

### 5. Horizontal scroll at 390px in German — RESOLVED, and it was my bug

**Originally recorded as 261px of unavoidable overflow needing a design
decision. That was wrong.** It is now 0px at all three viewports. The
`delta-react-aria` run got 0px with the same library, viewport and locale, which
is what prompted a re-measurement. Two causes, both mine:

1. **A CSS cascade error.** `.demo-sbs`'s base two-column rule sat *below* an
   equally specific `@media (max-width: 48rem)` block. Media queries add no
   specificity, so the later rule won at every viewport and the side-by-side
   grid stayed two columns at 390px. `.demo-chrome` was declared above the media
   block and worked correctly, which is why only one of the two broke.
2. **`ColumnResizer`'s hidden range input escaping its container.** It renders at
   `position: absolute`, and with no positioned ancestor it resolved against the
   initial containing block, where no ancestor `overflow` could clip it.
   `position: relative` on the scroll wrapper fixed it. Notably `overflow-x:
   hidden` did NOT, which is how the cause was identified.

The lesson worth keeping: "needs a design decision" was a comfortable label for
something I had not diagnosed. A second run of the same library was what exposed
it.

### 6. Table selection had no select-all, and the evidence claimed it did

`selectionMode="multiple"` gives selection behaviour — click, shift-click,
keyboard — but React Aria renders **no checkboxes at all** and provides no
select-all. The control the brief asks for only exists once you add a selection
column with `<Checkbox slot="selection">` in the header and every row; the slot
supplies the tri-state and the localised accessible name, the markup and
appearance are yours.

`table-multiselect` was originally recorded as `native` with a note claiming
"select-all in the header". There was no select-all, and **the suite never
asserted one**, so nothing caught it. Corrected to `composed` (16 lines), the
column implemented, and an e2e test added that drives select-all through all
three states.

Found by the `delta-react-aria` run. Two runs of the same library against
different hosts turned out to be a better check on each other than either
suite was on itself.


Measured: **desktop 0px, tablet 0px, mobile 261px.** Recorded in
`test-results/long-labels-*.json`.

I fixed the parts that were mine: an unconstrained native `<select>`, a missing
`min-width: 0` that let the 250-row table's intrinsic width propagate up and
scroll the document instead of scrolling inside its own container, and a
`ResizableTableContainer` that sizes to summed column widths rather than to its
parent. Those fixed tablet entirely.

The 261px at mobile remains. **The e2e assertion still fails, deliberately.** I
did not weaken it to make the suite green — a passing suite that hid this would
be worse evidence than a failing one that names it. `longLabels.status` is
`"issues"`, and it needs a design decision: stack the range picker's two
endpoints vertically at mobile, or accept horizontal scroll in that section.

### 7. 400 options render 400 DOM nodes

`ListBox` virtualises only when wrapped in `Virtualizer`. Left unwrapped so the
comparison stays like-for-like across candidates. Whether that is acceptable, or
whether `Virtualizer` should be mandatory, is a performance decision not taken
here.

---

## Accessibility

**No conformance is claimed.** Results recorded verbatim.

Scoped to the candidate subtree: **0 violations, 1 incomplete
(`color-contrast`)**. Per-section JSON in `test-results/`.

All eight sections report 0 violations. Sections 2 and 6 each report one
`color-contrast` incomplete, which axe could not decide automatically.

Whole-page count is 1, because the Mangrove host contributes a
`link-in-text-block` serious violation — its base `a` rule underlines only on
hover. That is a host finding, documented in `docs/host-derivation.md`, and is why
the scoped number is the one in `evidence.json`.

Getting to 0 required fixing the host's `[hidden]` specificity bug (finding 2).
Before that, section 3 reported a critical `label` violation on inputs that were
never meant to be visible.

Still needs a human: keyboard and screen-reader testing. axe is static analysis
and cannot tell you whether the range calendar, the column resizer or listbox
type-ahead are actually usable with a screen reader.

---

## Theming

47 of 71 tokens applied, **0 unreachable**. React Aria resisted nothing, because
it has no styles of its own to resist with.

The 24 unapplied tokens are ones this page has no use for — `--undrr-color-info`,
`--undrr-font-family-mono`, the larger spacing steps, unused z-index layers — not
ones the library blocked. That distinction matters when comparing against
candidates whose own CSS wins specificity contests.

Method: token custom properties consumed directly in a scoped stylesheet. No
theme provider, no CSS-in-JS, no `!important`, no specificity escalation.

The Mangrove 2.0 preview tokens were **not** used, so these numbers describe
theming against `packages/undrr-tokens` only, as the brief requires.

---

## Determinism

One bug worth recording because it would have quietly broken cross-demo
comparison: I first used `parseAbsoluteToLocal` for the fixture's default range,
which resolves to the *runner's* timezone. Playwright pins UTC so tests passed,
but the same build rendered 00:00 in London and 02:00 in Berlin — screenshots
would have differed by machine. Now `parseAbsolute(iso, FIXED_TIME_ZONE)`.

No `new Date()` anywhere in demo code. All dates derive from `TODAY_ISO` and
`DEFAULT_RANGE`.

---

## Shared packages

Not modified. Nothing in the scaffold blocked this implementation, so there are
no findings to report against `fixtures`, `undrr-tokens`, `host-mangrove` or
`test-harness`.
