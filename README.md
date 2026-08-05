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

### Browsing every demo from one URL

This is almost certainly what you want. It builds everything, assembles the
comparison site exactly as GitHub Pages will serve it, and serves it locally:

```sh
pnpm site        # http://localhost:4180
```

The landing page lists all eight pairings; built ones are clickable, the rest
show as pending. This is the only way to click *between* demos — `pnpm dev`
starts each app on its own isolated port with nothing linking them.

`pnpm site` and the Pages workflow call the same two scripts
(`scripts/build-apps.mjs`, `scripts/build-site.mjs`), so what you browse locally
and what gets published cannot drift.

### Working on a single demo

```sh
pnpm --filter ./apps/mangrove-react-aria dev    # hot reload, one app
pnpm preview                                    # the scaffold preview, no candidate library
pnpm dev                                        # every app at once, one port each
```

Ports are fixed per app so Playwright configs stay in step:

| Target | Dev | Preview |
| --- | --- | --- |
| Assembled site (`pnpm site`) | — | 4180 |
| `packages/host-preview` | 5180 | 5181 |
| `apps/mangrove-react-aria` | 5190 | 5191 |
| `apps/delta-mui` | 5192 | 5193 |

Each further pairing takes the next free pair. Claim them in `vite.config.ts`
with `strictPort: true` so a collision fails loudly instead of silently moving.

## Looking at the scaffold before any demo exists

`packages/host-preview` is a small app that renders both host shells over the
real fixtures. It is **not** one of the eight demos: its "candidate" subtree is
plain HTML with no component library, which makes it the control. Anything that
fails there is a scaffold bug, not a candidate's.

```sh
pnpm preview      # http://localhost:5180
```

Switch host, candidate state and locale from the toolbar, or by URL:

| URL | Shows |
| --- | --- |
| `/?host=mangrove` | Mangrove host, real design system CSS |
| `/?host=delta` | Delta host, Tailwind 4 with Preflight |
| `/?host=delta&candidate=off` | The leakage baseline: host with an empty candidate subtree |

Then run the harness against it — three viewports, both hosts, leakage
assertion, axe and screenshots:

```sh
pnpm exec playwright install chromium   # once
pnpm preview:test
```

This is what proves the harness works before eight agents depend on it.

## Build

```sh
pnpm build             # shared packages, then every app under apps/
pnpm build:packages    # shared packages only; host-delta compiles its Tailwind CSS
pnpm build:apps        # apps only, each with the correct base path
pnpm docs:index        # regenerate the comparison landing page
pnpm site:assemble     # collect docs/ + apps/*/dist into _site/
```

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
