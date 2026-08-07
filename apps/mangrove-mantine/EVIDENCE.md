# Evidence: Mantine on the Mangrove host

Structured record in `evidence.json`.

**Summary.** Of 30 requirements: **19 native, 10 composed, 1 custom, 0
unsupported**, for **293 lines of custom behavioural code** — 229 of them (78%)
in the data table. Leakage: **0 differences** (with Mantine's global baseline
omitted; importing it changes **36 computed properties across all 14 canaries**).
Scoped axe: **0 violations** (after fixing two `button-name` criticals shipped
by default). **103 lines of custom CSS across 44 selectors**, 30 of which are a
scoped baseline replacement.

Headline results:

1. **Mantine has a native date-time range picker, under MIT.** MUI charges for
   this.
2. **Mantine's `Table` is presentational only.** Sort, filter, select, paginate
   and resize are all consumer-written.

---

## What went well

### The date-time range picker is native and free

`<DateTimePicker type="range">` (`@mantine/dates` 9.5.1): one popover, one focus trap, one calendar with range highlighting, two `TimePicker`s. Zero lines of range plumbing.

| Source | What it shows |
| --- | --- |
| `types/DatePickerValue.d.ts` | `DatePickerType = 'default' \| 'multiple' \| 'range'` |
| `DateTimePicker.mjs:27` | `const isRange = type === "range"` |
| `DateTimePicker.d.ts` | `endTimePickerProps`: "props passed down to the **end** time TimePicker component in range mode" |
| `DateTimePicker.d.ts` | `allowSingleDateInRange?: Type extends 'range' ? boolean : never` |
| `DateTimePicker.mjs` | `clearIncompleteRange()` resets `[start, null]` on dropdown close |

MUI's range pickers are commercial (`@mui/x-date-pickers-pro`). Mantine has no paid tier.

### Determinism came for free

Mantine 8+ uses plain strings (`YYYY-MM-DD HH:mm:ss`) with no timezone concept. No `new Date()` in any component; `Intl` paths use `timeZone: "UTC"`. Eliminates the timezone-dependent bug the react-aria run hit.

### Selection is the strongest section

`Select`, `MultiSelect` and `Autocomplete` are one component each with `searchable`, `nothingFoundMessage`, `clearable` and `limit` as props. `MultiSelect` renders removable `Pill`s natively. Zero custom lines for five requirements.

### States are better covered than in either sibling demo

Mantine 9.5 ships `EmptyState`, `Loader`, `LoadingOverlay` and `Skeleton`. Neither sibling demo had an empty-state component.

### Overlays are native and survive portalling

Modal, Tooltip, Popover and Accordion ship with focus trap, focus restore, Escape, outside-click dismiss and ARIA wiring.

Mantine resolves token values at build time into `--mantine-*` properties at `:root`, so portalled overlays render opaque backgrounds even though `--undrr-color-surface` is empty on `document.body`. Same mechanism as MUI, same trade: token changes need a rebuild.

---

## Where it cost

### The data table: 229 custom lines for what MUI gets from props

`@mantine/core`'s `Table` is **presentational only**: `striped`,
`highlightOnHover`, `withTableBorder`, `stickyHeader`, `tabularNums`, `layout`
and `ScrollContainer`. No sorting, selection, filtering, pagination or column
sizing. No headless table hook in `@mantine/hooks`.

| Requirement | Status | Lines | What Mantine gave |
| --- | --- | --- | --- |
| `table-render` | composed | 30 | the markup; the row/cell loop and all `Intl` formatting are ours |
| `table-sort` | composed | 40 | nothing — comparator, direction state, `aria-sort` and the header buttons are ours |
| `table-multiselect` | composed | 33 | `Checkbox` with a real `indeterminate` prop; the selection set and select-all logic are ours |
| `table-filter` | composed | 26 | `TextInput` and `Select`; the predicate is ours |
| `table-paginate` | composed | 28 | `Pagination` — a complete accessible pager. Page state, slicing and the page-size control are ours |
| `table-column-resize-or-reorder` | **custom** | 72 | nothing at all |

Comparison: `apps/delta-mui` got all of the above from `<DataGrid />` props for **0 custom lines**.

`aria-sort` is consumer-written. The comparator must use `Intl.Collator` with `sensitivity: "base"` or French/German fixtures sort wrong.

