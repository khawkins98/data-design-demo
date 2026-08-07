# Axis scores

GENERATED FILE - regenerate with `pnpm axes`. Axis definitions and
measurement rules are in [decision-axes.md](./decision-axes.md).

**This is the evidence layer.** Each section shows the UNDRR question
it answers, then the measurements behind it.

- For the recommendation, read the [ranking](./scores.html) first.
- For per-requirement coverage, see the [requirement matrix](./comparison.html) (all 300 assessments).

## A1 - Implementation effort

> **None of the six UNDRR questions maps to A1 directly.** It is measured because the weighted composite scores it, and because the questions were asked about living with a library rather than about building with one. See the [ranking](./scores.html) for what it is worth there.

`beyond native` counts requirements needing more than a documented component.
`traps` counts documented approaches that failed and needed workarounds.

| Pairing | native||one documented component did it | composed||assembled from multiple components | custom||built from scratch | beyond native||composed + custom; lower is easier | traps||documented approach failed, needed a workaround | wrappers||glue components the demo had to write | flagged for review||may need a human judgement call |
| --- | --- | --- | --- | --- | --- | --- | --- |
| delta-react-aria | {spark:20:28} | {spark:8:10} | {spark:2:3} | **{spark:10:11}** | {spark:5:14} | 5 (104 ln) | {spark:7:11} |
| mangrove-react-aria | {spark:21:28} | {spark:7:10} | {spark:2:3} | **{spark:9:11}** | {spark:3:14} | 3 (78 ln) | {spark:7:11} |
| delta-mui | {spark:26:28} | {spark:4:10} | {spark:0:3} | **{spark:4:11}** | {spark:5:14} | 3 (62 ln) | {spark:7:11} |
| mangrove-mui | {spark:26:28} | {spark:4:10} | {spark:0:3} | **{spark:4:11}** | {spark:7:14} | 2 (53 ln) | {spark:10:11} |
| delta-carbon | {spark:19:28} | {spark:10:10} | {spark:1:3} | **{spark:11:11}** | {spark:14:14} | 4 (71 ln) | {spark:10:11} |
| mangrove-carbon | {spark:19:28} | {spark:10:10} | {spark:1:3} | **{spark:11:11}** | {spark:8:14} | 4 (71 ln) | {spark:11:11} |
| delta-mantine | {spark:20:28} | {spark:7:10} | {spark:3:3} | **{spark:10:11}** | {spark:11:14} | 4 (179 ln) | {spark:10:11} |
| mangrove-mantine | {spark:19:28} | {spark:10:10} | {spark:1:3} | **{spark:11:11}** | {spark:9:14} | 4 (176 ln) | {spark:9:11} |
| delta-antd | {spark:28:28} | {spark:1:10} | {spark:1:3} | **{spark:2:11}** | {spark:7:14} | 4 (128 ln) | {spark:7:11} |
| mangrove-antd | {spark:28:28} | {spark:1:10} | {spark:1:3} | **{spark:2:11}** | {spark:7:14} | 4 (128 ln) | {spark:9:11} |

Each friction-log entry is a place the documented approach did not suffice.

<details><summary>The friction log, per pairing</summary>

**`delta-react-aria`** - 5 entries

- `.undrr-tokens` is applied to every portalled overlay (Popover, ModalOverlay, Tooltip) via src/overlay-class.ts.
- One rule targets library-rendered markup: [data-testid="hidden-select-container"] { overflow: hidden } plus a width cap on library-rendered <select> elements.
- `position: relative` on our own ResizableTableContainer wrapper, to contain ColumnResizer's visually hidden <input type=range>.
- `overflow: hidden` plus text-overflow on the table's column headers.
- NO `[hidden]` workaround was needed, and that is worth recording as an escape hatch NOT used.

**`mangrove-react-aria`** - 3 entries

