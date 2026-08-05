# Licences: delta-mantine

Brief 1 constraint 2 requires the licence of every transitive dependency to be
checked, and forbids any paid, Pro, Premium, trial-key, evaluation-licence or
non-approved package.

**Result: no paid, trial or evaluation-licensed package is used, at any depth.**
Mantine has no commercial tier. There is no Pro edition, no seat licence and no
feature behind a key — which is itself a finding, because it is the axis on which
MUI's date-range picker and column reordering sit.

Audited with:

```sh
pnpm licenses list --json --filter @undrr-eval/delta-mantine
```

## Summary across the full tree

112 unique packages resolved for this app, including build tooling.

| Licence | Packages |
| --- | --- |
| MIT | 96 |
| Apache-2.0 | 5 |
| ISC | 5 |
| MPL-2.0 | 2 |
| CC-BY-4.0 | 1 |
| BSD-3-Clause | 1 |
| 0BSD | 1 |
| MIT OR CC0-1.0 | 1 |

All permissive. The four non-MIT/Apache/ISC/BSD entries are:

| Package | Licence | Role |
| --- | --- | --- |
| `caniuse-lite` | CC-BY-4.0 | build-time browser dataset |
| `lightningcss` + `lightningcss-darwin-arm64` | MPL-2.0 | Vite's CSS transformer, build only |
| `tslib` | 0BSD | TypeScript runtime helpers |
| `type-fest` | MIT OR CC0-1.0 | types only; `@mantine/core` uses its `PartialDeep` for `MantineThemeOverride` |

Only `type-fest` is a dependency of the candidate library itself, and it is
type-only so nothing reaches shipped output. The rest is the position of any Vite
project.

For comparison, `delta-mui` resolved 142 packages. Mantine's tree is 30 packages
smaller, and it does not carry a CSS-in-JS runtime (`@emotion/react`,
`@emotion/styled`) because Mantine styles through plain CSS modules and custom
properties.

## Direct dependencies

| Package | Version | Licence | Ships to browser |
| --- | --- | --- | --- |
| `@mantine/core` | 9.5.1 | MIT | yes |
| `@mantine/dates` | 9.5.1 | MIT | yes |
| `@mantine/hooks` | 9.5.1 | MIT | yes |
| `dayjs` | 1.11.21 | MIT | yes |
| `react`, `react-dom` | 19.2.8 | MIT | yes |
| `@undrr-eval/*` | workspace | Apache-2.0 | yes |
| `vite`, `@vitejs/plugin-react` | 6.4.x, 4.7.x | MIT | no (build only) |
| `@playwright/test` | 1.62.x | Apache-2.0 | no (test only) |

## What `@mantine/core` pulls in at runtime

Five packages, all MIT (or MIT OR CC0-1.0):

| Package | Version | Licence | Why |
| --- | --- | --- | --- |
| `@floating-ui/react` | 0.27.20 | MIT | overlay positioning for Popover, Tooltip, Combobox, Menu |
| `clsx` | 2.1.1 | MIT | class name joining |
| `react-number-format` | 5.4.5 | MIT | `NumberInput` |
| `react-remove-scroll` | 2.7.2 | MIT | scroll lock for `Modal` and `Drawer` |
| `type-fest` | 5.8.0 | MIT OR CC0-1.0 | types only |

`@mantine/dates` adds only `clsx`, and peer-depends on `dayjs >= 1.0.0` — so the
date formatter is the consumer's choice of version rather than a bundled one.

## The package deliberately NOT installed

This is the point of this run's section 6, so it is worth stating precisely.

| Package | Licence | What it would have given us |
| --- | --- | --- |
| `mantine-datatable` | MIT | Sorting, filtering, pagination, row selection, column resizing and reordering over Mantine's `Table` |

`mantine-datatable` is free and MIT-licensed, and Mantine's own documentation
links to it as the answer for data tables. It was **not** installed, because Brief
1's rule is about the candidate's own ecosystem rather than about cost: a gap that
needs a package outside the library is a gap in the library. Recording the 339
lines it would have replaced is the measurement this evaluation exists to take.

Note the asymmetry with `delta-mui`, which is the useful comparison. MUI's gap is
**commercial** — `@mui/x-date-pickers-pro` and `@mui/x-data-grid-pro` are behind a
per-developer seat, so UNDRR would pay for a native date range and column
reordering. Mantine's gap is **architectural** — the data grid is free but is not
Mantine's, so UNDRR would take on a second maintainer's release cadence, or write
the model itself as this demo did.

### Verified empirically, not from memory

Mantine's `Table` really does ship no data-grid behaviour:

```sh
grep -E "sort|filter|paginat|select|resiz" \
  node_modules/@mantine/core/lib/components/Table/Table.d.ts
# (no output)
```

And `DateTimePicker` really does support ranges:

```sh
grep -n "type?: Type\|endTimePickerProps\|allowSingleDateInRange" \
  node_modules/@mantine/dates/lib/components/DateTimePicker/DateTimePicker.d.ts
# 11:    type?: Type;
# 25:    endTimePickerProps?: Omit<TimePickerProps, 'defaultValue' | 'value'>;
# 35:    allowSingleDateInRange?: Type extends 'range' ? boolean : never;
```
