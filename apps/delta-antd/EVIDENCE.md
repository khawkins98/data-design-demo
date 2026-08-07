# delta-antd

Ant Design 6.5.3 inside the Delta host shell (Tailwind CSS 4, including
Preflight). Structured record in `evidence.json`.

## Headline

28 of 30 requirements met `native` (highest count; MUI 26, Carbon 19). One
`composed` (section 9, assembled by definition), one `custom` (column sizing --
same gap as Mantine).

## The date-time range picker

`datetime-range-picker` is `native`:

```tsx
<DatePicker.RangePicker showTime={{ format: "HH:mm" }} ... />
```

One component, free package. Every other candidate composed this. A real range
picker makes "end cannot precede start" the component's problem rather than
per-site application code.

The e2e assertion counts `.ant-picker-range`, not inputs (`RangePicker` renders
two inputs, indistinguishable from MUI's composed two-picker version).

## RTL

`rtl` is `native`; every other candidate recorded `composed`.
`ConfigProvider direction="rtl"` flips components via `.ant-form-rtl`,
`.ant-input-rtl`, `.ant-table-rtl` and `.ant-btn-rtl` (all asserted). MUI
Community cannot meet this without `stylis-plugin-rtl` (forbidden by
constraint 2); without it, floating labels stay pinned left by up to 870px.

## The CSS layer

`StyleProvider layer` wraps every antd rule in a CSS `@layer` -- the only
first-class containment mechanism among the five candidates. Tailwind 4 compiles
Preflight into `@layer base` (five `@layer` at-rules in
`packages/host-delta/dist/host-delta.css`), so both sides are layered and antd's
later layer wins.

Measured: antd keeps its 1px border, 40px height (`controlHeight`), 4px radius;
primary button renders `rgb(47, 111, 143)` (UNDRR accent). **Zero host-repair
CSS needed.** Opposite outcome on `apps/mangrove-antd` (Mangrove 1.8.1 ships no
`@layer`; see its EVIDENCE.md).

## Theming

`ConfigProvider` takes **seed** tokens; antd derives ~100 alias tokens. 71 UNDRR
tokens map onto 44 antd inputs without loss (`colorPrimary` produces hover,
active, border and background variants). JavaScript object resolved at build
time: **a token change means rebuilding every consuming site**. antd 6's `cssVar`
mode would make it live but emits properties at `:root`, defeating containment.

### The seeds do not carry contrast

antd derives secondary, description, placeholder and label greys from
`colorTextBase` by lowering opacity. This produced **four axe colour-contrast
failures** from a palette whose own secondary text passes at 7.3:1.

`colorTextDescription`, `colorTextPlaceholder`, `colorTextHeading` and
`colorTextLabel` had to be pinned to token values by hand.
`colorTextSecondary` and `colorTextTertiary` are not in antd's alias interface
and cannot be set by name. `Menu.itemSelectedColor` needed the same fix, and
status tags were moved off antd's `green`/`gold`/`red` presets onto the UNDRR
palette.

"Set the seeds and everything follows" is true for hue, false for contrast. A
deployment needs an audit of any component whose colour is not explicitly set.

## Column sizing is custom

antd 6.5.3 has no column sizing. No `resizable` on `ColumnType`; the `resize`
matches in `@rc-component/table` are `ResizeObserver` for sticky headers, not
column sizing. antd's documentation reaches for `react-resizable`, which
`docs/requirements.md` forbids.

`packages/integration-antd/src/use-column-resize.ts`: 95 lines, rendered through
the documented `components.header.cell` extension point. Keyboard-operable (a
pointer-only grip is a WCAG 2.1.1 failure) and RTL-aware.

## Accessibility

Four violations became one. **Two of the four were critical and both were ours:**

1. `Form.Item label=...` does **not** associate the label with its control unless
   the item also has a `name` (antd uses `name` to generate the `for`/`id`
   pair). Every field needs an explicit `htmlFor` plus a matching `id`.
2. A focusable `role="separator"` requires `aria-valuenow`, `aria-valuemin` and
   `aria-valuemax`. The resize grip had none.

The remaining violation is antd's, not fixable through the public API:
`aria-hidden-focus` on `.ant-table-measure-row`. rc-table renders that row with
`aria-hidden="true"` when `scroll.x` is set, and `rowSelection` puts a focusable
checkbox inside it. Should be reported upstream.

## Global reset

`antd/dist/reset.css` is **not** imported (writes to `html`, `body` and `*`).

Measured via `scripts/probe-global-reset.mjs` (raw result in
`test-results/global-reset-probe.json`): injecting it changes **40 watched
computed properties across all 14 host canaries**, rewriting heading
`font-family`, `font-weight` and margins.

antd renders correctly without the reset -- `@ant-design/cssinjs` emits
self-contained component styles; all 39 e2e assertions pass and axe reports zero
critical violations with it omitted. The reset is smaller than Carbon's (79
differences) but not harmless.

## Overlays

antd portals overlays to `document.body`; UNDRR tokens scoped to `.undrr-tokens`
do not reach portals. `ConfigProvider` takes `getPopupContainer`, mounting all
overlay types inside the candidate subtree from one prop -- simpler than the
per-overlay class-juggling React Aria and Mantine needed.

Trade-off: overlays inside the subtree are subject to that subtree's `overflow`
and stacking context.

## Traps

- `optionFilterProp="label"` is required on a searchable `Select`. antd filters
  on `value` by default, and the fixture values are slugs while the labels carry
  the translated text, so without it a search over these fixtures silently
  matches almost nothing.
- `Segmented` renders a visually-hidden radio inside a `<label>`, so
  `getByRole("radio").click()` times out. Tests must click antd's own
  `title`-bearing label element.
- `#section-6 tbody input[type=checkbox]` returns **eleven**, not ten, because
  rc-table renders a hidden measure row when `scroll.x` is set. The assertion is
  scoped to `tr[data-row-key]`.

## Dependencies

68 production packages, **all MIT**. No font licences, no install-time telemetry
(cf. Carbon, issue #8). ~47 direct dependencies, nearly all `@rc-component/*`
under one org.

Measured by `scripts/count-dependencies.mjs` (all ten apps, one method). Per-run
`bundle.dependencyCount` values from earlier runs are **not** comparable across
candidates (Mantine recorded 112 vs. production count of 27).

## Reproducibility

Built shared-first: `packages/integration-antd` holds the host-independent code
and both antd apps consume it (change of method after the MUI extraction; axis
A3, `docs/decision-axes.md`).

Caveat: building shared-first could flatter the result. Host-specific code was
pushed out to the consuming app, never absorbed into the package. Each app owns
`main.tsx`, `App.tsx`, `demo.css` and `sections/SectionSideBySide.tsx` only.

868 shared lines vs. 248 per site (115 of which is `SectionSideBySide`, an
evaluation-only section). Excluding it, 86% is shared.

`demo-state.ts` is byte-identical to `integration-mui`'s copy -- candidate- and
host-independent, belongs in the scaffold, left duplicated to avoid churning six
other apps. That duplication is itself an A3 finding.
