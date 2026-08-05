# data-design-demo

UNDRR's evaluation of data design systems.

Eight controlled proofs of concept: four candidate UI libraries built against
two UNDRR host shells, each rendering the same kitchen-sink page over the same
fixture data, so the results can actually be compared.

This is exploratory work on a personal account. It is not a UNDRR product and
carries no UNDRR endorsement.

## What this repository is

A **scaffold** plus, eventually, eight demos.

The scaffold fixes everything that would otherwise vary between demos — the
data, the labels, the date, the design tokens, the page frame, the test
harness — so that differences between two demos are attributable to the
candidate library rather than to eight agents each inventing their own setup.

| Candidate | Package | Licence |
| --- | --- | --- |
| Adobe React Aria | `react-aria-components` | Apache-2.0 |
| MUI (Community only) | `@mui/material` | MIT |
| IBM Carbon | `@carbon/react` | Apache-2.0 |
| Mantine | `@mantine/core` | MIT |

Against two hosts: **Delta** (Tailwind 4, from
[`PreventionWeb/delta`](https://github.com/PreventionWeb/delta)) and **Mangrove**
(the UNDRR design system, from
[`unisdr/undrr-mangrove`](https://github.com/unisdr/undrr-mangrove)).

## Layout

```
apps/                    one directory per host-candidate pairing (see apps/README.md)
packages/fixtures        shared data, labels, options, fixed date, validation cases
packages/undrr-tokens    neutral design tokens, CSS custom properties and TS
packages/host-delta      Delta host shell
packages/host-mangrove   Mangrove host shell
packages/test-harness    Playwright config, axe wrapper, screenshots, leakage assertion
docs/                    comparison landing page and its manifest
scripts/                 generators for fixtures, tokens CSS and the landing page
```

## Requirements

- **Node 22 LTS.** Pinned in `.nvmrc`. Node 20 was specified in the original
  brief but reached end of life in April 2026, and the Mangrove package requires
  `>=22`.
- **pnpm 10.**

## Install

```sh
pnpm install
```

## Run

```sh
pnpm dev                                  # every app in parallel
pnpm --filter ./apps/delta-mui dev        # one app
```

## Build

```sh
pnpm build:packages    # shared packages; host-delta compiles its Tailwind CSS
pnpm build             # every app under apps/
pnpm docs:index        # regenerate the comparison landing page
```

`build:packages` must run before `build`, because apps import
`@undrr-eval/host-delta/host.css`, which is a build output. `pnpm -r` resolves
this order automatically from the workspace dependency graph.

## Test

```sh
pnpm test              # unit tests (Vitest)
pnpm test:e2e          # browser tests and screenshots (Playwright)
pnpm typecheck         # TypeScript strict mode across all projects
pnpm verify            # typecheck + unit tests + landing page
```

Playwright needs its browsers once:

```sh
pnpm exec playwright install chromium
```

## Regenerating fixed inputs

```sh
pnpm fixtures:generate   # rewrites packages/fixtures/src/records.generated.ts
pnpm tokens:css          # rewrites packages/undrr-tokens/src/tokens.css from tokens.ts
```

Do not regenerate the fixtures during an evaluation round. The dataset is a
committed constant precisely so that every demo renders identical content, and
re-rolling it invalidates every screenshot already captured against the old
data. A test fails if `tokens.css` drifts from `tokens.ts`.

## Deployment

One GitHub Actions workflow (`.github/workflows/pages.yml`) builds every app
under `apps/` with `--base /<repo>/<app>/` and publishes them beneath the
landing page:

```
https://khawkins98.github.io/data-design-demo/                    landing page
https://khawkins98.github.io/data-design-demo/delta-mui/          one demo
```

Pull requests build, typecheck and test but do not publish.

Pages must be enabled once in repository settings with **Source: GitHub
Actions**.

## Commit conventions

A `commit-msg` hook enforces Conventional Commits, a 72-character ASCII subject,
and no AI-agent co-author trailers. Enable it once after cloning:

```sh
git config core.hooksPath .githooks
```

See `.githooks/README.md`.

## Licence

Apache-2.0. Both host design systems it derives from are Apache-2.0; see
`docs/host-derivation.md` for what was taken from each.