- One rule targets library-rendered markup: [data-testid="hidden-select-container"] { overflow: hidden } plus a width cap on library-rendered <select> elements.
- `.demo [hidden] { display: none }` restores the hidden attribute, which the Mangrove host defeats: its `input[type="text"] { display: block }` rule (0,1,1) outranks its own `[hidden] { display: none }` (0,1,0).
- `.undrr-tokens` is applied to every portalled overlay (Popover, ModalOverlay, Tooltip) via src/overlay-class.ts.

**`delta-mui`** - 5 entries

- cssVariables: true deliberately NOT enabled.
- Two CSS rules reach into library-generated class names (.MuiDataGrid-root, .MuiDataGrid-columnHeaderTitle) to cap grid width and wrap long header labels.
- MUI's picker prop types are not compatible with exactOptionalPropertyTypes: true.
- Stack no longer accepts flexWrap/alignItems as direct props in v9; they must move into sx.
- None needed for portalled overlays, which is a genuine advantage here.

**`mangrove-mui`** - 7 entries

- cssVariables: true deliberately NOT enabled.
- CssBaseline replaced with ScopedCssBaseline.
- Two CSS rules reach into library-generated class names (.MuiOutlinedInput-input / .MuiInputBase-input, .MuiDataGrid-root, .MuiDataGrid-columnHeaderTitle).
- MUI's picker prop types are not compatible with exactOptionalPropertyTypes: true.
- Stack no longer accepts flexWrap/alignItems as direct props in v9; they must move into sx.
- stylis-plugin-rtl was NOT added, because it is outside the candidate's ecosystem and constraint 2 forbids it.
- None needed for portalled overlays.

**`delta-carbon`** - 14 entries

- @carbon/styles/css/styles.css IS NOT IMPORTED.
- TRAP 1, silent and consequential: `@carbon/styles/scss/layout` is REQUIRED but is not a component partial.
- TRAP 2, the same shape one level down: components/data-table/_index.scss includes only the CORE table mixin.
- A 20-line Vite plugin in vite.config.ts rewrites the one `:root` rule Carbon's layer module emits onto the token scope class, so the shipped stylesheet contains zero selectors that can match host markup.
- Twenty-two CSS selectors reach into .cds-- class names, each for a token Carbon's theme cannot express or a behaviour it hard-codes: corner radius (Carbon has no radius token and is square by design), list-box menu max-height, table-header ...
- Three of those twenty-two are the step wizard's, and they are behaviour rather than tokens.
- The progress indicator has no responsive behaviour at all.
- Carbon's published TypeScript types do not compile under exactOptionalPropertyTypes: true.
- @carbon/styles/scss/fonts is NOT loaded.
- Portals are mostly a non-issue here, and that is a finding rather than luck avoided.
- Spacing is unreachable at any layer.
- Z-index is unreachable, and carbon wins every collision.
- Font family is unreachable through the supported api.
- Type scale is fully reachable, unusually.

**`mangrove-carbon`** - 8 entries

- 22 of 71 tokens are UNREACHABLE and no mechanism exists to change that: all 10 z-index tokens and all 12 spacing tokens.
- Font FAMILY is not a Carbon token.
- Ten declarations re-assert Carbon's own field styling at (0,2,0) to beat Mangrove's `input[type=*], textarea` rule at (0,1,1), which was overriding `.cds--text-input` at (0,1,0) and rendering every Carbon field as a 46px box with a 2px blac...
- Three rules reach into Carbon-rendered class names to make SideNav sit inline instead of position: fixed at 100vh (.cds--side-nav, .cds--side-nav__navigation), and two more cap the width of .cds--data-table-container and .cds--data-table-co...
- One rule adds flex-wrap to .cds--radio-button-group, which Carbon does not wrap and which therefore overflows a 390px viewport with four locale labels.
- aria-describedby is passed by hand to the three invalid TextInputs to work around Carbon's aria-errormessage target having no role=alert.
- No workaround was needed for the Mangrove [hidden] specificity defect, and the rule that was there has been deleted.
- No escape hatch was needed for portalled overlays, which is the opposite of the React Aria result.

**`delta-mantine`** - 11 entries

