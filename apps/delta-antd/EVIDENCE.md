# delta-antd

Ant Design 6.5.3 inside the Delta host shell (Tailwind CSS 4, including
Preflight).

Read `evidence.json` for the structured record. This file is the reasoning behind
it.

## Headline

Ant Design met 28 of the 30 requirements with a single documented component
each - the highest `native` count in the evaluation, against MUI's 26 and
Carbon's 19. One requirement was `composed` (section 9, which is assembled by
definition) and one was `custom`.

The single `custom` requirement is column sizing, and it is the same gap Mantine
had. Everything else came out of the box, including the two requirements that
separated the field elsewhere: a real date-time range picker, and RTL.

## The date-time range picker

`datetime-range-picker` is `native`:

```tsx
<DatePicker.RangePicker showTime={{ format: "HH:mm" }} ... />
```

One component, in the free package. `showTime` was verified against antd 6.5.3's
own `@rc-component/picker` types before it was used, not assumed.

Every other candidate composed this. MUI's real range picker lives in
`@mui/x-date-pickers-pro` behind a commercial licence, so the MUI runs render two
separate pickers plus a `minDateTime` cross-reference to stop the end preceding
the start. React Aria and Carbon composed it too. What antd removes is not the
markup, it is the *ordering guarantee*: with a real range picker, "end cannot
precede start" is the component's problem rather than application code somebody
has to maintain on every site.

The e2e assertion counts `.ant-picker-range`, not inputs. A `RangePicker` renders
two inputs, so an input count would read identically to MUI's composed
two-picker version and would prove nothing.

## RTL

`rtl` is recorded `native` where every other candidate recorded `composed`.
`ConfigProvider direction="rtl"` is one documented prop, and antd flips its own
components from it: `.ant-form-rtl`, `.ant-input-rtl`, `.ant-table-rtl` and
`.ant-btn-rtl` are all present and asserted.

This is the requirement MUI Community cannot meet at all. MUI needs
`stylis-plugin-rtl`, which constraint 2 forbids, and without it its floating
labels stay pinned to the physical left by up to 870px. Arabic is one of the four
fixture locales, so that is not a cosmetic difference.

## The CSS layer, and why this host hides it

`StyleProvider layer` wraps every antd rule in a CSS `@layer`. It is antd's own
containment mechanism and the only first-class one among the five candidates.

Unlayered CSS beats layered CSS regardless of specificity. On **this** host that
is invisible, because Tailwind 4 compiles Preflight into `@layer base` - five
`@layer` at-rules in `packages/host-delta/dist/host-delta.css` - so host and
candidate are both layered and antd's later layer wins normally.

Measured on a section-1 field: antd keeps its own 1px border, 40px height (the
`controlHeight` seed token) and 4px radius, and the primary button renders
`rgb(47, 111, 143)`, which is the UNDRR accent token. The theme is in charge.

**Zero lines of host-repair CSS were needed.**

Do not carry that conclusion to the other host. `apps/mangrove-antd` has the same
`layer` setting and the opposite outcome, because Mangrove 1.8.1 ships no
`@layer` at all. Read its EVIDENCE.md before drawing any conclusion about antd's
appearance.

## Theming

A `ConfigProvider` theme object of **seed** tokens, from which antd derives
roughly 100 alias tokens. That is why 71 UNDRR tokens map onto 44 antd inputs
without loss: setting `colorPrimary` produces the hover, active, border and
background variants that MUI and Mantine each have to be told separately.

Like MUI's `createTheme`, this is a JavaScript object resolved when the bundle is
built, so **a token change means rebuilding every consuming site**. antd 6 does
have a `cssVar` mode that would make it live, but enabling it emits antd's own
custom properties on a `:root`-level selector, which would put antd's palette in
the same global scope as the host and defeat the containment this evaluation
measures. It was deliberately left off and the trade is recorded rather than
taken quietly.

### A finding: the seeds do not carry contrast

antd derives its secondary, description, placeholder and label greys from
`colorTextBase` by lowering opacity. That derivation produced **four axe
colour-contrast failures** from a palette whose own secondary text passes at
7.3:1.

`colorTextDescription`, `colorTextPlaceholder`, `colorTextHeading` and
`colorTextLabel` had to be pinned back to the token values by hand.
`colorTextSecondary` and `colorTextTertiary` are not in antd's alias interface at
all and cannot be set by name. `Menu.itemSelectedColor` needed the same
treatment, and the status tags were moved off antd's `green`/`gold`/`red` presets
onto the UNDRR palette - which was a theming correction as much as an
accessibility one, since the presets were antd's hues rather than UNDRR's.

So "set the seeds and everything follows" is true for hue and false for contrast.
A real deployment needs an audit of any component whose colour is not explicitly
set, not trust in the seed layer.

## Column sizing is ours

antd 6.5.3 has no column sizing of any kind. There is no `resizable` on
`ColumnType`, and nothing in `@rc-component/table` provides it - the `resize`
matches in that package are `ResizeObserver` for sticky headers and cell
measurement, not column sizing. antd's own documentation reaches for
`react-resizable`, and `docs/requirements.md` forbids substituting a third-party
package for a missing capability.

So `packages/integration-antd/src/use-column-resize.ts` is ours: 95 lines,
rendered through the documented `components.header.cell` extension point so no
antd internal is touched.

