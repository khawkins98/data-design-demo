# Evidence: IBM Carbon on the Mangrove host

Structured record in `evidence.json`. This is the prose.

**Summary.** Of 30 requirements: **19 native, 10 composed, 1 custom, 0
unsupported**, for a total of **171 custom lines** of behavioural code. That is
the strongest component coverage of the three runs completed so far, and it is
concentrated in the data table: Carbon supplies the sort comparator and the filter
predicate that both other candidates made us write. Theming was the cheapest of
the three as well — **97 `--cds-*` assignments in one CSS block, resolved at
runtime**, because every value in Carbon's stylesheet is a `var(--cds-x, fallback)`
chain.

**And the leakage assertion fails, hard: 54 computed-property differences across
11 of the 14 host canaries.** It is left failing. That failure is the point of this
pairing, and it is the first thing a reader should take away.

The single `custom` entry is `table-column-resize-or-reorder`, because Carbon has
neither.

---

## 1. Leakage: Carbon restyles the host, and cannot be stopped as shipped

`@carbon/styles/css/styles.css` is 958 kB. It opens with an Eric-Meyer-style reset
over `html, body, div, span, h1`–`h6`, `p`, `a`, `table`, `button`, `ul`, `ol`,
`label`, `form` and about forty more bare element selectors, then sets
`body { font-family: 'IBM Plex Sans' }`, `html { box-sizing: border-box }`,
`*, *::before, *::after { box-sizing: inherit }`, and element-level type rules for
every heading and paragraph on the page.

Loading it next to Mangrove's own 197 kB global stylesheet is the experiment this
pairing exists to run. Measured with the harness's 14 canaries and 27 watched
properties, comparing `?candidate=off` against `?candidate=on` across a reload:

| | |
| --- | --- |
| Differences | **54** |
| Canaries affected | **11 of 14** |
| Properties affected | `color`, `font-family`, `font-size`, `font-weight`, `line-height`, `letter-spacing`, `border-top-color`, `margin-top`, `margin-bottom` |
| Untouched | `button-primary`, `button-secondary`, `button-disabled` |

The worst of it, on the host's own `<h1>`:

| Property | Mangrove | After Carbon |
| --- | --- | --- |
| `font-size` | 32px | **42px** |
| `font-weight` | 700 | **300** |
| `line-height` | 34.56px | **50.358px** |
| `letter-spacing` | 0.64px | **normal** |
| `margin-top` / `margin-bottom` | 10px | **0px** |
| `font-family` | Roboto | **IBM Plex Sans** |

And on the host's links, including its navigation:

| Canary | Property | Mangrove | After Carbon |
| --- | --- | --- | --- |
| `link` | `color` | `rgb(0, 79, 145)` — UNDRR blue | **`rgb(0, 98, 254)` — IBM blue** |
| `nav-link` | `color` | `rgb(0, 79, 145)` | **`rgb(0, 98, 254)`** |

Full diff in `test-results/leakage.json`.

**Why the three buttons survived, and why that is the most useful part of the
result.** Mangrove styles buttons through classes — `.mg-button`,
`.mg-button-primary` — at specificity (0,1,0)+, and its own class rules load in
the same cascade. Carbon's `button` reset is (0,0,1) and loses. Every canary that
Carbon *did* change is one Mangrove styles at element level: bare `h1`–`h6`, bare
`a`, `p`, `table`. So the damage tracks exactly where the host relies on element
selectors. A design system that classes everything is defensible against Carbon;
Mangrove classes some things and not others, and the leakage maps that boundary
precisely.

### Comparison with delta-carbon

The `delta-carbon` run measured **79 differences across all 14 canaries** with the
same stylesheet. Mangrove comes off better — 54 across 11 — for the reason above:
Mangrove's class-based button and card rules hold the line where Delta's Tailwind
utility classes did not. Neither result is acceptable; the difference is one of
degree, and it is a fact about the two hosts rather than about Carbon.

### The containment experiment, and what it costs

`?carbonCss=scoped` compiles Carbon's Sass entry inside a `.demo { }` block:

```scss
.demo {
  @import "@carbon/styles/index.scss";
  /* plus a hand-copied token block, see below */
}
```