- theme.colors[name] is typed MantineColorsTuple — TEN shades.
- cssVariablesResolver's three buckets are written at three DIFFERENT selectors: variables at ':root, :host', light/dark at ':root[data-mantine-color-scheme="…"]'.
- @mantine/core/styles.css is NOT imported.
- The per-component import ORDER had to be lifted from Mantine's own styles.css.
- Mantine has no theme-level z-index scale.
- Table's striping, hover and border colours are props rather than theme slots, so the canvas and accentSubtle tokens are only reachable through Table defaultProps.
- portalProps carries the token scope class onto every portal container.
- portalProps also carries a direction class, and an effect in App.tsx stamps dir on .demo-portal containers after each locale change, because Mantine's Portal drops a dir prop and freezes className at mount.
- reuseTargetNode: false on every portal.
- Three CSS rules reach library-generated class names (.mantine-InputWrapper-label, .mantine-Select-label, .mantine-SegmentedControl-label) to wrap the 60+ character German fixture labels.
- Pagination's four edge controls and the clearable inputs' clear button ship with no accessible name.

**`mangrove-mantine`** - 9 entries

- @mantine/core/styles.css was NOT imported.
- The per-component import order is load-bearing and undocumented.
- Mantine requires ten shades per colour and theme.primaryColor must be a KEY of theme.colors -- a hex string is rejected by validateMantineTheme.
- No focus colour in the theme.
- No z-index scale in the theme.
- Host-into-candidate collision repair: 2 rules, 4 selectors, reaching into library-generated class names (.mantine-PillsInputField-field, .mantine-TimePicker-field) at (0,3,1).
- Mantine's CSS is loaded by an AWAITED DYNAMIC IMPORT inside the candidate=on branch of main.tsx, not a static import.
- MantineProvider mutates document.documentElement, setting data-mantine-color-scheme="light" through its default getRootElement; DirectionProvider.setDirection() sets dir there too.
- forceColorScheme="light" is set because the token set has no dark palette and the host is light-only; without it Mantine reads localStorage and could render a dark subtree inside a light host between runs.

**`delta-antd`** - 7 entries

- antd/dist/reset.css IS NOT IMPORTED.
- StyleProvider layer is enabled, which wraps every antd rule in a CSS @layer.
- ConfigProvider getPopupContainer mounts overlays inside the candidate subtree.
- Finding, not a preference: antd derives its secondary, description, placeholder and label greys from colorTextBase by lowering opacity, and that derivation produced FOUR axe colour-contrast failures from a palette whose own secondary text p...
- Menu.itemSelectedColor and itemSelectedBg pinned for the same reason: the derived selected-item colour did not reach 4.5:1 against antd's own selected background.
- Tag colours come from the UNDRR tokens rather than antd's green/gold/red presets, which failed contrast as filled tags and would have been antd's hues rather than UNDRR's in any case.
- Form.Item label does NOT associate the label with its control unless the item also has a name, because that is what antd uses to generate the id it points for at.

**`mangrove-antd`** - 7 entries

- antd/dist/reset.css IS NOT IMPORTED.
- StyleProvider layer is enabled, which wraps every antd rule in a CSS @layer.
- ConfigProvider getPopupContainer mounts overlays inside the candidate subtree.
- Finding, not a preference: antd derives its secondary, description, placeholder and label greys from colorTextBase by lowering opacity, and that derivation produced FOUR axe colour-contrast failures from a palette whose own secondary text p...
- Menu.itemSelectedColor and itemSelectedBg pinned for the same reason: the derived selected-item colour did not reach 4.5:1 against antd's own selected background.
- Tag colours come from the UNDRR tokens rather than antd's green/gold/red presets, which failed contrast as filled tags and would have been antd's hues rather than UNDRR's in any case.
- Form.Item label does NOT associate the label with its control unless the item also has a name, because that is what antd uses to generate the id it points for at.

</details>

## A2 - Maintainability at scale

> **None of the six UNDRR questions maps to A2 directly.** It is measured because the weighted composite scores it, and because the questions were asked about living with a library rather than about building with one. See the [ranking](./scores.html) for what it is worth there.

