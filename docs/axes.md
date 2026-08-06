# Axis scores

GENERATED FILE - regenerate with `pnpm axes`. Axis definitions and
measurement rules are in [decision-axes.md](./decision-axes.md).

Read this instead of the requirement matrix when choosing. The matrix says every
candidate can do the job; these axes say what each one costs to live with.

## A1 - Implementation effort

`beyond native` is the count of the 30 requirements needing more than dropping in
a documented component. `traps` counts documented approaches that failed and
needed working around. Neither is a time estimate; see the axis definition.

| Pairing | native | composed | custom | beyond native | traps | wrappers | flagged for review |
| --- | --- | --- | --- | --- | --- | --- | --- |
| delta-react-aria | 20 | 8 | 2 | **10** | 5 | 5 (104 ln) | 7 |
| mangrove-react-aria | 21 | 7 | 2 | **9** | 3 | 3 (78 ln) | 7 |
| delta-mui | 26 | 4 | 0 | **4** | 5 | 3 (62 ln) | 7 |
| mangrove-mui | 26 | 4 | 0 | **4** | 7 | 2 (53 ln) | 10 |
| delta-carbon | 19 | 10 | 1 | **11** | 12 | 4 (71 ln) | 10 |
| mangrove-carbon | 19 | 10 | 1 | **11** | 8 | 4 (71 ln) | 11 |
| delta-mantine | 20 | 7 | 3 | **10** | 11 | 4 (179 ln) | 10 |
| mangrove-mantine | 19 | 10 | 1 | **11** | 9 | 4 (176 ln) | 9 |

## A2 - Maintainability at scale

Every distinct styling hook, classified by the promise behind it.

`attribute` hooks are semantic (`[data-*]`, `[slot]`) and survive DOM restructuring.
`contract` hooks are class names the library documents as a styling API. `off route`
hooks are the ones that matter: styling achieved by going around the library's own
theming mechanism, which is what accumulates across sites and across upgrades.

| Pairing | attribute | contract | off route | of which hashed | CSS rules |
| --- | --- | --- | --- | --- | --- |
| delta-react-aria | 16 | 0 | **0** | 0 | 133 |
| mangrove-react-aria | 15 | 0 | **0** | 0 | 121 |
| delta-mui | 0 | 2 | **0** | 0 | 3 |
| mangrove-mui | 0 | 4 | **0** | 0 | 5 |
| delta-carbon | 0 | 0 | **16** | 0 | 25 |
| mangrove-carbon | 0 | 0 | **15** | 0 | 48 |
| delta-mantine | 2 | 3 | **0** | 0 | 14 |
| mangrove-mantine | 1 | 4 | **0** | 0 | 18 |

Checking the documentation moved two libraries here, and both moves were away from
my first reading. Mantine's `.mantine-{Component}-{element}` classes are a
documented styling API gated behind a `withStaticClasses` provider prop, not an
internal - so Mantine's overrides are contract hooks. Carbon's `cds--` classes are
documented as an internal BEM authoring convention with a *reconfigurable* prefix,
while Carbon points consumers at `--cds-*` custom properties for theming - so
Carbon's overrides are off-route. That is not a prediction that they will break;
Carbon's class names are stable in practice. It is a count of the places the
supported theming route did not reach.

**Every run declared `overridesLibraryInternals: true`, including 6 with no off-route hook at all** (delta-react-aria, mangrove-react-aria, delta-mui, mangrove-mui, delta-mantine, mangrove-mantine). Self-assessment of this collapsed to a constant and carries no information, which is why the field is reported but not scored.

<details><summary>Every class hook, per pairing</summary>

