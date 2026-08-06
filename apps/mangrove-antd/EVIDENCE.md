# mangrove-antd

Ant Design 6.5.3 inside the Mangrove host shell, against the real published
`@undrr/undrr-mangrove@1.8.1` stylesheet.

Read `evidence.json` for the structured record. This file is the reasoning behind
it.

## The finding, first

**On this host, antd's controls render as Mangrove's controls.** Not approximately
- identically.

`StyleProvider layer` wraps every antd rule in a CSS `@layer`. Mangrove 1.8.1's
published stylesheet contains **zero** `@layer` at-rules (verified by grep against
the installed tarball). Unlayered CSS beats layered CSS regardless of specificity.

So Mangrove's

```css
input[type=text],textarea{appearance:none;border:2px solid #1a1a1a;
  border-radius:0;box-sizing:border-box;display:block;
  font-family:Roboto,sans-serif;font-size:1rem;height:46px;...}
```

wins outright over antd's `.ant-input`, and it is not close. Measured on a
section-1 field:

| property | antd on Mangrove | a bare Mangrove input |
| --- | --- | --- |
| `border-top-width` | 2px | 2px |
| `border-top-color` | `rgb(26, 26, 26)` | `rgb(26, 26, 26)` |
| `height` | 46px | 46px |
| `border-radius` | 0px | 0px |
| `font-family` | `Roboto, sans-serif` | `Roboto, sans-serif` |

The comparison column is a bare `<input type="text">` injected into the same page
at measurement time, so this is not an eyeball judgement. The `controlHeight` and
`borderRadius` seed tokens do not reach the control at all.

## Why that matters more than it looks

**Zero lines of host-repair CSS were written.** The `mangrove-mui` run needed 27
lines of `demo.css` to neutralise those *same* Mangrove rules and keep MUI looking
like MUI - a 4-rule block against `.MuiOutlinedInput-input` and
`.MuiInputBase-input`, at (0,2,0) to out-specify Mangrove's (0,1,1).

Here nothing was written, and the control looks like the design system.

That is either the point or the problem, and which one it is **is a decision for
UNDRR, not a defect for this evaluation to fix**:

- If UNDRR wants the Mangrove look and feel to win by default across many sites,
  this is the strongest mechanism found anywhere in this evaluation. It is one
  prop, it needs no per-component work, it cannot drift, and it costs nothing to
  maintain.
- If UNDRR wants the UNDRR token mapping to be authoritative over the host, it is
  a problem, because no token reaches any control Mangrove styles by element.

It is reversible per site by dropping `layer`, which is precisely why the choice
belongs to UNDRR rather than being made here.

Two consequences to carry forward:

1. **The two antd pairings do not look alike, and that is expected.** Compare
   `apps/delta-antd/screenshots` with `apps/mangrove-antd/screenshots` at the same
   viewport to see what `layer` does. No conclusion drawn from one host's
   screenshots transfers to the other.
2. **If Mangrove 2.0 adopts cascade layers, this inverts** and antd would start
   winning conflicts against the host. That should be checked against the 2.0
   branch before either decision is locked in. Tracked in repository issue #4.

On the Delta host the same setting is invisible, because Tailwind 4 compiles
Preflight into `@layer base` - five `@layer` at-rules - so both sides are layered
and antd's later layer wins normally.

## Theming

A `ConfigProvider` object of **seed** tokens, from which antd derives roughly 100
alias tokens: 71 UNDRR tokens map onto 44 antd inputs without loss, because
setting `colorPrimary` produces the hover, active, border and background variants
MUI and Mantine each need told separately.

Resolved at bundle time, so **a token change means rebuilding every consuming
site**. `cssVar` mode would make it live but emits antd's own custom properties on
a `:root`-level selector, putting antd's palette in the same global scope as the
host - deliberately left off, trade recorded.

A further caveat specific to this host: Mangrove 1.8.1's compiled stylesheet
declares **zero** CSS custom properties (`docs/host-derivation.md` finding 1), so
its palette is unreachable at runtime. antd could not be themed against
Mangrove's own values even if the layer order allowed it. It is themed to the
neutral UNDRR tokens instead.

### A finding: the seeds do not carry contrast

antd derives its secondary, description, placeholder and label greys from
`colorTextBase` by lowering opacity, and that produced **four axe colour-contrast
failures** from a palette whose own secondary text passes at 7.3:1.
`colorTextDescription`, `colorTextPlaceholder`, `colorTextHeading` and
`colorTextLabel` were pinned back to token values; `colorTextSecondary` and
`colorTextTertiary` are not in antd's alias interface and cannot be set by name.
`Menu.itemSelectedColor` needed the same, and the status tags were moved off
antd's presets onto the UNDRR palette.

"Set the seeds and everything follows" is true for hue and false for contrast.

## The date-time range picker

`datetime-range-picker` is `native`: `<DatePicker.RangePicker showTime />`, one
component in the free package, verified against antd 6.5.3's own types.

Every other candidate composed it - MUI because the real range picker is behind
`@mui/x-date-pickers-pro`, React Aria and Carbon because they have none. What antd
removes is the *ordering guarantee*: "end cannot precede start" becomes the
component's problem instead of application code maintained on every site.

The e2e assertion counts `.ant-picker-range` rather than inputs, because a
`RangePicker` renders two inputs and an input count would read identically to the
composed two-picker version.

## RTL