Every distinct styling hook, classified by the promise behind it.

`attribute`: semantic selectors (`[data-*]`, `[slot]`). `contract`: documented styling API.
`off route`: styling that bypasses the library's own theming mechanism.

| Pairing | attribute||semantic selectors like [data-*], [slot] | contract||documented styling API; safe to use | off route||bypasses the library's theming; fragile | of which hashed||generated class names that change between builds | CSS rules||total rules in the demo's own stylesheets |
| --- | --- | --- | --- | --- | --- |
| delta-react-aria | {spark:22:22} | {spark:0:4} | **0** | 0 | {spark:213:213} |
| mangrove-react-aria | {spark:18:22} | {spark:0:4} | **0** | 0 | {spark:155:213} |
| delta-mui | {spark:0:22} | {spark:2:4} | **0** | 0 | {spark:3:213} |
| mangrove-mui | {spark:0:22} | {spark:4:4} | **0** | 0 | {spark:5:213} |
| delta-carbon | {spark:0:22} | {spark:0:4} | **{spark:19:19}** | 0 | {spark:48:213} |
| mangrove-carbon | {spark:0:22} | {spark:0:4} | **{spark:15:19}** | 0 | {spark:53:213} |
| delta-mantine | {spark:3:22} | {spark:3:4} | **0** | 0 | {spark:16:213} |
| mangrove-mantine | {spark:2:22} | {spark:4:4} | **0** | 0 | {spark:22:213} |
| delta-antd | {spark:0:22} | {spark:0:4} | **0** | 0 | {spark:8:213} |
| mangrove-antd | {spark:0:22} | {spark:0:4} | **0** | 0 | {spark:6:213} |

Mantine's `.mantine-{Component}-{element}` classes are a documented API
(`withStaticClasses`), so they count as contract. Carbon's `cds--` classes are
stable but off the documented theming route (`--cds-*` custom properties).

**Every run declared `overridesLibraryInternals: true`, including 6 with no off-route hook at all** (delta-react-aria, mangrove-react-aria, delta-mui, mangrove-mui, delta-mantine, mangrove-mantine). The field collapsed to a constant and is reported but not scored.

<details><summary>Every class hook, per pairing</summary>

- `delta-mui` - contract: `.MuiDataGrid-columnHeaderTitle`, `.MuiDataGrid-root`
- `mangrove-mui` - contract: `.MuiDataGrid-columnHeaderTitle`, `.MuiDataGrid-root`, `.MuiInputBase-input`, `.MuiOutlinedInput-input`
- `delta-carbon` - off route: `.cds--action-list`, `.cds--batch-actions`, `.cds--btn`, `.cds--data-table`, `.cds--date-picker`, `.cds--date-picker-container`, `.cds--list-box`, `.cds--modal-container`, `.cds--progress-label`, `.cds--progress-optional`, `.cds--progress-step-button`, `.cds--search-input`, `.cds--select-input`, `.cds--side-nav`, `.cds--table-header-label`, `.cds--tag`, `.cds--text-area`, `.cds--text-input`, `.cds--tile`
- `mangrove-carbon` - off route: `.cds--data-table`, `.cds--data-table-container`, `.cds--data-table-content`, `.cds--date-picker`, `.cds--layer-one`, `.cds--link`, `.cds--modal`, `.cds--radio-button-group`, `.cds--search-input`, `.cds--side-nav`, `.cds--table-sort`, `.cds--text-area`, `.cds--text-input`, `.cds--tile`, `.cds--time-picker`
- `delta-mantine` - contract: `.mantine-InputWrapper-label`, `.mantine-SegmentedControl-label`, `.mantine-Select-label`
- `mangrove-mantine` - contract: `.mantine-PillsInputField-field`, `.mantine-TimePicker-field`, `.mantine-focus-always`, `.mantine-focus-auto`

</details>

## A3 - Reproducibility across sites

