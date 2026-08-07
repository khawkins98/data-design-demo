# Evidence: IBM Carbon on the Mangrove host

Structured record in `evidence.json`. This is the prose.

**Summary.** Of 30 requirements: **19 native, 10 composed, 1 custom, 0
unsupported**, for **171 custom lines**. Theming: **97 `--cds-*` assignments in
one CSS block, resolved at runtime**.

**Leakage assertion fails: 54 computed-property differences across 11 of 14 host
canaries.** Left failing.

The single `custom` entry is `table-column-resize-or-reorder`: Carbon has neither.

---

## 1. Leakage: Carbon restyles the host

`@carbon/styles/css/styles.css` (958 kB) opens with a full element-level reset
over `html, body, div, span, h1`--`h6`, `p`, `a`, `table`, `button`, `ul`, `ol`,
`label`, `form` and ~40 more bare selectors.

Measured against Mangrove's 197 kB global stylesheet using the harness's 14
canaries and 27 watched properties:

| | |
| --- | --- |
| Differences | **54** |
| Canaries affected | **11 of 14** |
| Properties affected | `color`, `font-family`, `font-size`, `font-weight`, `line-height`, `letter-spacing`, `border-top-color`, `margin-top`, `margin-bottom` |
| Untouched | `button-primary`, `button-secondary`, `button-disabled` |

Host `<h1>` impact:

| Property | Mangrove | After Carbon |
| --- | --- | --- |
| `font-size` | 32px | **42px** |
| `font-weight` | 700 | **300** |
| `line-height` | 34.56px | **50.358px** |
| `letter-spacing` | 0.64px | **normal** |
| `margin-top` / `margin-bottom` | 10px | **0px** |
| `font-family` | Roboto | **IBM Plex Sans** |

Host link impact:

| Canary | Property | Mangrove | After Carbon |
| --- | --- | --- | --- |
| `link` | `color` | `rgb(0, 79, 145)` — UNDRR blue | **`rgb(0, 98, 254)` — IBM blue** |
| `nav-link` | `color` | `rgb(0, 79, 145)` | **`rgb(0, 98, 254)`** |

Full diff in `test-results/leakage.json`.

The three buttons survived because Mangrove styles them through classes at
specificity (0,1,0)+, beating Carbon's `button` reset at (0,0,1). Every affected
canary is one Mangrove styles at element level.

### Comparison with delta-carbon

`delta-carbon`: **79 differences across all 14 canaries** with the same
stylesheet. Mangrove's 54/11 is better (class-based buttons hold where Tailwind
utilities did not). Neither result is acceptable.

### Containment experiment

`?carbonCss=scoped` compiles Carbon's Sass inside `.demo { @import "@carbon/styles/index.scss"; }`.

**Result: 0 differences, all 14 canaries** (`test-results/leakage-scoped.json`).
Four costs:

1. **Depends on deprecated Sass `@import`** (the only way to nest Carbon's entry; slated for removal).
2. **`:root` blocks stop matching.** Layer block: restored via `.cds--layer-one`.
   Layout block: `clamp()` expressions with no fallback invalidate declarations
   (Button: **112 x 48 px to 33 x 21 px**). Fixed by transcribing into `carbon-scoped.scss`.
3. **Borrows `box-sizing` from the host.** Would break without a global box-sizing rule.
4. **Sass entry emits webpack-style font URLs** -- irrelevant since the theme overrides the font stack.

**Three options, no configuration fix:** Carbon owns page-level typography,
carry the scoped build, or do not adopt Carbon on Mangrove pages.

---

## 2. Collisions: the host restyles Carbon

`test-results/collisions.json` attributes every matching rule by source stylesheet.

| Direction | Rules | Elements matched |
| --- | --- | --- |
| Mangrove → Carbon components | **44** | **1,594** |
| Carbon → host canaries | 10 | 38 |

44 Mangrove rules reaching into Carbon, worst first:

| Elements | Selector | Declarations |
| --- | --- | --- |
| 956 | `*, ::after, ::before` | `box-sizing: border-box; overflow-wrap: break-word` |
| 80 | `button, input, optgroup, select, textarea` | `font-family: inherit; font-size: 100%; line-height: 1.15` |
| 44 | `body, button` | `font-family: Roboto, sans-serif` |
| 38 | `label` | `display: block` |
| 18 | `input[type="date"], … input[type="text"], textarea` | `appearance: none; border: 2px solid #1a1a1a; height: 46px; …` |
| 15 | `h3, h4, h5` | `font-weight: 600; line-height: 1.15` |
| 15 | `p` | `margin-top: 0` |

Mangrove's input rule at (0,1,1) beats Carbon's `.cds--text-input` at (0,1,0).
**Every Carbon text field, search field, date input and time picker rendered as a
46px box with a 2px black border.** Same host-level problem found in `mangrove-mui`.
Additionally, Mangrove's `border` masked Carbon's invalid-state `outline`. Fix:
ten declarations re-asserting Carbon's values at (0,2,0) on `.demo .cds--text-input`, etc.

---

## 3. The Mangrove `[hidden]` bug: inert against Carbon

Mangrove's `input[type="text"], textarea { display: block }` at (0,1,1)
outranks its own `[hidden] { display: none }` at (0,1,0), so hidden helper
inputs render visibly. Carbon's only `hidden` element is a `<ul>`, unaffected.
Computed `display` stays `none`. The workaround was dead code and has been
deleted. The e2e assertion is kept as a regression guard.

---

## 4. Portalled overlays

| Overlay | Inside candidate root | Inside token scope | Background | `--undrr-*` resolves |
| --- | --- | --- | --- | --- |
| Popover | yes | yes | `rgb(255, 255, 255)` | yes |
| Modal | yes | yes | `rgb(255, 255, 255)` | yes |
| Tooltip | yes | yes | `rgb(20, 35, 46)` | yes |
| Dropdown menu | yes | yes | `rgb(255, 255, 255)` | yes |
| ComboBox menu | yes | yes | `rgb(255, 255, 255)` | yes |
| Range calendar, with `appendTo` | yes | yes | `rgb(255, 255, 255)` | yes |
| **Range calendar, forced onto `document.body`** | **no** | **no** | **`rgb(244, 244, 244)`** | **no** |

All overlays except DatePicker render in-tree. DatePicker wraps flatpickr, which
appends to `document.body`; Carbon exposes `appendTo` to keep it in the subtree.
An escaped overlay paints Carbon's stock White theme -- **fully visible, silently
off-brand**. Asserted in e2e.

---

## 5. `datetime-range-picker`: composed

`DatePicker datePickerType="range"` provides a **native date range**: one
calendar, two inputs, drag-to-select. Carbon is **date-only** -- no
`DateTimePicker` exists.

Composition: **one range calendar plus two `TimePicker`s** (46 lines). Covers
`HH:MM` parsing, duration derivation, and end-before-start validation.

**Gaps:** no single accessible name for the range (four unrelated fields); time
editing outside the calendar; flatpickr cannot see inverted times on a single-day
range; `Date` arithmetic required in application code.

### Carbon's `DatePicker` is not a controlled component

Inline `value={[startDate, endDate]}` creates a new array reference every render,
triggering flatpickr's `setDate`. Calendar **closes after the first click**. Fix:
hoist the array to module scope; `onChange` is the source of truth.

---

## 6. What Carbon gave us that the other candidates did not

**Data table is the strongest of the three.** Sorting (**0 custom lines** vs. 22
React Aria), filtering (**0** vs. 14), selection with indeterminate header and
batch-action bar.

**State components:** `DataTableSkeleton`, `InlineLoading` (active/finished/error
with aria-live), `InlineNotification`. Only empty state lacks a component.

**Theming:** 97 `--cds-*` assignments, runtime-resolved. No provider, no build step.

**RTL:** `dir="rtl"` mirrors internals (logical properties). Verified at three viewports.

**Long labels:** 0px overflow in German at 390, 1024, 1440 (vs. 261px in React Aria).

---

## 7. Where it cost

**No column resize and no column reorder.** The only fully custom requirement --
35 lines for drag-and-drop reordering plus `Ctrl+Shift+Arrow` keyboard support.

**No form-level validation channel.** Carbon's `Form` is a bare `<form>`. The
`server-rejected` case is `useState` plus manual `invalid`/`invalidText` plumbing.

**`readOnly` silently discards `invalid`.** `useNormalizedInputProps` clears
`invalid` when `readOnly` is true. No warning; the prop is simply ignored.

**No virtualisation.** 400 options means 400 DOM nodes.

**No locale provider.** flatpickr's month/weekday names remain English in Arabic.

**`SideNav` is application shell chrome**, not a navigation list. Needs overrides
to render as an in-page column.

**22 of 71 tokens unreachable.** All 10 z-index (literals, e.g. modal: `9000`)
and all 12 spacing. No `!default`.

**Types fail under `exactOptionalPropertyTypes: true`.** Cast workaround in
`src/carbon-props.ts`.

---

## 8. IBM telemetry

**21 packages in this tree run `postinstall: ibmtelemetry --config=telemetry.yml`**
(12 Carbon packages, 9 `@ibm/plex*` font packages). Each POSTs to
`https://www-api.ibm.com/ibm-telemetry/v1/metrics`. On by default; opt-out:
`IBM_TELEMETRY_DISABLED=true`. **No other candidate does this.**

No licence breach. For a UN body it is a data governance decision. If Carbon is
adopted the variable should be set in CI. Details in `licences.md`.

---

## 9. Accessibility

No conformance claimed. Results in `test-results/`.

**Scoped: 1 violation (serious), 2 incomplete.**

| Scan | Violations |
| --- | --- |
| Candidate subtree | 1 serious (`color-contrast`) |
| Whole page, Carbon global | 1 |
| Whole page, Carbon contained (`?carbonCss=scoped`) | 3 |

**`color-contrast`** -- disabled helper text at ~2.8:1 (`#8b9aa5` on white).
Same cause as `delta-mui`; suggests the token rather than either library.

**`aria-errormessage` critical violation -- found and worked around.** Carbon sets
`aria-errormessage` on invalid fields with no `role="alert"`, `aria-live`, or
`aria-describedby`. Fix: duplicate via `aria-describedby` (relies on undocumented
internals). Should be fixed upstream.

**`link-in-text-block` host violation disappears in the default build** because
Carbon's global `a { color }` reaches the canary link. The leakage masked a host
accessibility failure.

### Also recorded

- `scrollable-region-focusable` (serious, 390px) on `.cds--data-table-content`:
  Carbon renders the div internally with no way to add `tabindex`.
- 2 incomplete rules: `aria-valid-attr-value`, `color-contrast`.
- **Needs human review**: composed date-time range has four fields with no single
  accessible name; custom column reorder is not announced.

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
| Build time | 4.7 s warm (19.6 s first build, dominated by scoped Sass compile) |

Cross-run comparison:

| Run | Gzipped JS | Custom CSS lines | Custom behaviour lines | Leakage |
| --- | --- | --- | --- | --- |
| `mangrove-react-aria` | 237.6 kB | 624 | 106 | clean |
| `delta-mui` | 387.4 kB | 14 | ~130 | clean |
| `mangrove-carbon` | **207.8 kB** | 351 | 171 | **54 differences** |

---

## 11. Determinism

All dates from fixtures, all formatters `timeZone: "UTC"`. Playwright pins
`timezoneId: "UTC"` and `locale: "en-GB"`. No `new Date()` in demo code.

---

## 12. Shared packages

Not modified. Carbon's CSS had to be skipped in the `off` baseline (see
`src/css-mode.ts`); a static import would have cancelled out and reported a clean
leakage result it did not earn.

---

## Escalations

1. **IBM Telemetry runs on install.** Opt-out: `IBM_TELEMETRY_DISABLED=true`.
   Procurement/data-governance question. No other candidate does this.

2. **`aria-errormessage` on every invalid Carbon input** lacks an announcement
   technique. Workaround relies on undocumented internals.