**Result: 0 differences, all 14 canaries checked** (`test-results/leakage-scoped.json`).
So containment is achievable. Four costs, all measured:

1. **It depends on a deprecated Sass feature.** Nested `@import` is the only way to
   run Carbon's whole entry through a parent selector — `@use` and `@forward` are
   root-only, and Carbon emits component CSS as a *side effect* of `@use`
   (`components/button/_index.scss` ends with `@include button.button;`), so there
   is no supported "mixins without output" entry point. `@import` is deprecated in
   Dart Sass and slated for removal.

2. **Carbon's `:root` blocks stop matching, and one of them is load-bearing.**
   Nesting turns `:root { }` into `.demo :root`, which matches nothing. Carbon
   emits four such blocks. Two matter:
   - the *layer* block (`--cds-layer`, `--cds-field`, `--cds-border-subtle`, …).
     Carbon's own `.cds--layer-one` class declares an identical set, so putting
     that class on the scope element restores it. `App.tsx` does.
   - the *layout* block (`--cds-layout-size-height-lg`,
     `--cds-layout-density-padding-inline-normal`, …). These appear inside
     `clamp()` and `min()` expressions **with no fallback**, so losing them
     invalidates the whole declaration at computed-value time. Measured: a primary
     `Button` went from **112 × 48 px to 33 × 21 px**, every input lost its height
     and padding, and axe gained a new serious `target-size` violation on the
     accordion headers and the table search. No error, no warning, nothing in the
     console. Fixed by transcribing the block by hand into `carbon-scoped.scss` —
     which is exactly the kind of copied constant that rots on upgrade.

3. **The scoped build is not self-sufficient: it borrows `box-sizing` from the
   host.** Carbon's `html { box-sizing: border-box }` becomes `.demo html` and
   never matches, so its `*, *::before, *::after { box-sizing: inherit }` inherits
   from whatever the host set. Mangrove happens to declare
   `*, ::after, ::before { box-sizing: border-box }`, so it works — measured,
   `border-box` on `.demo`, on `.cds--text-input` and on `.cds--btn` in both
   builds. This is the mirror image of the `delta-carbon` run being rescued by
   Tailwind Preflight, and it means the scoped build would break on a host with no
   global box-sizing rule. Worth stating plainly because both Carbon runs got away
   with it for different accidental reasons.

4. **Carbon's Sass entry emits webpack-style font URLs.** `~@ibm/plex/...`, which
   Vite cannot resolve; the build logs about 200 warnings and the Plex webfonts do
   not load. The prebuilt `css/styles.css` uses absolute CDN URLs and does not
   have this problem. Irrelevant here because the theme sets the token font stack
   anyway, but it would matter to anyone taking the Sass route outside webpack.

Note that this approach differs from `delta-carbon`'s, which hand-composed an
entry from `scss/components/*` and deliberately excluded `scss/reset`,
`scss/fonts` and `scss/grid`. Including everything and scoping it means this run
never risked the two silent failures that approach exposes — a missing
`scss/layout` (see cost 2 above, which we hit anyway via `:root`) and a missing
`data-table/sort` leaving Carbon's screen-reader-only sort text visible. Both were
checked in the compiled output: `.demo .cds--table-sort__description { display: none }`
is present, and box-sizing resolves to `border-box`.

**The recommendation is a decision, not a fix.** Either Carbon owns page-level
typography and reset and Mangrove's is retired, or the scoped build is carried
with its maintenance cost, or Carbon is not adopted on Mangrove pages. All three
are legitimate; none of them is "configure it away".

---

## 2. Collisions in the other direction: the host restyles Carbon

The leakage assertion is blind to this, and on this pairing it is half the story.
`test-results/collisions.json` attributes every matching rule by which stylesheet
it came from — reliable because Carbon's CSS is a dynamic import and lands in its
own asset.

| Direction | Rules | Elements matched |
| --- | --- | --- |
| Mangrove → Carbon components | **44** | **1,594** |
| Carbon → host canaries | 10 | 38 |

The 44 Mangrove rules reaching into Carbon, worst first:

| Elements | Selector | Declarations |
| --- | --- | --- |
| 956 | `*, ::after, ::before` | `box-sizing: border-box; overflow-wrap: break-word` |
| 80 | `button, input, optgroup, select, textarea` | `font-family: inherit; font-size: 100%; line-height: 1.15` |
| 44 | `body, button` | `font-family: Roboto, sans-serif` |
| 38 | `label` | `display: block` |
| 18 | `input[type="date"], … input[type="text"], textarea` | `appearance: none; border: 2px solid #1a1a1a; height: 46px; padding: .390625rem; width: 100%` |
| 15 | `h3, h4, h5` | `font-weight: 600; line-height: 1.15` |
| 15 | `p` | `margin-top: 0` |

**The one that broke things is the fifth.** Mangrove's input rule is (0,1,1).
Carbon styles the same elements through `.cds--text-input`, which is (0,1,0). The
host wins, and **every Carbon text field, search field, date input and time picker
rendered as a 46px box with a 2px black border instead of Carbon's underlined
field.** Loading Carbon's stylesheet second changes nothing: specificity beats
order.

This confirms the `mangrove-mui` run's finding, on the same selector, against a
different library. It is a host-level problem and it will hit all four Mangrove
pairings.

Worse, it was masking a functional state, not just an aesthetic one. Carbon's
invalid treatment is `outline: 2px solid var(--cds-support-error)` plus a warning
icon — and Mangrove's `border` was so heavy that the outline read as decoration.
The fix is ten declarations re-asserting Carbon's own values at (0,2,0), using
Carbon's tokens rather than literals so theming still flows:

```css
.demo .cds--text-input,
.demo .cds--text-area,
.demo .cds--search-input,
.demo .cds--date-picker__input,
.demo .cds--time-picker__input-field { … }
```

Ten declarations to undo one host rule. That is the honest number for "drop Carbon
into a Mangrove page and make the forms look like Carbon".

---

## 3. The Mangrove `[hidden]` bug: checked, and inert against Carbon

The `mangrove-react-aria` run found that Mangrove's

```css
input[type="date"], …, input[type="text"], textarea { display: block }   /* (0,1,1) */
```

outranks its own

```css
[hidden], template { display: none }                                     /* (0,1,0) */
```

so any hidden helper *input* renders visibly on this host. It cost that run a set
of stray visible text boxes showing raw ISO strings.

**Measured for Carbon rather than assumed.** With a scoped
`.demo [hidden] { display: none }` in place, and then deleted from the live
stylesheet mid-test to compare, the only element in Carbon's subtree carrying
`hidden` is the closed listbox menu:

```html
<ul class="cds--list-box__menu" hidden>
```

Its computed `display` stays `none` either way. Mangrove's clobbering selector
reaches only `input[type=*]` and `textarea`, and a `<ul>` is neither.

**So the workaround was dead code, and it has been deleted.** `src/theme.css` now
carries the measurement as a comment and no rule. The e2e assertion is kept —
zero elements with `hidden` computing to anything but `display: none` — as a
regression guard, because a future Carbon that hides a helper input would trip it.

This matches the `mangrove-mui` result (inert, for a different reason: MUI's hidden
inputs carry no `type`). Two of the four Mangrove pairings are unaffected; the
defect is still real and still worth fixing upstream, because React Aria hit it
squarely.

---

## 4. Portalled overlays: Carbon is immune, and for the interesting reason

Measured per overlay type, in `test-results/overlays.json`:

| Overlay | Inside candidate root | Inside token scope | Background | `--undrr-*` resolves |
| --- | --- | --- | --- | --- |
| Popover | yes | yes | `rgb(255, 255, 255)` | yes |
| Modal | yes | yes | `rgb(255, 255, 255)` | yes |
| Tooltip | yes | yes | `rgb(20, 35, 46)` | yes |
| Dropdown menu | yes | yes | `rgb(255, 255, 255)` | yes |
| ComboBox menu | yes | yes | `rgb(255, 255, 255)` | yes |
| Range calendar, with `appendTo` | yes | yes | `rgb(255, 255, 255)` | yes |
| **Range calendar, forced onto `document.body`** | **no** | **no** | **`rgb(244, 244, 244)`** | **no** |

Two independent reasons, and they protect against different things:

**Placement.** Modal, Tooltip, Popover, Dropdown, ComboBox, MultiSelect and
Accordion all render in the React tree — `createPortal` appears in none of them.
The exception is the DatePicker calendar, because Carbon's `DatePicker` is a shell
around flatpickr, and flatpickr appends its calendar to `document.body`. Carbon
exposes `appendTo`, which this demo passes, so the calendar stays in the subtree.

**Fallback chains, and this is the part worth generalising.** Every declaration in
Carbon's stylesheet is written `var(--cds-token, #literal)`. So a Carbon overlay
that *did* escape the token scope would not go transparent — it would paint
Carbon's stock White theme. The last row measures exactly that: forcing the open
calendar onto `document.body` produced `rgb(244, 244, 244)`, Carbon's `layer-01`
grey, with IBM blue accents and square corners. **Fully visible, fully usable,
silently off-brand.**

That is arguably harder to catch than React Aria's transparent popovers, which at
least look broken. So "assert the background is not `rgba(0,0,0,0)`" is the wrong
test for Carbon; the suite additionally asserts the contained calendar is **not**
`rgb(244, 244, 244)` and that `--undrr-color-surface` resolves inside it.

The general rule, which `docs/requirements.md` now states correctly: how a library
is themed does not predict immunity. What matters is whether any declaration
rendering inside the overlay resolves a `var()` declared outside its ancestor
chain — and whether that `var()` has a fallback, which decides between *invisible*
and *off-brand*.

---

## 5. `datetime-range-picker`: composed, and the cheapest composition of the three

Carbon lands between the other two candidates, which makes this the most
informative requirement in the set.

`DatePicker datePickerType="range"` is a **real, free, native date range**: one
calendar, two inputs, drag-to-select, and the intervening days highlighted
(asserted through `.flatpickr-day.inRange`). MUI's community tier cannot do this
at all — its range pickers are a paid seat licence. Carbon gives it away.

But it is **date-only**. There is no `DateTimePicker` and no
`DateTimeRangePicker` anywhere in `@carbon/react` — verified against the installed
package's export list, not from memory. `TimePicker` is an unrelated component: a
pattern-validated text field with an optional `TimePickerSelect`, no stepper, no
time list, and no coupling to the calendar above it.

So the composition is **one range calendar plus two `TimePicker`s**, against the
brief's prescribed fallback of two whole pickers. What we wrote (46 lines): parsing
`HH:MM` against `YYYY-MM-DD` in the fixture timezone, deriving the duration, and
validating that the end does not precede the start, surfaced through the same
`invalid`/`invalidText` treatment as `VALIDATION_CASES` plus an
`InlineNotification`.

**What a native date-time range would have given us:**

- One control with a single accessible name for the range *as a concept*. A screen
  reader user currently meets four unrelated fields: two dates and two times.
- Time editing inside the same popover as the dates, rather than two text fields
  sitting outside it with no visual connection to the calendar.
- Validation that covers the time component. Note the asymmetry this creates:
  flatpickr already prevents an inverted *date* range, so the only reachable
  invalid state is an inverted *time* on a single-day range — precisely the case a
  date-only range component cannot see. The demo has to collapse the range to one
  day before the validation path is even exercisable.
- No `Date` arithmetic in application code.

### Carbon's `DatePicker` is not a controlled component

This cost an hour and would cost any adopter the same, so it is worth stating
precisely. `DatePicker` runs:

```js
useEffect(() => {
  if (calendarRef.current?.set) calendarRef.current.setDate(value);
}, [value, prefix, startInputField]);
```

An inline `value={[startDate, endDate]}` is a **new array reference every render**,
so the effect fires every render and flatpickr is reset to the prop mid-interaction.
The symptom gives no clue as to the cause: the range calendar **closes after the
first of the two clicks a range needs**, and the input reverts to the old date
while derived state shows the new one. Hoisting the array to module scope fixes it
and is the only stable arrangement — `onChange` becomes the source of truth and
`value` is an initial value whatever the prop name suggests. There is no
`defaultValue`.

---

## 6. What Carbon gave us that the other candidates did not

**The data table is the strongest of the three, by a distance.** `DataTable` is a
headless controller with render props, and it owns:

- **Sorting**, with its own comparator: numbers subtracted, strings
  `localeCompare`d with numeric detection, React elements unwrapped to compare
  their text. Read from `DataTable/tools/sorting.js`. **Zero custom lines**, against
  22 for the React Aria run.
- **Filtering**, with a default `filterRows` matching the input against every cell
  value. **Zero custom lines**, against 14.
- **Selection**, including the header checkbox's indeterminate state, and
  `getBatchActionProps` for an "n items selected" action bar that no other
  candidate has.

The one thing to get right is what you hand it: rows must carry **raw** fixture
values with formatting applied in the cell renderer. Pass pre-formatted strings and
the comparator sorts `"1.234.567"` before `"999"` — correct for the strings, wrong
for the data. `src/demo-state.ts` carries a comment where the comparator and
predicate would have been; both were deleted rather than left as dead code that
would have inflated the line counts with work Carbon did.

**State components are complete.** `DataTableSkeleton` is a shaped table skeleton
rather than a spinner. `InlineLoading` carries *active, finished and error in one
component* with the spinner, tick, cross and an aria-live region — the React Aria
run wrote its own `role="alert"` and `role="status"` banners for this.
`InlineNotification` covers error, success and info. Only the empty state has no
component.

**Theming is genuinely cheap and genuinely live.** 97 `--cds-*` assignments in one
block, resolved at runtime. No provider, no CSS-in-JS, no build step, no
`!important`. Compare 624 lines of CSS for React Aria and a build-time
`createTheme()` object for MUI. It also composes correctly with the token
package's class scoping: `.demo` and Carbon's `.cds--layer-one` are both (0,1,0),
and `theme.css` loads last.

**Multiselect, pagination and cards all exist as components.** `MultiSelect` with
checkboxes, a count badge and clear-all; `Pagination` with a page-size select, an
item-range readout and localisable text; `Tile`; `SideNav`. React Aria had none of
these.

**RTL needed almost nothing.** `dir="rtl"` on the wrapper mirrors Carbon's own
internals, because v11 uses logical properties throughout: the table's checkbox
column moves right, the toolbar search icon mirrors, the pagination bar mirrors.
Verified across the RTL screenshot set at all three viewports. One rule in our own
CSS needed a logical property by hand.

**Long labels are clean at all three viewports** — 0px overflow in German at 390,
1024 and 1440, against 261px still outstanding in the React Aria run.

---

## 7. Where it cost

**No column resize and no column reorder.** Grepped across `@carbon/react`: the
only match for `/resiz/` in `DataTable` is a window-resize listener for cell
alignment, and there is no `reorder` anywhere. This is Carbon's clearest
functional gap for a data application, and the only fully custom requirement in
this run — 35 lines for drag-and-drop reordering plus `Ctrl+Shift+Arrow` keyboard
support. React Aria gives resize with both drag and keyboard natively; MUI's
community DataGrid gives resize natively.