> **Answers: Repeatability** - Can a second team reproduce the integration without inventing their own conventions?
>
> Measured by extraction for MUI: 86% of the integration shares across sites. React Aria's is fully portable but has no package to hold it, so it is shared by duplication.
>
> **Answers: Standardisation** - One shared component vocabulary across the estate, or one dialect per project?
>
> shadcn/ui was excluded outright for guaranteeing a fork per site. Among the five built, the theme and token layer extracts; kitchen-sink section components do not.

`basis`: only MUI was actually extracted; other entries are analysis.

| Candidate | basis||measured or analysed? | verdict||can it be shared across sites? | shared||code lines reusable across sites | per site||code lines each site must own | shared %||proportion that is reusable |
| --- | --- | --- | --- | --- | --- |
| react-aria | analysed | **likely packaged** | - | - | - |
| mui | **measured** | **packaged** | 809 ln | 277 ln | 74% |
| carbon | analysed | **unknown - confounded** | - | - | - |
| mantine | analysed | **unknown - confounded** | - | - | - |
| antd | **measured** | **packaged** | 868 ln | 248 ln | 78% |
| shadcn | not-run | **fork-per-site** | - | - | - |

**react-aria** - 5 of 13 files are already code-identical (517 code lines), and the styling is CSS custom properties read from the shared tokens, which is host-independent by construction and needs no rebuild to retarget. Not extracted, so no measured figure is offered.

What resists extraction:

- SectionDataTable and SectionForms diverged between the two runs and would need reconciling first
- theme.css differs, though it consumes only var(--undrr-*) so it is host-independent by construction

**mui** - The residue's shape matters more than its size. Three of the four items are wiring. The fourth, demo.css, is the only one that is real per-site work, and it is a function of how aggressively the host styles bare elements rather than of MUI: 11 lines against Delta, 27 against Mangrove, because Mangrove styles input[type=...] at (0,1,1) and beats MUI's own slot class at (0,1,0).

What resists extraction:

- App.tsx - wires in the host's own HostShell (100-105 ln)
- main.tsx - stylesheet imports and their order, load-bearing per host (13-14 ln)
- demo.css - host repair, 11 ln on Delta against 27 on Mangrove
- SectionSideBySide.tsx - renders host markup beside candidate markup, so host-specific by definition (135-149 ln); an artefact of the evaluation, not of a real site

Verified by:

- 9 of 13 source files were already code-identical between the two hosts once comments are stripped, including the whole token mapping in theme.ts
- typecheck clean; 66 unit tests pass
- built CSS bundle byte-identical to baseline (same content hash, index-CDoIL4xk.css)
- layout identical: document scrollHeight 4733 and all 8 section offsets unchanged, input geometry unchanged, same 17 injected style tags
- delta-mui screenshots reproduce to within 1-5 pixels at max channel delta 2, i.e. antialiasing noise

**carbon** - Unifying the two Carbon apps would mean discarding one of two independent implementations, which is a rewrite and not a refactor, so it would not measure what A3 asks. The theming route is a hand-maintained --cds-* mapping, which does package, but it leaves 21-22 UNDRR tokens unreachable (A5) and needs re-verifying per Carbon upgrade.

What resists extraction:

- 0 of 18 files are code-identical between the two hosts, but both were written independently and in parallel, so this measures authorship rather than the library
- the 15-16 off-route .cds--* overrides are host-matching CSS, so they are the most likely per-site residue

**mantine** - createTheme() output is data and packages cleanly, but Mantine bakes token values into each bundle (A5), so a Mangrove change is a rebuild per site regardless of how well the integration packages.

What resists extraction:

- 0 of 17 files are code-identical, for the same authorship reason as Carbon
- three helper modules (table-model, table-behaviour, use-column-resize) exist on only one host

**antd** - Built shared-first, which is a change of method after the MUI extraction and carries an honest caveat: building it this way could flatter the result. Any host-specific need was pushed OUT to the consuming app and counted there rather than absorbed into the package. The striking result is that the per-site residue contains NO host-repair CSS on either host, where mangrove-mui needed 27 lines. That is not because antd is tidier: it is because StyleProvider layer makes antd lose every conflict with unlayered host CSS, so on Mangrove there is nothing to repair because the host simply wins. Cheap per-site cost and loss of control over appearance are the same fact viewed from two sides.