Keyboard operation is included deliberately, not as a nicety. A pointer-only grip
is a WCAG 2.1.1 failure presented as a met requirement, and React Aria's native
`ColumnResizer` is keyboard-operable, so a mouse-only version here would have
made the comparison flattering rather than fair. RTL direction handling is in
there too, because the pointer moves the opposite way relative to the column
edge.

## Accessibility

Four violations became one. **Two of the four were critical and both were ours**,
which is worth recording plainly:

1. `Form.Item label=...` does **not** associate the label with its control unless
   the item also has a `name`, because `name` is what antd uses to generate the
   id it points `for` at. Rendering fixture states rather than collecting input
   means there is no `name` to give, so every field needs an explicit `htmlFor`
   plus a matching `id`. Without it axe reports a critical `label` violation on
   every input, which is what the first run of section 1 did.
2. A focusable `role="separator"` is an ARIA **widget**, not a decoration, so it
   requires `aria-valuenow`, `aria-valuemin` and `aria-valuemax`. The resize grip
   had none.

The one remaining violation is antd's, and it is not fixable through the public
API. `aria-hidden-focus` on `.ant-table-measure-row`: rc-table renders that row
with `aria-hidden="true"` whenever `scroll.x` is set, and `rowSelection` puts a
focusable checkbox inside it. Verified in the DOM - `aria-hidden="true"`, two
focusable descendants. Row selection plus a horizontally scrolling table is an
ordinary combination, so this will affect any real UNDRR table. It should be
reported upstream.

## The documented global reset

`antd/dist/reset.css` is **not** imported, for the same reason MUI's
`CssBaseline` and Carbon's prebuilt stylesheet were omitted: it writes to `html`,
`body` and `*`.

This was measured rather than assumed - `scripts/probe-global-reset.mjs`, raw
result in `test-results/global-reset-probe.json`. Injecting it changes **40
watched computed properties across all 14 host canaries**, rewriting heading
`font-family`, `font-weight` and margins on the host.

An earlier draft of this file claimed antd "needs the reset less" than the
others. That was written before it was measured and is only half right. What is
supported: antd renders correctly **without** the reset, because
`@ant-design/cssinjs` emits self-contained component styles - all 39 e2e
assertions pass and axe reports zero critical violations with it omitted. What is
**not** supported is any claim that the reset is gentler than the others. It is
smaller than Carbon's (79 differences) but it is not harmless.

## Overlays

antd portals its overlays to `document.body`, like every candidate here, so the
same trap applies: the UNDRR tokens are scoped to `.undrr-tokens` rather than
`:root` deliberately, and CSS custom properties do not reach a portal through
React context.

antd's answer is better than the class-juggling the React Aria and Mantine runs
needed. `ConfigProvider` takes `getPopupContainer`, so all three overlay types are
mounted inside the candidate subtree from one prop on the provider, rather than a
token-scope class passed to every overlay individually.

The trade, stated rather than hidden: containing overlays inside the subtree makes
them subject to that subtree's `overflow` and stacking context.

## Traps worth knowing

- `optionFilterProp="label"` is required on a searchable `Select`. antd filters
  on `value` by default, and the fixture values are slugs while the labels carry
  the translated text, so without it a search over these fixtures silently
  matches almost nothing.
- `Segmented` renders a visually-hidden radio inside a `<label>`, so
  `getByRole("radio").click()` times out even though the role is exposed
  correctly. A test has to click antd's own `title`-bearing label element. This is
  a clickability quirk, not an accessibility defect.
- `#section-6 tbody input[type=checkbox]` returns **eleven**, not ten, because
  rc-table renders a hidden measure row when `scroll.x` is set. The assertion is
  scoped to `tr[data-row-key]`.

## Dependencies

68 production packages, **all MIT**. No font licences, and nothing equivalent to
the install-time telemetry found in 21 Carbon and IBM Plex packages (repository
issue #8). The breadth is the maintenance-surface point: roughly 47 direct
dependencies, nearly all small `@rc-component/*` packages under one org.

The figure comes from `scripts/count-dependencies.mjs`, which measures all ten
apps by one method. The per-run `bundle.dependencyCount` values recorded by
earlier runs are **not** comparable with each other and reorder the candidates -
Mantine was recorded at 112 where a production count gives 27 - so only the
consistently-measured column should be compared across rows.

## Reproducibility

This pairing was built shared-first: `packages/integration-antd` held the
host-independent part from the start and both antd apps consume it. That is a
change of method after the MUI extraction (axis A3, `docs/decision-axes.md`), and
it is the arrangement a real multi-site deployment would use.

The honest caveat: building it that way could flatter the result. Any
host-specific need was pushed **out** to the consuming app and counted there,
never absorbed into the package to keep the number down. Each app owns
`main.tsx`, `App.tsx`, `demo.css` and `sections/SectionSideBySide.tsx`, and
nothing else.

868 shared lines against 248 per site, of which 115 is `SectionSideBySide` - a
section that exists only because this is an evaluation. Excluding it, 86% is
shared.

`demo-state.ts` here is byte-identical to the copy in `integration-mui`. It is
candidate-independent as well as host-independent and belongs in the scaffold,
but `packages/` is import-only for demo runs, so it was left duplicated rather
than churning six other apps. That duplication is itself an A3 finding.