### `table-column-resize-or-reorder` is `custom`, not `unsupported`

No column sizing in `@mantine/core` or `@mantine/hooks`. The ecosystem answer is **`mantine-datatable`** (third-party); the brief forbids installing it. Status is `custom` (72 lines) rather than `unsupported` because the requirement is reachable.

`src/use-column-resize.ts`: pointer-drag resizing with pointer capture, minimum width, keyboard resizing (`role="separator"`, `aria-valuenow`, arrow/PageUp/PageDown/Home). Gaps: no live width announcements, no content-derived max width, no width persistence.

If Mantine is chosen, add `mantine-datatable` (MIT, single-maintainer) or budget for an in-house table layer.

### Mantine's global baseline had to be dropped

`baseline.css` is a **global reset** (`*, *::before, *::after { box-sizing: border-box }`, `font: inherit`, body styles). `src/mantine-styles.css` omits it; `src/demo.css` re-applies the equivalent scoped to `.demo` and `.demo-overlay`. Same trade as `apps/delta-mui`.

`test-results/leakage-with-baseline.json`: **36 differences across all 14 canaries** when `baseline.css` is injected (font-family, text color, line-height shifts). Delta-mantine measured **23** -- the gap is that Mangrove has no global `box-sizing` reset (Tailwind Preflight supplies it for Delta). The scoped reset uses `:where()` for (0,0,0) specificity to match the real baseline's cascade.

### The import-order trap

All Mantine classes are (0,1,0), so cascade is decided **purely by source order**. Imported alphabetically, `Button` came before `UnstyledButton` and every button rendered as bare text. Build, `tsc`, e2e and axe all passed -- caught only by screenshot. The delta-mantine run hit the same trap.

Fix: derive import order from byte offsets in `@mantine/core/styles.css` (`src/mantine-styles.css`). Verified: 461 of 461 hashed classes present, no baseline rules, no extras. Mantine does not document that order is load-bearing.

### Two components collide with the host

Mangrove's `_form-legacy.scss` sets `input[type=text]` at (0,1,1); Mantine's input rule is (0,1,0). Blast radius: **5 elements from 2 components out of 50 inputs** (`test-results/host-collision.json`). Most inputs are untouched because Mantine omits `type` on them.

Colliding components:

- **`PillsInputField`** (search field inside `MultiSelect`) -- gained 2px border, 46px height, full width.
- **`TimePicker`'s hour/minute fields** -- four fields inside the date-time range popover similarly affected.

Two scoped rules at (0,3,1) restore both. The `textarea` selector matches but loses at (0,0,1) vs Mantine's (0,1,0).

### The `[hidden]` trap does not reproduce

The `[hidden]`/`input[type=text]` specificity conflict from `apps/mangrove-react-aria/EVIDENCE.md` does not affect Mantine. All Mantine helper inputs use `type="hidden"`, which is outside Mangrove's selector list. No `.demo [hidden]` guard shipped.

### Ten shades per colour, from a token set that has four

Mantine requires every colour as a **ten-shade tuple**; `theme.primaryColor` must be a key of `theme.colors`. The token set gives four accent stops, six neutrals and one stop per status colour. Token values are **repeated rather than interpolated** to avoid inventing colours, but this flattens hover/press differentiation.

An interpolated neutral ramp put an invented `#75838f` at `gray-6` (`--mantine-color-dimmed`), yielding 3.9:1 on white -- **five serious axe `color-contrast` violations**. Pinning `gray-6` to `textSecondary` (7.4:1) removed all five.

Neutral mapping that must be correct:

| Shade | Mantine consumer |
| --- | --- |
| `gray-3` | `--table-border-color` |
| `gray-4` | `--mantine-color-default-border`, i.e. every input border |
| `gray-5` | `--mantine-color-placeholder` |
| `gray-6` | `--mantine-color-dimmed` |

### Two icon-only buttons ship with no accessible name

axe reported **2 critical `button-name` violations**:

- `Pagination`'s first/previous/next/last controls -- fixed with `getControlProps`.
- `InputClearButton` on `clearable` inputs -- fixed with `clearButtonProps={{ "aria-label": ... }}`.

Both are fixable but **inaccessible by default**.

### RTL needs a document-level mutation