**No form-level validation channel.** Carbon's `Form` is a bare `<form>`. There is
no field registry and no `validationErrors` prop, so the `server-rejected` case is
`useState` plus manual `invalid`/`invalidText` plumbing. React Aria's `Form
validationErrors` routes a server message to the right field with no wiring at
all.

**`readOnly` silently discards `invalid`.** `useNormalizedInputProps` computes
`invalid: !readOnly && !disabled && invalid`. The first version of section 1 used
`value` + `readOnly` to pin the fixture inputs and rendered four fields that looked
**perfectly valid** — no red outline, no icon, no message, no `aria-invalid`.
Nothing warns you; the prop is simply ignored. Found by looking at a screenshot,
not by any assertion.

**No virtualisation anywhere, and no opt-in.** 400 options means 400 DOM nodes.
React Aria at least offers `Virtualizer`.

**No locale provider.** All `Intl` formatting is ours, `dir` is plumbed by us, and
`DatePicker`'s `locale` stays `"en"`, so **flatpickr's month and weekday names
remain English in Arabic**. Carbon bundles the l10ns, so this is a wiring gap
rather than a missing capability — but it is not automatic the way React Aria's
`I18nProvider` is.

**`SideNav` is built for something else.** It expects a full-height shell pinned to
the viewport edge with a `Header` above it. Inline it needs `expanded`,
`isFixedNav={false}`, `isChildOfHeader={false}` and three CSS rules to undo
`position: fixed` and `100vh`.

**22 of 71 tokens are unreachable, permanently.** All 10 z-index and all 12 spacing
tokens. A grep for `--cds-z-index` and `--cds-spacing` in Carbon's compiled
stylesheet returns nothing: both are Sass variables compiled to literals, and they
carry **no `!default`**, so they cannot be overridden from the Sass side either.
Carbon's modal is a flat `z-index: 9000`, which beats any host chrome and anything
the token scale can express. Four inert `--cds-z-index-*` mappings were written
before this was measured and have been deleted.

**Carbon's own types do not typecheck against Carbon's own components** under
`exactOptionalPropertyTypes: true`. `getSelectionProps()` returns
`checked?: boolean | undefined` while `TableSelectAll` requires `checked: boolean`;
`getHeaderProps()` returns `isSortable?: boolean | undefined` while `TableHeader`
requires `isSortable: boolean`; `getToolbarProps()` returns
`size: 'xs' | 'sm' | undefined` while `TableToolbar` accepts only
`'xs' | 'sm' | 'lg'`. The values are correct at runtime — these are two Carbon
declarations disagreeing. A four-line `asProps<C>()` cast at the spread was the
only route that did not mean loosening a compiler setting shared by every app in
the workspace.

---

## 8. IBM telemetry — a procurement finding, not a licence one

**21 packages in this tree run `postinstall: ibmtelemetry --config=telemetry.yml`.**
Verified by reading each resolved `package.json`:

- 12 Carbon packages: `@carbon/react`, `styles`, `colors`, `themes`, `type`,
  `layout`, `grid`, `motion`, `icons-react`, `icon-helpers`, `feature-flags`,
  `utilities`.
- 9 `@ibm/plex*` font packages.

Each POSTs to `https://www-api.ibm.com/ibm-telemetry/v1/metrics`.
`@carbon/react`'s `telemetry.yml` is 991 lines, enables `jsx`, `npm` and `js`
collectors, and carries an allow-list of **829 entries (739 unique names)** of
component and prop names whose usage is reported.

It runs at **install time**, so it fires in CI and on every developer machine, and
it is **on by default**; the opt-out is `IBM_TELEMETRY_DISABLED=true`. IBM
documents it as anonymised and aggregated, which is not verifiable from the
consumer side. **No other candidate in this evaluation installs anything
comparable.**

This breaches no licence and no brief constraint. For a UN body it is a data
governance decision that should be taken deliberately rather than inherited, and
if Carbon is adopted the variable should be set in CI and documented for
contributors. Details in `licences.md`.

---

## 9. Accessibility

**No conformance is claimed.** Results recorded verbatim.

Scoped to the candidate subtree: **1 violation (serious), 2 incomplete**. Per-section
JSON in `test-results/`.

| Scan | Violations |
| --- | --- |
| Candidate subtree | 1 serious (`color-contrast`) |
| Whole page, Carbon global | 1 |
| Whole page, Carbon contained (`?carbonCss=scoped`) | 3 |