- `delta-mui` - contract: `.MuiDataGrid-columnHeaderTitle`, `.MuiDataGrid-root`
- `mangrove-mui` - contract: `.MuiDataGrid-columnHeaderTitle`, `.MuiDataGrid-root`, `.MuiInputBase-input`, `.MuiOutlinedInput-input`
- `delta-carbon` - off route: `.cds--action-list`, `.cds--batch-actions`, `.cds--btn`, `.cds--data-table`, `.cds--date-picker`, `.cds--date-picker-container`, `.cds--list-box`, `.cds--modal-container`, `.cds--search-input`, `.cds--select-input`, `.cds--side-nav`, `.cds--table-header-label`, `.cds--tag`, `.cds--text-area`, `.cds--text-input`, `.cds--tile`
- `mangrove-carbon` - off route: `.cds--data-table`, `.cds--data-table-container`, `.cds--data-table-content`, `.cds--date-picker`, `.cds--layer-one`, `.cds--link`, `.cds--modal`, `.cds--radio-button-group`, `.cds--search-input`, `.cds--side-nav`, `.cds--table-sort`, `.cds--text-area`, `.cds--text-input`, `.cds--tile`, `.cds--time-picker`
- `delta-mantine` - contract: `.mantine-InputWrapper-label`, `.mantine-SegmentedControl-label`, `.mantine-Select-label`
- `mangrove-mantine` - contract: `.mantine-PillsInputField-field`, `.mantine-TimePicker-field`, `.mantine-focus-always`, `.mantine-focus-auto`

</details>

## A3 - Reproducibility across sites

**Not yet measured.** The extraction experiment has not been run, so this axis is
blank rather than guessed. Divergence between the two host apps is not a valid
substitute - see the caveat in the axis definition.

## A4 - Mangrove compatibility

| Pairing | leakage | documented setup loadable as-is | RTL | axe critical/serious |
| --- | --- | --- | --- | --- |
| delta-react-aria | clean | not probed | clean | 0 / 0 |
| mangrove-react-aria | clean | not probed | clean | 0 / 0 |
| delta-mui | clean | not probed | **issues** | 0 / 1 |
| mangrove-mui | clean | not probed | **issues** | 0 / 1 |
| delta-carbon | clean | **no** - global stylesheet restyles the host | clean | 1 / 2 |
| mangrove-carbon | **FAILED** (19 diffs) | not probed | clean | 0 / 1 |
| delta-mantine | clean | not probed | clean | 0 / 0 |
| mangrove-mantine | clean | not probed | clean | 0 / 0 |

## A5 - Theming fidelity and propagation

`unreachable` tokens are a ceiling, not a cost: there is no hook to attach them to.
`propagation` is how a Mangrove token change reaches a built site - a stylesheet
swap reaches every site at once; a rebuild is per site, forever.

| Pairing | tokens applied | unreachable | propagation | live var() refs in shipped CSS |
| --- | --- | --- | --- | --- |
| delta-react-aria | 48 | 0 | **stylesheet-swap** | 257 |
| mangrove-react-aria | 47 | 0 | **stylesheet-swap** | 226 |
| delta-mui | 29 | 0 | **rebuild-per-site** | 0 |
| mangrove-mui | 32 | 0 | **rebuild-per-site** | 0 |
| delta-carbon | 50 | **21** | **stylesheet-swap** | 190 |
| mangrove-carbon | 50 | **22** | **stylesheet-swap** | 157 |
| delta-mantine | 66 | **5** | **mostly-rebuild** | 6 |
| mangrove-mantine | 62 | 0 | **mostly-rebuild** | 6 |

## Supporting figures

Reported because they are asked for, not because they decide anything.

| Pairing | custom CSS lines | bundle kB gz | dependencies | build s |
| --- | --- | --- | --- | --- |
| delta-react-aria | 715 | 238.8 | 19 | 2 |
| mangrove-react-aria | 661 | 237.6 | 20 | 1.2 |
| delta-mui | 14 | 387.4 | 142 | 2.4 |
| mangrove-mui | 27 | 397.6 | 158 | 1.7 |
| delta-carbon | 300 | 261.5 | 145 | 2.8 |
| mangrove-carbon | 351 | 207.8 | 146 | 4.7 |
| delta-mantine | 72 | 238.8 | 112 | 2.6 |
| mangrove-mantine | 103 | 270.9 | 113 | 3.58 |

