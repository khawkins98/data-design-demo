# mangrove-react-aria

Adobe React Aria Components on the UNDRR Mangrove host shell.

One of eight controlled demos. See `EVIDENCE.md` for findings and
`evidence.json` for the structured record.

## Run

From the repository root:

```sh
pnpm install
pnpm build:packages                                  # host-delta compiles its CSS
pnpm --filter @undrr-eval/mangrove-react-aria dev     # http://localhost:5190
```

## The candidate query parameter

The leakage assertion loads the page twice and diffs the host canaries:

| URL | Renders |
| --- | --- |
| `/` or `/?candidate=on` | Host shell with the React Aria subtree |
| `/?candidate=off` | Host shell with an empty candidate subtree — the leakage baseline |

## Build

```sh
pnpm --filter @undrr-eval/mangrove-react-aria build
```

For a GitHub Pages subpath, the shared workflow passes `--base`:

```sh
pnpm --filter @undrr-eval/mangrove-react-aria build -- --base /data-design-demo/mangrove-react-aria/
```

## Test

```sh
pnpm exec playwright install chromium    # once
pnpm --filter @undrr-eval/mangrove-react-aria build
pnpm --filter @undrr-eval/mangrove-react-aria test:e2e
```

33 tests across three viewports. **One fails on purpose:** long labels overflow
the viewport by 261px at 390px width in German. It was left failing rather than
weakened, because a green suite that hid it would be worse evidence. See finding
4 in `EVIDENCE.md`.

Outputs:

- `test-results/axe-*.json` — one per page section, plus scoped and whole-page
- `test-results/leakage.json` — canary computed-style diff
- `test-results/long-labels-*.json` — overflow measurement per viewport
- `screenshots/{mobile,tablet,desktop}/` and `.../rtl/` — 54 PNGs

## Typecheck

```sh
pnpm exec tsc -p apps/mangrove-react-aria/tsconfig.json
```

## Deploy

Handled by `.github/workflows/pages.yml`, which builds every app under `apps/`
with the right `base` and publishes beneath the comparison landing page. No
per-app deploy step.

## Layout

```
src/
  main.tsx          entry: stylesheet order, mount
  App.tsx           host shell, locale switcher (section 8), section order
  demo-state.ts     locale context, sort/filter helpers, mocked load states
  theme.css         all 624 lines of candidate styling
  sections/         one file per kitchen-sink section
e2e/demo.spec.ts    evidence run
```

`theme.css` is the implementation cost this demo exists to measure — React Aria
ships no CSS, so every visual decision is in that file.
