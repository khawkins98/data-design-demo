# Evidence: Mantine 9.5.1 on the Delta host

Structured record in `evidence.json`. This is the prose.

**Summary.** Of 30 requirements: **20 native, 7 composed, 3 custom, 0
unsupported**, for 411 custom lines (339 in section 6 alone). Leakage clean
when `baseline.css` is excluded. Scoped axe: 0 violations, 1 incomplete.
Long labels clean at every viewport.

---

## The date-time range: native and free

`<DateTimePicker type="range">` (new in 9.x) renders one calendar with both
endpoints highlighted, two time fields, one popover and one focus trap --
equivalent to what `@mui/x-date-pickers-pro` charges a per-developer seat for,
under MIT. Verified: `e2e/demo.spec.ts` asserts one `<table>` calendar, two
range time inputs and more than ten `[data-in-range="true"]` days.

---

## The data table: absent

`@mantine/core`'s `Table` provides spacing, striping, hover highlight, sticky
header and `tabular-nums` -- no sorting, filtering, pagination, row selection,
or column sizing. `mantine-datatable` (third-party) not installed per Brief 1
rules. Section 6 required **339 lines of application code** vs. six props / 0
custom lines in the `delta-mui` run.

`Pagination` and `EmptyState` are complete native components that neither React
Aria nor MUI Community ships.

---

## Theming

Both halves of Mantine's theming API are needed:

1. `createTheme()` -- emits `--mantine-*` custom properties into a `<style>` tag.
2. `cssVariablesResolver` -- sets variables with no slot on the theme object
   (`--mantine-color-text`, `--mantine-color-dimmed`, etc.).

**66 of 71 tokens applied. 5 unreachable:** z-index `base`, `raised`, `sticky`,
`header` and `toast`. Mantine has no theme-level z-index scale; overlay
components take individual `zIndex` props.

### Structural mismatch: Mantine wants a 10-step ramp

`theme.colors[name]` requires `MantineColorsTuple` -- **ten shades**. The UNDRR
token set is semantic (one accent, one hover, one active, one subtle tint), not a
scale. `tuple()` in `src/theme.ts` repeats values to fill the slots.
`variantColorResolver` pins rendered output to exact token values. **A design
system adopting Mantine must publish a ten-step ramp per colour, or accept that
six tenths of its palette is invented at the integration layer.**

### cssVariablesResolver specificity trap

`cssVariablesResolver` returns three buckets: `variables` at `:root, :host`
(0,1,0), and `light`/`dark` at `[data-mantine-color-scheme="..."]` (0,1,1).
Mantine's own `default-css-variables.css` uses scheme blocks (0,1,1), so
overrides in `variables` (0,1,0) lose. Fix: put every scheme-dependent variable
in both scheme buckets.

Silent failure: build succeeds, values read back correctly, but Mantine's
defaults win at computed time. axe caught it via contrast failures on `#868e96`
and `#fa5252` instead of UNDRR values. **A Mantine theme can look applied and
not be.**

---

## Style leakage

**As shipped: 14 canaries, 0 differences.**

**With Mantine's documented stylesheet import: 23 differences across all 14
canaries.**

| Property | Canaries affected | Example |
| --- | --- | --- |
| `font-family` | 14 | host's `-apple-system, system-ui, ...` becomes `Roboto, Noto Sans Arabic, ...` |
| `line-height` | 9 | `nav` goes from `24.8px` to `24px` |

Cause: `baseline.css` (inside `@mantine/core/styles.css`) writes five inherited
declarations on `body`. **Mitigation:** `src/mantine-styles.css` imports 98
per-component stylesheets individually plus `default-css-variables.css` and
`global.css`. Neither writes to `body`. Components then rely on the host's
Tailwind Preflight for resets; on a host without Preflight these would differ.

**Import order matters.** Mantine's component styles are single-class selectors
of equal specificity. `Button` composes `UnstyledButton`; alphabetical ordering
puts `UnstyledButton.css` last, breaking every button. Order in
`src/mantine-styles.css` is lifted from Mantine's own `styles.css`.

Preflight's element selectors (0,0,1) lose to Mantine's single-class rules
(0,1,0). Both are unlayered. No collision observed.

---

## Portalled overlays

Mantine emits `--mantine-*` at `:root, :host`, so they reach portals at
`document.body`. All four overlays (Select, Popover, Modal, DateTimePicker)
verified correct in `test-results/overlays-desktop.json`.

`var(--undrr-*)` does **not** reach portals because `packages/undrr-tokens`
scopes to `.undrr-tokens`. `portalProps` carries the token scope class onto each
portal container. Mantine's theme can be changed at runtime without a rebuild
(unlike MUI's build-time-inlined theme).

**RTL inside portals.** Portals resolve direction from `<html>` (`ltr`), not
the host's `dir="rtl"` wrapper. Two mitigations: `usePortalProps()` adds
`demo-portal--rtl` on mount; an effect in `App.tsx` stamps `dir` after locale
changes. `reuseTargetNode: false` required because the default shared container
inherits className from whichever overlay mounts first.

---

## Accessibility

Scoped to candidate subtree: **0 violations, 0 critical, 1 incomplete.**
Whole page: also 0/1. Delta host baseline is 0.

**Fixed before shipping:** `button-name` (critical, 5 nodes) --
`Pagination` edge controls and `InputClearButton` ship with no `aria-label`;
fixed via `getControlProps` and `clearButtonProps`. `color-contrast` (serious,
22 nodes) -- caused by the `cssVariablesResolver` specificity bug (see Theming).

### Needs human review

- `color-contrast` incomplete on one element in section 6.
- Hand-built table: no roving tabindex, cell navigation, or selection
  announcement. Column resize uses `role="separator"` (window-splitter pattern).
- Arabic range picker formatted value shows endpoints visually reversed (bidi).
- 400-option `Select` walks the full list on every keystroke. No virtualisation.

---

## Metrics

| | |
| --- | --- |
| Custom CSS | 72 lines, 17 selectors (`src/demo.css`) |
| Generated CSS | `src/mantine-styles.css`: 98 `@import`s, 0 rules of our own |
| Overrides library internals | yes -- 3 selectors reach `.mantine-*` class names |
| Wrappers | 4 (`useColumnResize`, `useSelection`, `usePortalProps`, `toData`) |
| Custom behaviour code | 160 lines in `src/table-model.ts` |
| Tokens applied | 66 of 71 |
| Tokens unreachable | 5 (z-index base, raised, sticky, header, toast) |
| Gzipped bundle | 238.8 kB (40.9 CSS + 197.5 JS + 0.3 baseline probe) |
| Dependency count | 112 unique packages, whole tree including tooling |
| Build time | 2.0--3.2 s across three runs |
| Playwright | 51 tests, 3 viewports, all passing |
| Long labels (German) | 0 px horizontal overflow at 390, 1024 and 1440 |

For comparison, `delta-mui` measured 387.4 kB gzipped over 142 packages. Mantine
is smaller, but the MUI number includes a data grid; 339 lines of table code is
the trade-off.

---

## What a reviewer should not take on trust

- Range picker drag-to-select not driven in tests; verified by rendered value
  and `[data-in-range]` days only.
- Same-day time-inversion check in `SectionDates.tsx` reachable by typing but
  not tested.
- Pointer-drag column resize not exercised -- only keyboard. RTL delta inversion
  in `useColumnResize` unverified.
- `tokensApplied: 66` counts values reaching generated CSS. Twelve are spacing
  steps; Mantine only consumes `xs`--`xl`. Read as "reachable", not "consumed".
- `EmptyState` and `DataList` are new in Mantine 9; API stability unknown.