`setDirection()` writes `dir` to `document.documentElement` -- **outside the candidate subtree**. There is no scoped RTL prop. Mantine's CSS (`:where([dir="rtl"]) .m_xxx`) would work from any ancestor, but the JS context requires the document element. A 7-line `DirectionSync` component handles this.

`dayjs` locale files must be imported manually; without them `DatesProvider` silently formats in English for all locales.

### 400 options render 400 DOM nodes

`Select` and `MultiSelect` render every option. Virtualisation requires dropping to the `Combobox` primitive. `Autocomplete` is capped with `limit={100}`.

### The host's nav treatment is not reachable

Mangrove's nav uses a 3px inline-start accent bar. `NavLink` exposes only `--nl-color`, `--nl-bg` and `--nl-hover` -- the bar is not reachable through props or CSS variables. The mismatch is left visible in screenshots.

---

## Leakage

**14 canaries, 27 watched properties, 0 differences.** `test-results/leakage.json`.

The harness compares `?candidate=off` vs `?candidate=on`. A statically imported stylesheet is present in both loads, making the assertion vacuous. `src/main.tsx` loads Mantine's CSS through an **awaited dynamic import inside the `candidate=on` branch**, and the e2e suite asserts `--mantine-font-family` is absent from `:root` on the baseline load.

Unwatched mutations outside the subtree:

- `MantineProvider` sets `data-mantine-color-scheme="light"` on `<html>`.
- `DirectionProvider.setDirection()` sets `dir` on `<html>`.
- `--mantine-*` custom properties at `:root` (harmless only because `baseline.css` was omitted).

---

## Accessibility

**No conformance claimed.** Scoped to candidate subtree: **0 violations, 0 incomplete.** Per-section JSON in `test-results/`.

Whole page: **1 serious** (`link-in-text-block`) on the host's canary link -- the documented Mangrove baseline, not this candidate's.

Fixes applied to reach 0 scoped:

| Before | Fix |
| --- | --- |
| 2 critical `button-name` | `getControlProps` on `Pagination`, `clearButtonProps` on every `clearable` input |
| 5 serious `color-contrast` | pinned `gray-6` to `textSecondary` instead of an interpolated ramp value |
| host `link-in-text-block` reproduced inside candidate | `Anchor underline="always"` -- Mantine's default `underline="hover"` reproduces the host's WCAG 1.4.1 failure independently |

axe is static analysis. The column resizer (72 lines of custom code, no width announcements) needs manual screen-reader testing first.

---

## Theming

**62 of 71 tokens applied, 0 unreachable.**

Method: `createTheme()` mapping tokens into Mantine's theme object, plus six `components.*.defaultProps` for z-index and three CSS rules for the focus ring. Mantine serialises the theme into `--mantine-*` custom properties -- a build-time **copy** of token values (same trade as MUI).

The 9 unapplied tokens have no use on this page (e.g. `surface-raised`, `text-inverse`, `on-accent`, four z-index layers with no corresponding Mantine surface).

Friction points (recorded in `evidence.json.theming.escapeHatchesUsed`):

1. **Ten shades per colour.** Covered above.
2. **No focus colour in the theme.** Focus ring uses `--mantine-primary-color-filled` with no separate field. CSS override on `.mantine-focus-auto:focus-visible` required, repeated under `.demo-overlay` for portalled surfaces.
3. **No z-index scale in the theme.** `--mantine-z-index-*` is written by the static stylesheet, unreachable from the theme object. Per-component `defaultProps` is the only route.

No shadow scale in the token set, so Mantine's defaults remain. Mangrove 2.0 preview tokens were not used.

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

Bundle: 270.9 kB vs delta-mui's 387.4 kB, but 35.4 kB is Mangrove's own stylesheet. Mantine ships one 242 kB stylesheet (37 kB gzipped) regardless of usage.

Long labels: clean at all three viewports. One 14 px overflow at 390 px was caused by a fixed width, not Mantine.

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

Delta's Preflight removes styling (Mantine puts it back through its own classes). Mangrove *imposes* styling by element selector, and where its specificity beats Mantine's, a consumer-written rule is required.

---

## Shared packages

Not modified. **`checkLeakage` cannot detect leakage from a statically imported stylesheet** -- this run works around it with a dynamic import in `main.tsx`.
