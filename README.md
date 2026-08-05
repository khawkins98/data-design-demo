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
- **React 19.** The brief specified React 18, but Mantine 9 declares
  `peerDependencies.react: ^19.2.0` and will not install on 18 at all, which
  would kill two of the eight pairings outright. Both Delta and Mangrove develop
  against React 19, and all four candidates support it.

## Reading order

| Document | What it settles |
| --- | --- |
| `docs/requirements.md` | Canonical requirement IDs, how to assign each `status`, the date-range fallback, known host baseline axe violations |
| `docs/host-derivation.md` | What was taken from Delta and Mangrove, what was simplified, and the findings that came out of doing so |
| `apps/README.md` | What a Brief 1 run owns and must not touch |

## Install

```sh
pnpm install
```

## Run

**Almost always, you want one command:**

```sh
pnpm site
```

It builds the shared packages, builds every demo with the right subpath, assembles
the comparison site exactly as GitHub Pages serves it, and serves it locally. Vite
prints the URL — normally `http://localhost:4180`, or the next free port if that
one is busy.

The landing page lists all eight pairings with their headline metrics. Built ones
are clickable; the rest show as pending. **This is the only way to click between
demos.**

`pnpm site` and the Pages workflow run the same scripts, so what you browse
locally and what gets published cannot drift.

### Everything else

Only four commands matter day to day:

| Command | When |
| --- | --- |
| `pnpm site` | Look at the demos. The default. |
| `pnpm verify` | Before committing: typecheck + unit tests. |
| `pnpm test` | Unit tests alone. |
| `pnpm typecheck` | Types alone. |

Occasionally useful:

| Command | When |
| --- | --- |
| `pnpm --filter ./apps/delta-mui dev` | Hot reload while editing **one** demo. |
| `pnpm scaffold` | The scaffold control app: both host shells, no candidate library. Useful when debugging the harness rather than a demo. |
| `pnpm scaffold:test` | Run the harness against that control. |
| `pnpm test:e2e` | Playwright across all demos. Slow. |

The rest (`build:packages`, `build:apps`, `site:assemble`, `site:serve`) are the
individual steps `pnpm site` chains together. CI calls them separately; you
normally should not need to.

`fixtures:generate`, `tokens:css` and `mangrove2:tokens` regenerate committed
files and should almost never be run — see *Regenerating fixed inputs* below.

### Ports

Each app claims a fixed pair so Playwright configs stay in step. Only the
assembled site falls back to another port if its preferred one is taken.

| Target | Dev | Preview |
| --- | --- | --- |
| Assembled site (`pnpm site`) | — | 4180, or next free |
| `packages/host-preview` (`pnpm scaffold`) | 5180 | 5181 |
| `apps/mangrove-react-aria` | 5190 | 5191 |
| `apps/delta-mui` | 5192 | 5193 |

### The `candidate` query parameter

Every demo, and the scaffold control, honours `?candidate=off`: it renders the
host shell with an **empty** candidate subtree.

That is not a debugging convenience, it is how the leakage assertion works. The
harness loads the page twice, once each way, and diffs the computed styles of the
host's canary elements. If a candidate library reached outside its own subtree,
the diff is non-empty.

| URL | Renders |
| --- | --- |
| `?candidate=on` (or omitted) | Host shell plus the candidate library |
| `?candidate=off` | Host shell alone — the leakage baseline |

`pnpm scaffold` also takes `?host=delta` or `?host=mangrove` to switch host shell,
since it is the one app that can render either.

## Build

```sh
pnpm build:packages    # shared packages; host-delta compiles its Tailwind CSS
pnpm build:apps        # every app, each with the correct base path
pnpm site:assemble     # regenerate the landing page, then collect everything into _site/
```

`pnpm site` chains all three and then serves the result, which is usually what
you want instead.

`build:packages` runs before `build:apps` because apps import
`@undrr-eval/host-delta/host.css`, which is a build output.

Each demo is served from a subpath, so it must be built with a matching Vite
`base` or every asset URL resolves to the site root. `build:apps` handles this
and then **verifies the base actually landed in `dist/index.html`** — a wrong
base produces a site that serves but cannot load, which a build exit code will
not catch. Set `BASE_PREFIX` for a Pages build:

```sh
BASE_PREFIX=/data-design-demo pnpm build:apps
```

## Test

```sh
pnpm verify            # typecheck + unit tests. Run this before committing.
pnpm test              # unit tests (Vitest)
pnpm test:e2e          # browser tests and screenshots (Playwright), all demos
pnpm typecheck         # TypeScript strict mode across all projects
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
