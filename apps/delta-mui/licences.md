# Licences: delta-mui

Brief 1 constraint 2 requires the licence of every transitive dependency to be
checked, and forbids any paid, Pro, Premium, trial-key, evaluation-licence or
non-approved package.

**Result: no paid, trial or evaluation-licensed package is used, at any depth.**
The commercially licensed MUI X Pro packages are deliberately absent, which is
the substance of this run's date-range finding.

Audited with:

```sh
pnpm licenses list --json --filter @undrr-eval/delta-mui
```

## Summary across the full tree

142 unique packages resolved for this app, including build tooling.

| Licence | Packages |
| --- | --- |
| MIT | 124 |
| ISC | 6 |
| Apache-2.0 | 5 |
| BSD-3-Clause | 4 |
| MPL-2.0 | 2 |
| CC-BY-4.0 | 1 |

All permissive. The three non-MIT/Apache entries are `caniuse-lite` (CC-BY-4.0,
a build-time dataset) and `lightningcss` plus its darwin-arm64 binary (MPL-2.0,
Vite's CSS transformer). None reach shipped output; the position is identical to
any Vite project.

## Direct dependencies

| Package | Version | Licence | Ships to browser |
| --- | --- | --- | --- |
| `@mui/material` | 9.3.0 | MIT | yes |
| `@mui/x-date-pickers` | 9.10.1 | MIT | yes |
| `@mui/x-data-grid` | 9.10.1 | MIT | yes |
| `@emotion/react` | 11.14.0 | MIT | yes |
| `@emotion/styled` | 11.14.1 | MIT | yes |
| `date-fns` | 4.4.0 | MIT | yes |
| `react`, `react-dom` | 19.2.8 | MIT | yes |
| `@undrr-eval/*` | workspace | Apache-2.0 | yes |
| `vite`, `@vitejs/plugin-react` | 6.x, 4.x | MIT | no (build only) |
| `@playwright/test` | 1.58.x | Apache-2.0 | no (test only) |

## The packages deliberately NOT installed

This is the point of this run, so it is worth stating precisely.

| Package | Licence | What it would have given us |
| --- | --- | --- |
| `@mui/x-date-pickers-pro` | `SEE LICENSE IN LICENSE` | `DateRangePicker`, `DateTimeRangePicker` — a native `datetime-range-picker` |
| `@mui/x-data-grid-pro` | `SEE LICENSE IN LICENSE` | Column reordering, tree data, row pinning |

`SEE LICENSE IN LICENSE` is MUI's marker for its commercial licence, which
requires a paid per-developer seat. Both are therefore excluded by constraint 2.

### Verified empirically, not from memory

The community date-pickers package contains **no range components at all**:

```sh
ls node_modules/@mui/x-date-pickers | grep -i range
# (no output)
```

Its component list is `DatePicker`, `DateTimePicker`, `TimePicker`,
`DesktopDatePicker`, `DesktopDateTimePicker`, `MobileDatePicker`,
`MobileDateTimePicker`, `StaticDatePicker`, `StaticDateTimePicker`,
`DateCalendar`, `DateField`, `DateTimeField`, `TimeField`, the clock components
and the adapters. No `Range` anything.

For the data grid, the community build **does** ship column resizing —
`GridColDef.resizable` and the `disableColumnResize` prop both exist — while
`disableColumnReorder` appears only in its Pro-omit type list. The brief accepts
resize **or** reorder, so `table-column-resize-or-reorder` is met natively
without the Pro grid.

## No third-party substitution

Constraint 2 also forbids filling a gap with a package outside the candidate's
ecosystem. No date-range library was added. The requirement was met by composing
two free-tier `DateTimePicker`s, which is what `docs/requirements.md` prescribes.

`date-fns` is not a substitution: it is the date adapter `@mui/x-date-pickers`
requires, and MUI documents it as one of the supported adapter options.

## Installed size

Not captured. `pnpm`'s content-addressed store shares packages between apps via
hard links, so a per-app `du` reports store-wide content and overstates the
marginal cost.

The comparable figure is shipped bundle size, in `evidence.json`: **387.4 kB
gzipped JavaScript** and **3.8 kB gzipped CSS**, from **142 dependencies**.

For context, the `mangrove-react-aria` run ships **237.6 kB** gzipped JS from
**20** dependencies. That 149 kB gzipped difference is the clearest quantitative
trade-off in the evaluation so far.
