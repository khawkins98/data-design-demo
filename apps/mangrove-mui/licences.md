# Licences: mangrove-mui

Brief 1 constraint 2 requires the licence of every transitive dependency to be
checked, and forbids any paid, Pro, Premium, trial-key, evaluation-licence or
non-approved package.

**Result: no paid, trial or evaluation-licensed package is used, at any depth.**
No `SEE LICENSE IN` entry appears anywhere in the resolved tree. The commercially
licensed MUI X Pro packages are deliberately absent, which is the substance of
this run's date-range finding.

Audited with:

```sh
pnpm licenses list --json --filter ./apps/mangrove-mui
```

## Summary across the full tree

**158 unique packages** resolved for this app, including build tooling.

| Licence | Packages |
| --- | --- |
| MIT | 139 |
| Apache-2.0 | 6 |
| ISC | 6 |
| BSD-3-Clause | 4 |
| MPL-2.0 | 2 |
| CC-BY-4.0 | 1 |

All permissive. The non-MIT/Apache entries in detail:

- `caniuse-lite` (CC-BY-4.0) — build-time browser dataset.
- `lightningcss` and `lightningcss-darwin-arm64` (MPL-2.0) — Vite's CSS
  transformer. Build-time only.
- `hoist-non-react-statics`, `react-transition-group` (BSD-3-Clause) — shipped;
  both are emotion/MUI runtime dependencies.
- `source-map`, `source-map-js` (BSD-3-Clause), and the six ISC entries — build
  tooling.

None of the copyleft-adjacent entries reach shipped output; the position is
identical to any Vite project.

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
| `@undrr/undrr-mangrove` | 1.8.1 | Apache-2.0 | yes (the host stylesheet) |
| `@undrr-eval/*` | workspace | Apache-2.0 | yes |
| `vite`, `@vitejs/plugin-react` | 6.x, 4.x | MIT | no (build only) |
| `@playwright/test` | 1.62.x | Apache-2.0 | no (test only) |

## The packages deliberately NOT installed

This is the point of this run, so it is worth stating precisely.

| Package | Licence | What it would have given us |
| --- | --- | --- |
| `@mui/x-date-pickers-pro` | `SEE LICENSE IN LICENSE` | `DateRangePicker`, `DateTimeRangePicker` — a native `datetime-range-picker` |
| `@mui/x-data-grid-pro` | `SEE LICENSE IN LICENSE` | Column reordering, tree data, row pinning |
| `stylis-plugin-rtl` | MIT, but third-party | Complete RTL flipping of emotion's physical CSS offsets — the fix for this run's one failing test |

`SEE LICENSE IN LICENSE` is MUI's marker for its commercial licence, which
requires a paid per-developer seat. Both Pro packages are therefore excluded by
constraint 2.

`stylis-plugin-rtl` is excluded for a different reason: it is permissively
licensed but sits **outside the candidate's own ecosystem**, and constraint 2
forbids filling a candidate gap with a third-party package. Its absence is the
direct cause of the failing RTL assertion documented in `EVIDENCE.md`. Recording
that as a cost of MUI is the correct outcome under this brief — MUI's RTL story
depends on a package MUI does not publish.

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

Only three `@mui` packages are installed at all:

```sh
ls node_modules/@mui
# material  x-data-grid  x-date-pickers
```

For the data grid, the community build **does** ship column resizing —
`GridColDef.resizable` and the `disableColumnResize` prop both exist — while
`disableColumnReorder` appears only in its Pro-omit type list. The brief accepts
resize **or** reorder, so `table-column-resize-or-reorder` is met natively without
the Pro grid.

## No third-party substitution

No date-range library was added. The requirement was met by composing two
free-tier `DateTimePicker`s, which is what `docs/requirements.md` prescribes.

`date-fns` is not a substitution: it is the date adapter `@mui/x-date-pickers`
requires, and MUI documents it as one of the supported adapter options.

## Installed size

Not captured. `pnpm`'s content-addressed store shares packages between apps via
hard links, so a per-app `du` reports store-wide content and overstates the
marginal cost.

The comparable figure is shipped bundle size, in `evidence.json`:

| | This run | `delta-mui` | `mangrove-react-aria` |
| --- | --- | --- | --- |
| JS, gzipped | **397.6 kB** | 387.4 kB | 237.6 kB |
| CSS, gzipped | **35.5 kB** | 3.8 kB | 37.3 kB (measured from its `dist`) |
| Packages | **158** | 142 | 20 |

The JS difference against `delta-mui` (10 kB) is host plumbing, not library. The
CSS difference (32 kB) is Mangrove's own compiled 197 kB stylesheet, which every
Mangrove pairing loads. The 160 kB JS gap against React Aria on the same host is
the clearest quantitative trade-off in the evaluation.
