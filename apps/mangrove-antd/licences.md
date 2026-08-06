# Licences - mangrove-antd

Production dependency tree for Ant Design 6.5.3 on the Mangrove host.

Measured with `pnpm --filter ./apps/mangrove-antd licenses list --prod`. The summary
figure is regenerated for every app by `scripts/count-dependencies.mjs`
(`pnpm deps:count`) and stored in `docs/dependency-counts.json`.

## Summary

| | |
| --- | --- |
| Production packages | **69** |
| Distinct licences | **2** |
| Licence breakdown | MIT 68, Apache-2.0 1 |
| Copyleft obligations | none |
| Font licences | none |

The single Apache-2.0 entry is `@undrr/undrr-mangrove` itself, which this pairing
consumes as a published package rather than vendoring. Everything antd brings is
MIT, which is the cleanest licence position of any candidate in this evaluation.

## Direct dependencies

| Package | Version | Licence | Why |
| --- | --- | --- | --- |
| `antd` | 6.5.3 | MIT | the candidate library |
| `@ant-design/cssinjs` | 2.1.2 | MIT | `StyleProvider`, for the `layer` containment setting |
| `dayjs` | 1.11.21 | MIT | date engine the pickers require |
| `react`, `react-dom` | 19.2.8 | MIT | peer requirement |
| `@undrr-eval/integration-antd` | workspace | Apache-2.0 | this repository: the shared antd integration |
| `@undrr/undrr-mangrove` | 1.8.1 | Apache-2.0 | the real published UNDRR design system, consumed as a package |
| `@undrr-eval/host-mangrove` | workspace | Apache-2.0 | this repository: the host shell |
| `@undrr-eval/fixtures` | workspace | Apache-2.0 | this repository: shared data and labels |
| `@undrr-eval/undrr-tokens` | workspace | Apache-2.0 | this repository: the theming target |
| `@undrr-eval/test-harness` | workspace | Apache-2.0 | this repository: axe, leakage, screenshots |

Workspace packages are this repository's own code and are not counted in the 69.
`@undrr/undrr-mangrove` IS counted, because it is a real published dependency.

## Shape of the tree

`antd` declares **47 direct dependencies**, of which:

- **36** are `@rc-component/*` - the rc-* component primitives (table, picker,
  select, trigger, dialog, tree, menu, and so on)
- **6** are `@ant-design/*` - `cssinjs`, `cssinjs-utils`, `icons`, `colors`,
  `fast-color`, `react-slick`
- the remainder are `dayjs`, `clsx`, `throttle-debounce`,
  `scroll-into-view-if-needed` and `@babel/runtime`

The maintenance-surface observation is breadth rather than licence risk: many
small packages, but nearly all under two orgs belonging to the same project, so
they version together rather than independently.

## Comparison with the other candidates

Production packages, all measured the same way:

Mangrove-host figures, so each includes the one Apache-2.0 Mangrove package:

| Candidate | Packages | Licences |
| --- | --- | --- |
| React Aria | 17 | Apache-2.0 9, MIT 7, 0BSD 1 |
| Mantine | 28 | MIT 25, Apache-2.0 1, 0BSD 1, (MIT OR CC0-1.0) 1 |
| **Ant Design** | **69** | **MIT 68, Apache-2.0 1** |
| Carbon | 79 | MIT 51, Apache-2.0 17, OFL-1.1 9, BSD-3-Clause 1, 0BSD 1 |
| MUI | 93 | MIT 87, Apache-2.0 1, BSD-3-Clause 3, ISC 2 |

Two things this table makes visible that a single row would not:

1. **antd carries no font licences.** Carbon's 9 OFL-1.1 packages are IBM Plex,
   which brings a font-redistribution obligation antd does not.
2. **antd has no install-time telemetry.** Telemetry was found in 21 Carbon and
   Plex packages and is tracked in this repository's issue #8. Nothing equivalent
   appears in antd's tree.

### A note on the figures

The `bundle.dependencyCount` values recorded in other apps' `evidence.json` are
**not** comparable with each other: each run measured however it chose, and the
disagreement changes the ordering. Mantine was recorded at 112 where a
production-only count gives 27. The table above uses one method for all ten apps,
and it is the only dependency figure in this repository that is safe to compare
across rows.

## Governance

Ant Design is developed by Ant Group and the surrounding AFX community. Licence,
origin and project governance are separate questions, and origin is a procurement
matter for UNDRR to weigh alongside the licence - the same class of question as
the Carbon telemetry finding. It is raised here as a matter for that decision and
not as a technical objection; nothing in this evaluation examined it.