What resists extraction:

- main.tsx - stylesheet imports and their order
- App.tsx - the host's HostShell plus the ConfigProvider and StyleProvider wiring
- demo.css - the resize grip and section 9's grid. ZERO lines of host repair on EITHER host, which is the finding
- SectionSideBySide.tsx - renders host markup beside candidate markup, so host-specific by definition

Verified by:

- Built shared-first rather than extracted later: packages/integration-antd held the host-independent part from the start and both apps consumed it, so the arrangement a multi-site deployment would use was the arrangement tested.
- Both pairings pass 39 e2e assertions each, with 0 critical axe violations and a clean leakage assertion.

**shadcn** - This is a property of how shadcn/ui is distributed rather than a measurement, and it is the reason it was not built as a pairing. Recorded here so the axis is not silently blank.

What resists extraction:

- the distribution model is to copy component source into the consuming project, so each site owns a divergent copy with no upstream upgrade path


## A4 - Mangrove compatibility

> **Answers: Mangrove integration** - Can it live inside an existing Mangrove page without fighting it?
>
> Leakage is clean for every pairing except mangrove-carbon, whose global stylesheet is not containable. Ant Design loses every cascade conflict to Mangrove - which the realistic layouts showed is not a matter of taste: Mangrove's rules also cover Select's own value, so its filters render blank on the Mangrove host.


| Pairing | leakage||does the library restyle the host page outside its own area? | documented setup loadable as-is||can the library's default setup load without fighting Mangrove? |
| --- | --- | --- |
| delta-react-aria | clean | not probed |
| mangrove-react-aria | clean | not probed |
| delta-mui | clean | not probed |
| mangrove-mui | clean | not probed |
| delta-carbon | clean | **no** - global stylesheet restyles the host |
| mangrove-carbon | **FAILED** (19 diffs) | not probed |
| delta-mantine | clean | not probed |
| mangrove-mantine | clean | not probed |
| delta-antd | clean | **no** - global stylesheet restyles the host |
| mangrove-antd | clean | **no** - global stylesheet restyles the host |

## A5 - Theming fidelity and propagation

> **Answers: Design-token alignment** - Can it be driven by UNDRR tokens, and does a token change propagate?
>
> React Aria and Carbon resolve tokens in the browser, so a Mangrove change is a stylesheet swap. MUI, Mantine and Ant Design bake values in, making it a rebuild of every site. Carbon leaves 21-22 of 71 tokens unreachable at all.

`unreachable`: tokens with no hook to attach to. `propagation`: stylesheet swap
reaches every site at once; rebuild is per site.

| Pairing | tokens applied||UNDRR design tokens successfully connected | unreachable||tokens with no hook to attach to | propagation||how a token change reaches every site | live var() refs in shipped CSS||CSS custom properties surviving to production |
| --- | --- | --- | --- | --- |
| delta-react-aria | {spark:48:66} | 0 | **stylesheet-swap** | {spark:409:409} |
| mangrove-react-aria | {spark:47:66} | 0 | **stylesheet-swap** | {spark:309:409} |
| delta-mui | {spark:29:66} | 0 | **mostly-rebuild** | {spark:38:409} |
| mangrove-mui | {spark:32:66} | 0 | **mostly-rebuild** | {spark:38:409} |
| delta-carbon | {spark:50:66} | **{spark:21:22}** | **stylesheet-swap** | {spark:263:409} |
| mangrove-carbon | {spark:50:66} | **{spark:22:22}** | **stylesheet-swap** | {spark:201:409} |
| delta-mantine | {spark:66:66} | **{spark:5:22}** | **mostly-rebuild** | {spark:44:409} |
| mangrove-mantine | {spark:62:66} | 0 | **mostly-rebuild** | {spark:44:409} |
| delta-antd | {spark:44:66} | 0 | **mostly-rebuild** | {spark:42:409} |
| mangrove-antd | {spark:44:66} | 0 | **mostly-rebuild** | {spark:41:409} |

