# apps/

One directory per candidate/host pairing. Empty until Brief 1 runs begin.

## Naming convention

```
apps/{host}-{candidate}
```

`host` is `delta` or `mangrove`. `candidate` is `react-aria`, `mui`, `carbon`,
`mantine` or `antd`. That gives ten directories:

| | Delta | Mangrove |
| --- | --- | --- |
| Adobe React Aria | `delta-react-aria` | `mangrove-react-aria` |
| MUI (Community) | `delta-mui` | `mangrove-mui` |
| IBM Carbon | `delta-carbon` | `mangrove-carbon` |
| Mantine | `delta-mantine` | `mangrove-mantine` |
| Ant Design | `delta-antd` | `mangrove-antd` |

shadcn/ui was considered and deliberately NOT built as a pairing. Its
distribution model is to copy component source into the consuming project, so
each site would own a divergent fork with no upstream upgrade path - which is
the failure mode axis A3 exists to detect. The reasoning is recorded in
`docs/extraction-results.json` rather than left implicit.

The directory name is the GitHub Pages subpath, so a demo deploys to
`/<repo>/delta-mui/`.

**Do not hard-code `base` in your `vite.config.ts`.** Leave it at the default;
`scripts/build-apps.mjs` passes the right value for both local and Pages builds,
and then verifies it landed in `dist/index.html`. Hard-coding it breaks local
`pnpm site`.

Claim the next free port pair with `strictPort: true`, so a collision fails
loudly rather than silently moving and desynchronising your Playwright config:

```ts
server: { port: 5194, strictPort: true },
preview: { port: 5195, strictPort: true },
```

Taken so far: 5180/5181 (`host-preview`), then 5190 upwards for the pairings.
`delta-antd` holds 5206/5207 and `mangrove-antd` holds 5208/5209, so the next
free pair is 5210/5211.

## Seeing your demo alongside the others

```sh
pnpm site
```

Builds everything and serves the assembled comparison site — the only place you
can click between demos. Vite prints the URL.

While iterating on your own demo, `pnpm --filter ./apps/<host>-<candidate> dev`
gives you hot reload on your fixed port.

`pnpm-workspace.yaml` globs `apps/*`, so a new app joins the workspace with no
shared-file edit. Every pairing is pre-registered in `docs/manifest.json`, so a
run does not need to edit that either - the landing page picks up your
`evidence.json` automatically.

Two things a NEW candidate does have to touch, because they cannot be globbed:
`docs/manifest.json` needs the candidate entry, and `tsconfig.json` needs a
project reference if the run adds a shared `packages/integration-<candidate>`.

## What a Brief 1 run owns

Everything inside its own directory, and nothing else:

```
apps/{host}-{candidate}/
  README.md          run, build, test and deploy instructions
  EVIDENCE.md        prose implementation notes
  evidence.json      the structured comparison record
  licences.md        full dependency tree with licence, and installed size
  test-results/      axe JSON per section, unit and Playwright output
  screenshots/       one set per viewport, per section, plus an RTL set
  e2e/               Playwright specs
  src/               the kitchen-sink page
```

## What a run must not touch

`packages/fixtures`, `packages/undrr-tokens`, `packages/host-delta`,
`packages/host-mangrove` and `packages/test-harness` are import-only. If one of
them cannot express what you need, that is a finding for `EVIDENCE.md` and
`evidence.json.blockers` — not an edit.

## The `candidate` query parameter

The leakage assertion loads your page twice, once with `?candidate=off` and once
with `?candidate=on`, and diffs the host canaries' computed styles across the
two. Your page must honour that parameter by rendering the host shell with an
empty candidate subtree when it is `off`.

Comparing across a reload rather than a React unmount is deliberate: stylesheets
a library injects at import time are not removed on unmount, and would otherwise
be present in both snapshots and cancel out.