The one remaining violation is `color-contrast` on the helper text of the disabled
`TextInput` and disabled `Select`. Carbon applies its disabled text colour to the
associated helper text, and `--undrr-color-text-disabled` (#8b9aa5) is about 2.8:1
on white. Disabled *controls* are exempt from WCAG 1.4.3; helper text is not itself
a disabled control. Tokens are import-only, so it could not be fixed here. The
`delta-mui` run reported the identical finding, which suggests the token rather
than either library.

### Two results that need reading carefully

**A critical violation was found and worked around, not absent.** Carbon sets
`aria-errormessage="<id>-error-msg"` on an invalid field and renders the message in
a `.cds--form-requirement` with that id — but with **no `role="alert"`, no
`aria-live`, and not referenced from `aria-describedby`**. axe's
`aria-valid-attr-value` rule requires the target to be reachable one of those ways,
so all three invalid fields reported a **critical** violation. Carbon exposes no
prop for it. The fix duplicates the reference through `aria-describedby`, which
works only because `...rest` is spread last in Carbon's `sharedTextInputProps` and
only if you know the id is derived as `` `${id}-error-msg` ``. Both are internals.
**Every Carbon consumer using invalid fields has this violation unless they know
the trick.** It should be fixed upstream.

Note this was invisible until the `readOnly` bug above was fixed: with `readOnly`
set, the invalid state never rendered, so axe reported the rule as merely
*incomplete*. Fixing one defect exposed the other.

**The host's own `link-in-text-block` violation disappears in the default build,
and nobody should take comfort from it.** The documented Mangrove baseline is one
serious `link-in-text-block` on the canary paragraph, because Mangrove underlines
links on hover only. The whole-page scan with Carbon global reports **1** violation
and does not include it; the scan with Carbon contained reports **3** and does.
Carbon's global `a { color: #0062fe }` reaches the host's canary link and changes
the link/text contrast enough for axe to stop firing. **The leakage masked a host
accessibility failure rather than fixing anything** — and it is a good illustration
of why the leakage number matters even when a downstream metric improves.

The scoped build's third violation is `target-size` on Carbon's own controls, from
the layout-token problem described in finding 1 before it was fixed.

### Also recorded

- `scrollable-region-focusable` (serious, 390px only) on
  `.cds--data-table-content`. Caused by the `overflow-x` rule that stops a 250-row
  German table scrolling the document. Carbon renders that div internally with no
  way to add `tabindex`, so the choice is a keyboard-inaccessible scroll region or
  a horizontally scrolling document. Needs a design decision.
- 2 incomplete rules axe could not decide: `aria-valid-attr-value` and
  `color-contrast`.
- **Still needs a human**: the composed date-time range is four fields with no
  single accessible name for the range as a concept, and the custom column reorder
  is asserted to work but is not announced. axe cannot see either.

---

## 10. Metrics

| | |
| --- | --- |
| Custom CSS | **351 effective lines, 48 selectors** (611 lines including comments) |
| `--cds-*` token mappings | 97 |
| Tokens applied / unreachable | **50 of 71 / 22** |
| Custom behavioural lines | **171** |
| Wrappers | 4, 71 lines |
| Gzipped JS | **207.8 kB** (least of the three runs) |
| Gzipped CSS | **121.8 kB** — 84.4 Carbon, 34.8 Mangrove host, 2.7 tokens + theme |
| Dependencies | 146 |
| Build time | 4.7 s warm (19.6 s on the first build, dominated by the scoped Sass compile) |

Cross-run comparison of the headline trade:

| Run | Gzipped JS | Custom CSS lines | Custom behaviour lines | Leakage |
| --- | --- | --- | --- | --- |
| `mangrove-react-aria` | 237.6 kB | 624 | 106 | clean |
| `delta-mui` | 387.4 kB | 14 | ~130 | clean |
| `mangrove-carbon` | **207.8 kB** | 351 | 171 | **54 differences** |

Carbon ships the least JavaScript and the most CSS, and the CSS is the reason it
fails leakage. That is one architectural choice showing up as three numbers.

---

## 11. Determinism

No `new Date()` anywhere in demo code. All dates derive from `TODAY_ISO` and
`DEFAULT_RANGE`; the two range times are sliced out of `DEFAULT_RANGE` rather than
recomputed. Every `Intl` formatter is constructed with `timeZone: "UTC"`, so the
rendered table, the date inputs and the derived range summary do not depend on the
runner.

The Mangrove 2.0 preview tokens were **not** used, so the theming numbers describe
`packages/undrr-tokens` only, as the brief requires.

---

## 12. Shared packages

Not modified. Nothing in the scaffold blocked this implementation, so there are no
findings to report against `fixtures`, `undrr-tokens`, `host-mangrove` or
`test-harness`.

One observation about the harness rather than a defect: `checkLeakage` compares
`?candidate=off` against `?candidate=on` across a reload, and for this pairing that
design is doing real work. Carbon's CSS had to be skipped entirely in the `off`
baseline — see `src/css-mode.ts`. Had it been a static import present in both
snapshots, the reset would have cancelled out and this run would have reported a
clean leakage result it did not earn, which would have been the single most
misleading number in the evaluation.
