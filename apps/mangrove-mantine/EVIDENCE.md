# Evidence: Mantine on the Mangrove host

Structured record in `evidence.json`. This is the prose.

**Summary.** Of 30 requirements: **19 native, 10 composed, 1 custom, 0
unsupported**, for **293 custom lines** — 229 (78%) in the data table. Leakage
clean (0 differences, baseline omitted). Scoped axe: **0 violations** after
fixing two `button-name` criticals shipped by default. **103 lines of custom
CSS**, 30 of which are a scoped baseline replacement.

---

## Where Mantine wins

**Date-time range picker is native and free.** `<DateTimePicker type="range">`
(`@mantine/dates` 9.5.1): one popover, one focus trap, one calendar with range
highlighting. Zero custom lines. MUI charges for this (`@mui/x-date-pickers-pro`).

**Determinism.** Plain strings (`YYYY-MM-DD HH:mm:ss`), no timezone concept, no
`new Date()`. Eliminates the timezone bug the react-aria run hit.

**Selection.** `Select`, `MultiSelect`, `Autocomplete` — `searchable`,
`clearable`, `limit` as props. `MultiSelect` renders removable `Pill`s natively.
Zero custom lines for five requirements.

**States.** Ships `EmptyState`, `Loader`, `LoadingOverlay`, `Skeleton`. Neither
sibling demo had an empty-state component.

**Overlays.** Modal, Tooltip, Popover, Accordion ship with focus trap, Escape,
outside-click dismiss and ARIA wiring. Portalled overlays render correctly
because token values resolve at build time into `--mantine-*` at `:root`.

---

## Where it cost

### Data table: 229 custom lines

`@mantine/core`'s `Table` is **presentational only**. No sorting, selection,
filtering, pagination or column sizing.

| Requirement | Status | Lines | What Mantine gave |
| --- | --- | --- | --- |
| `table-render` | composed | 30 | markup only; row loop and `Intl` formatting are ours |
| `table-sort` | composed | 40 | nothing — comparator, `aria-sort`, header buttons are ours |
| `table-multiselect` | composed | 33 | `Checkbox` with `indeterminate`; selection logic is ours |
| `table-filter` | composed | 26 | `TextInput` and `Select`; predicate is ours |
| `table-paginate` | composed | 28 | `Pagination` (accessible pager); page state and slicing are ours |
| `table-column-resize-or-reorder` | **custom** | 72 | nothing at all |

`apps/delta-mui` got all of the above from `<DataGrid />` for **0 custom lines**.

`src/use-column-resize.ts`: pointer-drag with pointer capture, keyboard resizing
(`role="separator"`, `aria-valuenow`, arrow/PageUp/PageDown/Home). Gaps: no
live width announcements, no width persistence. Recommendation: add
`mantine-datatable` (MIT) or budget for an in-house table layer.

### Global baseline dropped

`baseline.css` is a global reset. Importing it changes **36 computed properties
across all 14 canaries** (`test-results/leakage-with-baseline.json`).
`src/demo.css` re-applies the equivalent scoped to `.demo`. Delta-mantine
measured **23** — the gap is Mangrove lacks a global `box-sizing` reset.

### Import-order trap

All Mantine classes are (0,1,0) — cascade decided by source order. Imported
alphabetically, `Button` before `UnstyledButton` rendered every button as bare
text. Build/tsc/e2e/axe passed — caught only by screenshot. Fix: derive order
from byte offsets in `@mantine/core/styles.css`. Undocumented by Mantine.

### Host collisions

Mangrove's `_form-legacy.scss` sets `input[type=text]` at (0,1,1) vs Mantine's
(0,1,0). **5 elements from 2 components** affected: `PillsInputField` (inside
`MultiSelect`) and `TimePicker`'s hour/minute fields. Two scoped rules at
(0,3,1) restore both.

### Ten shades per colour from four tokens

