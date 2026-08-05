# delta-mui

MUI Community edition on the PreventionWeb Delta host shell.

One of eight controlled demos. See `EVIDENCE.md` for findings and
`evidence.json` for the structured record.

## Run

From the repository root:

```sh
pnpm install
pnpm build:packages                        # host-delta compiles its Tailwind CSS
pnpm --filter @undrr-eval/delta-mui dev    # http://localhost:5192
```

Or browse it alongside the other demos:

```sh
pnpm site        # http://localhost:4180
```

## The candidate query parameter

The leakage assertion loads the page twice and diffs the host canaries:

| URL | Renders |
| --- | --- |
| `/` or `/?candidate=on` | Host shell with the MUI subtree |
| `/?candidate=off` | Host shell with an empty candidate subtree — the leakage baseline |

## Build

```sh
pnpm --filter @undrr-eval/delta-mui build
```

Do not pass `--base` by hand; `scripts/build-apps.mjs` supplies it for both local
and Pages builds and verifies it applied.

## Test

```sh
pnpm exec playwright install chromium    # once
pnpm --filter @undrr-eval/delta-mui build
pnpm --filter @undrr-eval/delta-mui test:e2e
```

30 tests across three viewports, all passing.

Outputs:

- `test-results/axe-*.json` — one per page section, plus scoped and whole-page
- `test-results/leakage.json` — canary computed-style diff
- `test-results/long-labels-*.json` — overflow measurement per viewport
- `screenshots/{mobile,tablet,desktop}/` and `.../rtl/`

## Two things to know before reading the code

**`CssBaseline` is deliberately absent.** It is MUI's global reset and writes to
`html`, `body` and `*`, which would restyle the host's canary elements and fail
the leakage assertion by design. `ScopedCssBaseline` is used instead. This is a
real deviation from MUI's intended setup and is recorded as such.

**Styling lives in `src/theme.ts`, not in CSS.** `src/demo.css` is 14 lines.
MUI is themed through a JavaScript object, so `theme.ts` is where the token
mapping happens and where the implementation cost sits.

## Layout

```
src/
  main.tsx          entry: stylesheet order, mount, the CssBaseline note
  App.tsx           host shell, theme + locale providers, section order
  theme.ts          UNDRR tokens mapped into MUI's theme object
  demo-state.ts     locale context, mocked load states
  demo.css          14 lines; grid width cap and header wrapping
  sections/         one file per kitchen-sink section
e2e/demo.spec.ts    evidence run
```