`native`, from `ConfigProvider direction="rtl"`. No build plugin, no
logical-property rewriting of ours: `.ant-form-rtl`, `.ant-input-rtl`,
`.ant-table-rtl` and `.ant-btn-rtl` all appear and are asserted. This is the
requirement MUI Community cannot meet at all, since `stylis-plugin-rtl` is
forbidden by constraint 2 and without it MUI's floating labels sit up to 870px
from their fields.

## Column sizing is ours

antd has no column sizing of any kind: no `resizable` on `ColumnType`, nothing in
`@rc-component/table` (the `resize` matches there are `ResizeObserver` for sticky
headers and cell measurement). antd's docs reach for `react-resizable`, which
`docs/requirements.md` forbids.

`packages/integration-antd/src/use-column-resize.ts` is ours - 95 lines, rendered
through the documented `components.header.cell` extension point. Keyboard
operation is deliberate: a pointer-only grip is a WCAG 2.1.1 failure dressed as a
met requirement, and React Aria's native equivalent is keyboard-operable. Same gap
Mantine had.

## Accessibility

Four violations became one. **Two of the four were critical and both were ours:**

1. `Form.Item label=...` does not associate the label with its control unless the
   item has a `name`, since that is what antd generates the `for` target from.
   Rendering fixture states means there is no `name`, so every field needs an
   explicit `htmlFor` and matching `id`. Without it every input reports a critical
   `label` violation.
2. A focusable `role="separator"` is an ARIA widget and requires
   `aria-valuenow`/`valuemin`/`valuemax`. The resize grip had none.

The remaining violation is antd's and is not reachable through the public API:
`aria-hidden-focus` on `.ant-table-measure-row`. rc-table renders that row with
`aria-hidden="true"` whenever `scroll.x` is set, while `rowSelection` puts a
focusable checkbox inside it - verified in the DOM, two focusable descendants
under `aria-hidden="true"`. Row selection plus a horizontally scrolling table is
an ordinary combination, so it will affect any real UNDRR table.

Whole-page axe reports **2** violations rather than 1. The extra is Mangrove's own
baseline link rule, a known host violation recorded in `docs/requirements.md`, not
antd's.

## The documented global reset

`antd/dist/reset.css` is not imported. Measured with
`scripts/probe-global-reset.mjs` rather than asserted: injecting it changes **9
watched properties across 3 of the 14 host canaries** here.

That is far less than the 40 differences across all 14 it causes on Delta, and the
reason is the same mechanism as the headline finding: Mangrove's own unlayered
element rules already out-specify most of antd's reset. Non-zero either way, so
the documented setup is still not loadable as-is.

For scale, Carbon's prebuilt stylesheet measured 79 differences across all 14.

## Overlays

antd portals overlays to `document.body`, so the token-scope trap applies: the
UNDRR tokens are scoped to `.undrr-tokens` rather than `:root` deliberately, and
custom properties do not cross a portal through React context.

`ConfigProvider`'s `getPopupContainer` mounts all three overlay types inside the
candidate subtree from one prop on the provider - better than the per-overlay
class the React Aria and Mantine runs needed. The trade is that contained overlays
are subject to the subtree's `overflow` and stacking context.

## Leakage

Clean: 14 canaries, 27 watched properties, zero differences.

The `@layer` containment makes that stronger than a pass alone suggests - antd
cannot win a conflict against the host even where its selectors are more specific.
antd also ships no static stylesheet here at all, since `reset.css` is omitted and
everything else is runtime-injected.

The documented KNOWN LIMITATION in `packages/test-harness/src/leakage.ts` still
applies: statically imported stylesheets are invisible to the check. It happens to
be moot for this pairing.

## Section 9 and the `mg-` classes

The host column uses Mangrove's own classes: `mg-button`, `mg-button-primary`,
`mg-table`, `mg-table--striped`, `mg-card` and `mg-card__content`.

All six were verified present in the published 1.8.1 stylesheet before use, with
occurrence counts, because an earlier run of this evaluation invented `mg-`
classes that do not exist and published them. A unit test now forbids
unaccounted-for `mg-` classes.

The gap between the columns is wider here than on Delta. Mangrove is a strongly
opinionated visual system - square corners, heavy borders, Roboto, a specific blue
- and antd is themed to the neutral UNDRR palette because 1.8.1 exposes nothing at
runtime. That is the finding, and it is why the section is screenshotted rather
than described.

## Dependencies

69 production packages: 68 MIT plus one Apache-2.0, which is the Mangrove package
itself. No font licences, and nothing equivalent to the install-time telemetry in
21 Carbon and IBM Plex packages (issue #8).

The figure comes from `scripts/count-dependencies.mjs`, which measures all ten
apps by one method. The per-run figures in other apps' `evidence.json` were each
measured differently and reorder the candidates, so only the
consistently-measured column is safe to compare across rows.

## Reproducibility

Built shared-first: `packages/integration-antd` held the host-independent part
from the start and both apps consume it (axis A3, `docs/decision-axes.md`).

The honest caveat is that building it this way could flatter the result. Any
host-specific need was pushed **out** to the app and counted there. This app owns
`main.tsx`, `App.tsx`, `demo.css` and `sections/SectionSideBySide.tsx`.

868 shared lines against 242 here, of which 103 is `SectionSideBySide` - which
exists only because this is an evaluation. Excluding it, 86% is shared.

Note what is **not** in this app's `demo.css`: a single rule undoing Mangrove's
element-level input, label or legend styling, where `mangrove-mui` needed four
rules across 27 lines to fight exactly those. Cheap per-site cost and loss of
control over appearance are the same fact seen from two sides.