Mantine requires every colour as a **ten-shade tuple**. Token values are
repeated rather than interpolated. An interpolated neutral ramp put `#75838f` at
`gray-6` (`--mantine-color-dimmed`), yielding 3.9:1 on white — **five serious
`color-contrast` violations**. Pinning `gray-6` to `textSecondary` (7.4:1)
fixed all five.

### RTL

`setDirection()` writes `dir` to `document.documentElement` — outside the
candidate subtree. No scoped RTL prop. A 7-line `DirectionSync` component
handles it. `dayjs` locale files must be imported manually.

### Other gaps

- `Select`/`MultiSelect` render every option (400 DOM nodes). Virtualisation requires `Combobox` primitive.
- `NavLink` exposes only `--nl-color`/`--nl-bg`/`--nl-hover` — Mangrove's 3px accent bar is unreachable.

---

## Leakage

**14 canaries, 27 watched properties, 0 differences.** Mantine CSS loaded via
dynamic import in the `candidate=on` branch (`src/main.tsx`). e2e asserts
`--mantine-font-family` absent from `:root` on baseline load.

Unwatched mutations: `data-mantine-color-scheme="light"` and `dir` on `<html>`,
`--mantine-*` at `:root` (harmless only because `baseline.css` was omitted).

---

## Accessibility

**No conformance claimed.** Scoped: **0 violations, 0 incomplete.** Whole page:
**1 serious** (`link-in-text-block`) — the documented Mangrove baseline.

| Before | Fix |
| --- | --- |
| 2 critical `button-name` | `getControlProps` on `Pagination`, `clearButtonProps` on `clearable` inputs |
| 5 serious `color-contrast` | pinned `gray-6` to `textSecondary` |
| host `link-in-text-block` | `Anchor underline="always"` |

The column resizer (72 custom lines, no width announcements) needs manual
screen-reader testing.

---

## Theming

**62 of 71 tokens applied, 0 unreachable.** `createTheme()` maps tokens into
Mantine's theme object; `components.*.defaultProps` for z-index; CSS rules for
the focus ring. Serialised into `--mantine-*` — a build-time copy (same as MUI).

Friction: (1) ten shades per colour; (2) no focus colour in the theme — CSS
override on `.mantine-focus-auto:focus-visible` required; (3) no z-index scale
in theme — per-component `defaultProps` only route.

---

## Metrics

| | |
| --- | --- |
| Custom CSS | 103 lines, 44 selectors (30 scoped baseline, 24 host collision repair) |
| Custom behavioural code | 293 lines, 229 (78%) in the data table |
| TypeScript in `src/` | 1,410 lines across 15 files |
| Tokens applied | 62 of 71 |
| Gzipped bundle | 270.9 kB total (198.3 kB JS, 37.0 kB Mantine CSS, 35.4 kB host, 0.9 kB ours) |
| Build time | 3.58 s (Vite), 4.6 s wall |
| Dependencies | 113 installed, 21 Mantine at runtime |
| Licences | MIT 96, Apache-2.0 6, ISC 5, MPL-2.0 2, other 4. No commercial |
| Long labels | 0 px overflow at 390, 1024, 1440 |
| e2e | 48 tests, 16 per viewport, all passing |

270.9 kB vs delta-mui's 387.4 kB. Mantine ships one 242 kB stylesheet (37 kB
gzipped) regardless of usage.

---

## Comparison with delta-mantine

| | mangrove-mantine | delta-mantine |
| --- | --- | --- |
| `baseline.css` canary diffs | **36** | 23 |
| Why | No global reset | Tailwind Preflight supplies it |
| Import-order trap | hit | hit, same symptom |
| Native `type="range"` | confirmed | confirmed |
| Host collisions | 2 components, 5 elements | Preflight strips rather than imposes |

---

## Shared packages

Not modified. `checkLeakage` cannot detect leakage from a statically imported
stylesheet — this run works around it with a dynamic import in `main.tsx`.
