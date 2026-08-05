# Licences: delta-react-aria

Brief 1 constraint 2 requires the licence of every transitive dependency to be
checked, and forbids any paid, Pro, Premium, trial-key, evaluation-licence or
non-approved package.

**Result: no paid, trial or evaluation-licensed package is used, at any depth.**

Audited with:

```sh
pnpm licenses list --json --filter ./apps/delta-react-aria
pnpm --filter ./apps/delta-react-aria list --depth Infinity --prod --json
```

## Summary across the full tree

**101 unique packages** resolved for this app, including build and test tooling.

| Licence | Packages |
| --- | --- |
| MIT | 78 |
| Apache-2.0 | 13 |
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
| `@undrr-eval/*` | workspace | Apache-2.0 | yes |
| `tailwindcss` (via `host-delta`) | 4.2.x | MIT | yes (compiled CSS only) |
| `vite` | 6.x | MIT | no (build only) |
| `@vitejs/plugin-react` | 4.x | MIT | no (build only) |
| `@playwright/test` | 1.58.x | Apache-2.0 | no (test only) |

## The runtime tree that actually ships

**19 production packages resolve transitively**, of which 13 belong to the
candidate's own subtree:

| Package | Version | Licence |
| --- | --- | --- |
| `react-aria-components` | 1.20.0 | Apache-2.0 |
| `react-aria` | 3.51.0 | Apache-2.0 |
| `react-stately` | 3.49.0 | Apache-2.0 |
| `@react-types/shared` | 3.36.1 | Apache-2.0 |
| `@internationalized/date` | 3.12.3 | Apache-2.0 |
| `@internationalized/number` | 3.6.7 | Apache-2.0 |
| `@internationalized/string` | 3.2.10 | Apache-2.0 |
| `@swc/helpers` | 0.5.23 | Apache-2.0 |
| `client-only` | 0.0.1 | MIT |
| `clsx` | 2.1.1 | MIT |
| `aria-hidden` | 1.2.6 | MIT |
| `tslib` | 2.8.1 | 0BSD |
| `use-sync-external-store` | 1.6.0 | MIT |

Plus `react`, `react-dom` and the four `@undrr-eval/*` workspace links.

Worth noting for the comparison: React Aria's shipped tree is **13 packages**
against MUI's 142 in `delta-mui`. The candidate's own dependency surface is
small; its bundle is not (see below), because the components themselves are the
weight.

## The three non-MIT/Apache entries, examined

None reach shipped output.

**`caniuse-lite` — CC-BY-4.0.** Browser-support data used by `browserslist`
during the build. CC-BY-4.0 is an attribution licence on a dataset, not code, and
the data is not emitted into the bundle. Standard across the JavaScript
ecosystem.

**`lightningcss` and `lightningcss-darwin-arm64` — MPL-2.0.** Vite's CSS
transformer. MPL-2.0 is a weak, file-level copyleft: it obliges you to publish
modifications *to those files*, which we do not make. Build-time only; no
MPL-licensed code is included in the output. Same position as any Vite project.

## Requirements met without a paid tier

Worth stating explicitly, because this is where candidates diverge:

- **`datetime-range-picker`** — `DateRangePicker` with `granularity="minute"` is
  in `react-aria-components` itself. No Pro tier exists for React Aria.
- **`table-column-resize-or-reorder`** — `ResizableTableContainer` and
  `ColumnResizer` are in the same package.
- **`combobox-searchable`**, **`multiselect`**, **`accordion`**,
  **`table-multiselect`** — all free tier.

React Aria has no commercial tier at all, so constraint 2 was never at risk here.
Contrast MUI, whose `@mui/x-date-pickers-pro` and `@mui/x-data-grid-pro` are
`SEE LICENSE IN LICENSE` commercial packages.

## Installed size

Not captured. `pnpm` uses a content-addressed store with hard links, so a per-app
`du` of `node_modules` reports store-wide shared content rather than this app's
marginal cost, and would overstate it substantially.

The meaningful figure for comparison is shipped bundle size, recorded in
`evidence.json`: **238.8 kB gzipped JavaScript** (888.9 kB raw) and **5.9 kB
gzipped CSS** (30.3 kB raw). The CSS figure is small because Delta's host
stylesheet is a Tailwind build scoped to the host shell — 11.8 kB before
minification — rather than a 197 kB design-system stylesheet as on the Mangrove
host. Both figures are directly comparable across the eight demos; installed size
is not.
