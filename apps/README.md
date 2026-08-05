# apps/

One directory per candidate/host pairing. Empty until Brief 1 runs begin.

## Naming convention

```
apps/{host}-{candidate}
```

`host` is `delta` or `mangrove`. `candidate` is `react-aria`, `mui`, `carbon` or
`mantine`. That gives exactly eight directories:

| | Delta | Mangrove |
| --- | --- | --- |
| Adobe React Aria | `delta-react-aria` | `mangrove-react-aria` |
| MUI (Community) | `delta-mui` | `mangrove-mui` |
| IBM Carbon | `delta-carbon` | `mangrove-carbon` |
| Mantine | `delta-mantine` | `mangrove-mantine` |

The directory name is the GitHub Pages subpath, so a demo deploys to
`/<repo>/delta-mui/` and must be built with a matching Vite `base`.

`pnpm-workspace.yaml` globs `apps/*`, so a new app joins the workspace with no
shared-file edit. All eight pairings are already pre-registered in
`docs/manifest.json`, so a run does not need to edit that either — the landing
page picks up your `evidence.json` automatically.

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
