# mangrove-antd

Ant Design 6.5.3 on the Mangrove host (`@undrr/undrr-mangrove@1.8.1`).
Structured record: `evidence.json`.

## Cascade-layer override

**antd's controls render identically to Mangrove's controls.**

`StyleProvider layer` wraps every antd rule in a CSS `@layer`. Mangrove 1.8.1
contains **zero** `@layer` at-rules (verified by grep). Unlayered CSS beats
layered CSS regardless of specificity, so Mangrove's element-level rules:

```css
input[type=text],textarea{appearance:none;border:2px solid #1a1a1a;
  border-radius:0;box-sizing:border-box;display:block;
  font-family:Roboto,sans-serif;font-size:1rem;height:46px;...}
```

win outright over antd's `.ant-input`. Measured on a section-1 field:

| property | antd on Mangrove | a bare Mangrove input |
| --- | --- | --- |
| `border-top-width` | 2px | 2px |
| `border-top-color` | `rgb(26, 26, 26)` | `rgb(26, 26, 26)` |
| `height` | 46px | 46px |
| `border-radius` | 0px | 0px |
| `font-family` | `Roboto, sans-serif` | `Roboto, sans-serif` |

The comparison column is a bare `<input type="text">` injected at measurement
time. The `controlHeight` and `borderRadius` seed tokens do not reach the control.

**Zero lines of host-repair CSS were written.** `mangrove-mui` needed 27 lines of
`demo.css` to neutralise these same Mangrove rules; here nothing was needed.

Consequences:

1. **The two antd pairings do not look alike.** Compare
   `apps/delta-antd/screenshots` with `apps/mangrove-antd/screenshots` at the same
   viewport. No conclusion from one host transfers to the other.
2. **If Mangrove 2.0 adopts cascade layers, the override inverts** -- antd would
   start winning conflicts. Tracked in issue #4.

On Delta, the same setting is invisible because Tailwind 4 compiles Preflight into
`@layer base`, so both sides are layered and antd's later layer wins normally.

## Theming

71 UNDRR tokens map onto 44 antd seed inputs without loss. Setting `colorPrimary`
derives hover, active, border and background variants automatically. Resolved at
bundle time -- **a token change means rebuilding every consuming site**. `cssVar`
mode would make it live but puts antd's palette in the host's global scope; left
off.

Mangrove 1.8.1 declares **zero** CSS custom properties (`docs/host-derivation.md`
finding 1). The project tokens carry its current UNDRR interactive palette, but
antd consumes a separately maintained mapping rather than inheriting future
changes from Mangrove at runtime.

### Seed tokens do not carry contrast

antd derives secondary/description/placeholder/label greys from `colorTextBase`
by lowering opacity, producing **four axe colour-contrast failures** from a
palette whose own secondary text passes at 7.3:1. `colorTextDescription`,
`colorTextPlaceholder`, `colorTextHeading` and `colorTextLabel` were pinned to
token values. `colorTextSecondary` and `colorTextTertiary` are not in antd's alias
interface. `Menu.itemSelectedColor` and status tags also needed manual pinning.

## Date-time range picker

`datetime-range-picker` is `native`: `<DatePicker.RangePicker showTime />`, one
component in the free package. Every other candidate composed it. antd handles
the "end cannot precede start" ordering guarantee internally.

The e2e assertion counts `.ant-picker-range` rather than inputs, because a
`RangePicker` renders two inputs.

## RTL

`native`, from `ConfigProvider direction="rtl"`. `.ant-form-rtl`, `.ant-input-rtl`,
`.ant-table-rtl` and `.ant-btn-rtl` all appear and are asserted. MUI Community
cannot meet this requirement without `stylis-plugin-rtl` (forbidden by
constraint 2).

## Column sizing

antd has no column sizing. `packages/integration-antd/src/use-column-resize.ts` is
ours (95 lines), rendered through the `components.header.cell` extension point.
Includes keyboard operation (WCAG 2.1.1). Same gap Mantine had.

## Accessibility

Four violations became one. Two critical ones were ours:

1. `Form.Item label=...` requires a `name` (or explicit `htmlFor`/`id`) to
   associate label with control.
2. The resize grip (`role="separator"`) lacked `aria-valuenow`/`valuemin`/`valuemax`.

Remaining violation: `aria-hidden-focus` on `.ant-table-measure-row`. rc-table
sets `aria-hidden="true"` when `scroll.x` is set, while `rowSelection` puts a
focusable checkbox inside it. Not reachable through the public API.

Whole-page axe reports **2** violations. The extra is Mangrove's own baseline link
rule (`docs/requirements.md`), not antd's.

## Global reset

`antd/dist/reset.css` is not imported. Injecting it changes **9 watched properties
across 3 of 14 host canaries** (vs. 40 differences on Delta). Mangrove's unlayered
element rules already out-specify most of antd's reset. Non-zero, so the documented
setup is still not loadable as-is. Carbon's prebuilt stylesheet: 79 differences.

## Overlays

antd portals overlays to `document.body`; UNDRR tokens scoped to `.undrr-tokens`
do not cross the portal. `ConfigProvider`'s `getPopupContainer` mounts all three
overlay types inside the candidate subtree from one prop. Trade-off: contained
overlays are subject to the subtree's `overflow` and stacking context.

## Leakage

Clean: 14 canaries, 27 watched properties, zero differences. `@layer` containment
means antd cannot win a conflict against the host even where its selectors are more
specific. No static stylesheet is shipped (`reset.css` omitted; everything else is
runtime-injected).

## Section 9 and the `mg-` classes

Host column uses: `mg-button`, `mg-button-primary`, `mg-table`,
`mg-table--striped`, `mg-card`, `mg-card__content`. All six verified present in
the published 1.8.1 stylesheet. A unit test forbids unaccounted-for `mg-` classes.

The remaining visual gap comes from Mangrove's opinionated structure — square
corners, heavy borders and typography. Its current interactive colours can match,
but 1.8.1 exposes nothing at runtime to keep that match synchronized.

## Dependencies

69 production packages: 68 MIT + 1 Apache-2.0 (Mangrove itself). No font licences,
no install-time telemetry (cf. Carbon's 21 packages, issue #8). Measured by
`scripts/count-dependencies.mjs` across all ten apps.

## Reproducibility

Built shared-first: `packages/integration-antd` holds the host-independent part;
both apps consume it (axis A3, `docs/decision-axes.md`). This app owns `main.tsx`,
`App.tsx`, `demo.css` and `sections/SectionSideBySide.tsx`.

868 shared lines vs. 242 here (103 is `SectionSideBySide`, evaluation-only).
Excluding it, 86% is shared.

This app's `demo.css` contains zero rules undoing Mangrove's element-level styling,
where `mangrove-mui` needed four rules across 27 lines.