## A6 - Right-to-left

> **Answers: Right-to-left** - Does Arabic work in the components, not just the page?
>
> MUI Community fails on both hosts and cannot be fixed within the brief's constraints. React Aria and Ant Design are clean at zero cost; Mantine is clean only after mitigation. This needs a policy call, not a bug fix.

Read `status` against `setup`: `clean` at `native`/0 lines means a `dir` attribute
sufficed; `clean` at `composed`/18 lines means the library needed mitigation.

| Pairing | status||does Arabic render correctly? | setup||native (dir attribute) or composed (extra code)? | custom lines||lines of code needed to make RTL work | recorded issues||defects found during RTL testing |
| --- | --- | --- | --- | --- |
| delta-react-aria | clean | native | {spark:0:29} | {spark:0:2} |
| mangrove-react-aria | clean | native | {spark:0:29} | {spark:0:2} |
| delta-mui | clean | composed | {spark:29:29} | {spark:0:2} |
| mangrove-mui | clean | composed | {spark:29:29} | {spark:0:2} |
| delta-carbon | clean | native | {spark:0:29} | {spark:1:2} |
| mangrove-carbon | clean | composed | {spark:6:29} | {spark:2:2} |
| delta-mantine | clean | composed | {spark:18:29} | {spark:2:2} |
| mangrove-mantine | clean | composed | {spark:10:29} | {spark:0:2} |
| delta-antd | clean | native | {spark:0:29} | {spark:0:2} |
| mangrove-antd | clean | native | {spark:0:29} | {spark:0:2} |

Two hosts agreeing implicates the candidate; disagreeing implicates the host.
Recorded issues are reproduced verbatim below.

<details><summary>Recorded RTL issues, per pairing</summary>

**`delta-carbon`** - 1 recorded

- flatpickr's calendar is a third-party non-React widget and is not mirrored: its previous/next month arrows keep their LTR positions in Arabic. Carbon's own components all flip correctly because they are authored in logical properties.

**`mangrove-carbon`** - 2 recorded

- Carbon's own internals mirror correctly at all three viewports; no direction-aware CSS was written except one padding-inline-start.
- The flatpickr calendar inside DatePicker keeps English month and weekday names in Arabic, because Carbon's `locale` prop was left at "en". Carbon does bundle flatpickr l10ns, so this is a wiring gap rather than a missing capability, but it is not automatic the way React Aria's I18nProvider is.

**`delta-mantine`** - 2 recorded

- Clean as shipped, but only after two mitigations. Mantine's Portal drops `dir` and freezes its container's props at mount, so portalled overlays initially rendered LTR inside the RTL page and stayed LTR across locale changes. See theming.escapeHatchesUsed.
- In Arabic the range picker's formatted value renders with its endpoints visually reversed (`23:59 15/06/2026 – 00:00 01/05/2026`). Bidi reordering of an LTR-formatted string in an RTL context, not a wrong value; needs a bidi-isolation decision from the design system.

</details>

## A7 - Accessibility conformance

> **Answers: Accessibility** - Does it meet UNDRR's obligations in practice?
>
> Zero is a floor, not a conformance claim: no screen-reader or human keyboard pass was run on any pairing. And the floor is lower than the kitchen sinks suggested - the realistic layouts found a critical unnamed-button defect in Mantine's Modal that every scoped axe run in this repository was blind to, because portalled overlays render outside the scanned subtree.

`incomplete` counts checks axe declined to decide. Nine of ten runs ran axe
unscoped, so counts are directional, not exact.

