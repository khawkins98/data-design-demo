# Evidence: IBM Carbon on the Mangrove host

Structured record in `evidence.json`. This is the prose.

**Summary.** Of 30 requirements: **19 native, 10 composed, 1 custom, 0
unsupported**, for **171 custom lines**. Theming: **97 `--cds-*` assignments,
runtime-resolved**. Leakage assertion fails: **54 differences across 11 of 14
canaries.** The single `custom` entry is `table-column-resize-or-reorder`.

---

## 1. Leakage: Carbon restyles the host

`@carbon/styles/css/styles.css` (958 kB) opens with a full element-level reset
over `html, body, div, span, h1`--`h6`, `p`, `a`, `table`, `button`, `label`,
`form` and ~40 more bare selectors. **54 differences, 11 of 14 canaries**
affected across `color`, `font-family`, `font-size`, `font-weight`,
`line-height`, `letter-spacing`, `margin-*`. Three button canaries survived
(Mangrove styles at (0,1,0)+, beating Carbon's (0,0,1)).

Host `<h1>`: `font-size` 32px to **42px**, `font-weight` 700 to **300**,
`line-height` 34.56px to **50.358px**, `letter-spacing` 0.64px to **normal**,
margins **zeroed**, `font-family` Roboto to **IBM Plex Sans**.

Host links: `color` `rgb(0, 79, 145)` (UNDRR blue) to **`rgb(0, 98, 254)`**
(IBM blue) on both `link` and `nav-link` canaries. Full diff in
`test-results/leakage.json`.

**delta-carbon comparison:** 79 differences across all 14 canaries. Mangrove's
54/11 is better (class-based buttons hold where Tailwind utilities did not).
Neither is acceptable.

### Containment experiment

`?carbonCss=scoped` (`.demo { @import }`) achieves **0 differences**
(`test-results/leakage-scoped.json`). Costs: depends on deprecated Sass
`@import`; `:root` blocks stop matching (Button shrinks to **33x21 px**, fixed
via `.cds--layer-one`); borrows `box-sizing` from the host. **Three options, no
configuration fix:** Carbon owns page-level typography, carry the scoped build,
or do not adopt Carbon on Mangrove pages.

---

## 2. Collisions: the host restyles Carbon

**44 Mangrove rules match 1,594 Carbon elements**; 10 Carbon rules match 38
host elements (`test-results/collisions.json`). Worst: `*` box-sizing (956),
`button, input, …` font reset (80), `label { display: block }` (38),
`input[type="text"]` with `border: 2px solid #1a1a1a; height: 46px` (18).

Mangrove's input rule at (0,1,1) beats Carbon's `.cds--text-input` at (0,1,0) --
**every Carbon text field rendered as a 46px box with a 2px black border**, also
masking Carbon's invalid-state `outline`. Fix: ten declarations at (0,2,0).

---

## 3. The Mangrove `[hidden]` bug

Mangrove's `input[type="text"] { display: block }` at (0,1,1) outranks its own
`[hidden] { display: none }` at (0,1,0). Carbon unaffected (its only `hidden`
element is a `<ul>`). Workaround was dead code, deleted; e2e assertion kept.

---

## 4. Portalled overlays

All overlays (Popover, Modal, Tooltip, Dropdown, ComboBox, DatePicker with
`appendTo`) render in-tree inside the token scope. DatePicker wraps flatpickr,
which defaults to `document.body`; without `appendTo`, the escaped overlay
paints Carbon's stock White theme -- **fully visible, silently off-brand,
`--undrr-*` unresolved**.

---

## 5. `datetime-range-picker`: composed

Carbon provides a **native date range** (`datePickerType="range"`) but is
**date-only** -- no `DateTimePicker`. Composed from **range calendar + two
`TimePicker`s** (46 lines). Gaps: no single accessible name (four fields);
flatpickr cannot see inverted times on a single-day range.

**`DatePicker` is not controlled.** Inline `value={[start, end]}` creates a new
array each render, closing the calendar after one click. Fix: hoist array to
module scope; `onChange` is the source of truth.

---

## 6. Where Carbon wins

**Data table is the strongest of the three.** Sorting (**0 custom lines** vs. 22
React Aria), filtering (**0** vs. 14), selection with indeterminate header and
batch-action bar.

**State components:** `DataTableSkeleton`, `InlineLoading`, `InlineNotification`.

**Theming:** 97 `--cds-*` assignments, runtime-resolved. No provider, no build step.

**RTL:** `dir="rtl"` mirrors internals (logical properties). **Long labels:**
0px overflow in German at 390/1024/1440 (vs. 261px React Aria).

---

## 7. Where it cost

- **No column resize or reorder.** Only fully custom requirement (35 lines).
- **No form-level validation.** `Form` is a bare `<form>`; `server-rejected`
  needs manual `invalid`/`invalidText` plumbing.
- **`readOnly` silently discards `invalid`.** No warning.
- **No virtualisation.** 400 options = 400 DOM nodes.
- **No locale provider.** flatpickr month/weekday names stay English in Arabic.
- **`SideNav` is application shell chrome**, not a navigation list.
- **22 of 71 tokens unreachable** (all z-index and spacing). No `!default`.
- **Types fail under `exactOptionalPropertyTypes: true`.** Cast workaround in
  `src/carbon-props.ts`.

---

## 8. IBM telemetry

**21 packages run `postinstall: ibmtelemetry`** (12 Carbon, 9 `@ibm/plex*`).
POSTs to `https://www-api.ibm.com/ibm-telemetry/v1/metrics`. On by default;
opt-out: `IBM_TELEMETRY_DISABLED=true`. **No other candidate does this.** No
licence breach; for a UN body it is a data governance decision.

---

## 9. Accessibility

No conformance claimed. **Scoped: 1 serious violation, 2 incomplete.**

| Scan | Violations |
| --- | --- |
| Candidate subtree | 1 serious (`color-contrast`) |
| Whole page, Carbon global | 1 |
| Whole page, Carbon contained (`?carbonCss=scoped`) | 3 |

**`color-contrast`** -- disabled helper text ~2.8:1 (`#8b9aa5` on white). Same
cause as `delta-mui`; suggests the token rather than either library.

**`aria-errormessage` critical violation -- worked around.** Carbon sets
`aria-errormessage` with no announcement technique. Fix: duplicate via
`aria-describedby` (undocumented internals). Should be fixed upstream.

**`link-in-text-block`** host violation disappears in default build because
Carbon's global `a { color }` reaches the canary link -- leakage masked a host
a11y failure.

Also: `scrollable-region-focusable` (serious, 390px) on
`.cds--data-table-content` (no way to add `tabindex`); 2 incomplete rules.
**Needs human review**: composed range has four fields with no single accessible
name; custom column reorder is not announced.

---

## 10. Metrics

Custom CSS **351 lines / 48 selectors**. Token mappings 97; applied 50 of 71
(22 unreachable). Custom behavioural lines **171**. Gzipped JS **207.8 kB**
(least of the three). Gzipped CSS **121.8 kB** (84.4 Carbon, 34.8 host, 2.7
tokens + theme). Dependencies 146.

| Run | Gzipped JS | Custom CSS | Custom behaviour | Leakage |
| --- | --- | --- | --- | --- |
| `mangrove-react-aria` | 237.6 kB | 624 | 106 | clean |
| `delta-mui` | 387.4 kB | 14 | ~130 | clean |
| `mangrove-carbon` | **207.8 kB** | 351 | 171 | **54 diffs** |

---

## 11. Determinism and shared packages

All dates from fixtures, formatters `timeZone: "UTC"`. Playwright pins
`timezoneId: "UTC"` and `locale: "en-GB"`. No `new Date()` in demo code.

Shared packages not modified. Carbon's CSS skipped in the `off` baseline (see
`src/css-mode.ts`) -- a static import would cancel out and report clean leakage.

---

## Escalations

1. **IBM Telemetry runs on install.** Opt-out: `IBM_TELEMETRY_DISABLED=true`.
2. **`aria-errormessage` on every invalid Carbon input** lacks an announcement
   technique. Workaround relies on undocumented internals.
