# Licences: mangrove-react-aria

Brief 1 constraint 2 requires the licence of every transitive dependency to be
checked, and forbids any paid, Pro, Premium, trial-key, evaluation-licence or
non-approved package.

**Result: no paid, trial or evaluation-licensed package is used, at any depth.**

Audited with:

```sh
pnpm licenses list --json --filter @undrr-eval/mangrove-react-aria
```

## Summary across the full tree

88 unique packages resolved for this app, including build tooling.

| Licence | Packages |
| --- | --- |
| MIT | 64 |
| Apache-2.0 | 14 |
| ISC | 5 |
| MPL-2.0 | 2 |
| BSD-3-Clause | 1 |
| 0BSD | 1 |
| CC-BY-4.0 | 1 |

All are permissive and OSI-approved or equivalent. Nothing is copyleft in a way
that reaches shipped output, and nothing requires a key, seat or subscription.

## Direct dependencies

| Package | Version | Licence | Ships to browser |
| --- | --- | --- | --- |
| `react-aria-components` | 1.20.0 | Apache-2.0 | yes |
| `@internationalized/date` | 3.12.3 | Apache-2.0 | yes |
| `react` | 19.2.8 | MIT | yes |
| `react-dom` | 19.2.8 | MIT | yes |
| `@undrr/undrr-mangrove` | 1.8.1 | Apache-2.0 | yes (CSS only) |
| `@undrr-eval/*` | workspace | Apache-2.0 | yes |
| `vite` | 6.x | MIT | no (build only) |
| `@vitejs/plugin-react` | 4.x | MIT | no (build only) |
| `@playwright/test` | 1.58.x | Apache-2.0 | no (test only) |

The candidate's own runtime subtree is **20 unique packages** — `react-aria`,
`react-stately`, the `@react-aria/*`, `@react-stately/*`, `@react-types/*` and
`@internationalized/*` scopes, plus `client-only` and `@swc/helpers`. All
Apache-2.0 or MIT.

## The three non-MIT/Apache entries, examined

None reach shipped output.

**`caniuse-lite` — CC-BY-4.0.** Browser-support data used by `browserslist`
during the build. CC-BY-4.0 is an attribution licence on a dataset, not code, and
the data is not emitted into the bundle. Standard across the JavaScript
ecosystem.

**`lightningcss` and `lightningcss-darwin-arm64` — MPL-2.0.** Vite's CSS
transformer. MPL-2.0 is a weak, file-level copyleft: it obliges you to publish
modifications *to those files*, which we do not make. It is a build-time
dependency and no MPL-licensed code is included in the output. This is the same
position as any Vite project.

## Requirements met without a paid tier

Worth stating explicitly, because this is where candidates diverge:

- **`datetime-range-picker`** — `DateRangePicker` with `granularity="minute"` is
  in `react-aria-components` itself. No Pro tier exists for React Aria.
- **`table-column-resize-or-reorder`** — `ResizableTableContainer` and
  `ColumnResizer` are in the same package.
- **`combobox-searchable`**, **`multiselect`**, **`accordion`** — all free tier.

React Aria has no commercial tier at all, so constraint 2 was never at risk here.
Contrast MUI, whose `@mui/x-date-pickers-pro` and `@mui/x-data-grid-pro` are
`SEE LICENSE IN LICENSE` commercial packages.

## Installed size

Not captured in this run. `pnpm` uses a content-addressed store with hard links,
so a per-app `du` of `node_modules` reports store-wide shared content rather than
this app's marginal cost, and would overstate it substantially.

The meaningful figure for comparison is shipped bundle size, recorded in
`evidence.json`: **237.6 kB gzipped JavaScript** and **36.4 kB gzipped CSS**, the
latter including Mangrove's 197 kB source stylesheet. Both are directly
comparable across the eight demos; installed size is not.