| Pairing | critical||must-fix violations (axe automated scan) | serious||should-fix violations | incomplete||axe could not decide; needs a human | scope||what part of the page was scanned |
| --- | --- | --- | --- | --- |
| delta-react-aria | 0 | {spark:0:2} | {spark:1:4} | whole page, unscoped |
| mangrove-react-aria | 0 | {spark:0:2} | {spark:1:4} | whole page, unscoped |
| delta-mui | 0 | {spark:1:2} | {spark:4:4} | whole page, unscoped |
| mangrove-mui | 0 | {spark:1:2} | {spark:4:4} | candidate subtree |
| delta-carbon | 0 | {spark:2:2} | {spark:2:4} | whole page, unscoped |
| mangrove-carbon | 0 | {spark:1:2} | {spark:2:4} | whole page, unscoped |
| delta-mantine | 0 | {spark:0:2} | {spark:1:4} | whole page, unscoped |
| mangrove-mantine | 0 | {spark:0:2} | {spark:0:4} | whole page, unscoped |
| delta-antd | 0 | {spark:1:2} | {spark:1:4} | whole page, unscoped |
| mangrove-antd | 0 | {spark:1:2} | {spark:1:4} | whole page, unscoped |

**Zero automated violations is a floor, not a conformance claim.** No screen-reader
or keyboard-only walkthrough was run. A row of zeroes means the automated subset passed.

## Supporting figures

`prod pkgs` is measured uniformly (`pnpm deps:count`). `as recorded` is each run's
self-reported figure; the two disagree and only `prod pkgs` is comparable across rows.

| Pairing | custom CSS lines||written by the demo, not the library | bundle kB gz||shipped JavaScript size, gzipped | prod pkgs||production npm packages (uniform method) | as recorded||self-reported by each run; not comparable | licences||licence families across dependencies | build s||seconds to build from clean |
| --- | --- | --- | --- | --- | --- | --- |
| delta-react-aria | {spark:715:715} | {spark:238.8:423.4} | **{spark:16:93}** | {spark:19:158} | 0BSD 1, Apache-2.0 8, MIT 7 | {spark:2:4.7} |
| mangrove-react-aria | {spark:661:715} | {spark:237.6:423.4} | **{spark:17:93}** | {spark:20:158} | 0BSD 1, Apache-2.0 9, MIT 7 | {spark:1.2:4.7} |
| delta-mui | {spark:14:715} | {spark:387.4:423.4} | **{spark:92:93}** | {spark:142:158} | BSD-3-Clause 3, ISC 2, MIT 87 | {spark:2.4:4.7} |
| mangrove-mui | {spark:27:715} | {spark:397.6:423.4} | **{spark:93:93}** | {spark:158:158} | Apache-2.0 1, BSD-3-Clause 3, ISC 2, MIT 87 | {spark:1.7:4.7} |
| delta-carbon | {spark:300:715} | {spark:261.5:423.4} | **{spark:78:93}** | {spark:145:158} | 0BSD 1, Apache-2.0 16, BSD-3-Clause 1, MIT 51, OFL-1.1 9 | {spark:2.8:4.7} |
| mangrove-carbon | {spark:351:715} | {spark:207.8:423.4} | **{spark:79:93}** | {spark:146:158} | 0BSD 1, Apache-2.0 17, BSD-3-Clause 1, MIT 51, OFL-1.1 9 | {spark:4.7:4.7} |
| delta-mantine | {spark:72:715} | {spark:238.8:423.4} | **{spark:27:93}** | {spark:112:158} | (MIT OR CC0-1.0) 1, 0BSD 1, MIT 25 | {spark:2.6:4.7} |
| mangrove-mantine | {spark:103:715} | {spark:270.9:423.4} | **{spark:28:93}** | {spark:113:158} | (MIT OR CC0-1.0) 1, 0BSD 1, Apache-2.0 1, MIT 25 | {spark:3.58:4.7} |
| delta-antd | {spark:46:715} | {spark:392.3:423.4} | **{spark:68:93}** | {spark:68:158} | MIT 68 | {spark:1.5:4.7} |
| mangrove-antd | {spark:46:715} | {spark:423.4:423.4} | **{spark:69:93}** | {spark:69:158} | Apache-2.0 1, MIT 68 | {spark:1.5:4.7} |

