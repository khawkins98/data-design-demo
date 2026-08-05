# mangrove-mui

MUI Community edition on the UNDRR Mangrove host shell.

One of eight controlled demos. See `EVIDENCE.md` for findings and `evidence.json`
for the structured record. Its twin is `apps/delta-mui` — same library, different
host — and the two are written to be diffable on purpose.

## Run

From the repository root:

```sh
pnpm install
pnpm --filter @undrr-eval/mangrove-mui dev    # http://localhost:5196
```

No `pnpm build:packages` step is needed for this host: `host-mangrove` consumes
Mangrove's prebuilt `css/style.css` rather than compiling Sass.

Or browse it alongside the other demos:

```sh
pnpm site
```

## The candidate query parameter

The leakage assertion loads the page twice and diffs the host canaries:

| URL | Renders |
| --- | --- |
| `/` or `/?candidate=on` | Host shell with the MUI subtree |
| `/?candidate=off` | Host shell with an empty candidate subtree — the leakage baseline |

## Build

```sh
pnpm --filter @undrr-eval/mangrove-mui build
```

Do not pass `--base` by hand; `scripts/build-apps.mjs` supplies it for both local
and Pages builds and verifies it applied.

## Test

```sh
pnpm exec playwright install chromium    # once
pnpm --filter @undrr-eval/mangrove-mui build
cd apps/mangrove-mui && pnpm exec playwright test
```

**42 tests across three viewports: 39 pass, 3 fail.** The three failures are the
same test on each viewport — `RTL flips MUI's floating labels` — and they are
left failing on purpose. MUI's `MuiInputLabel-outlined` is positioned with a
physical `left: 0` that `direction: "rtl"` does not flip, so a full-width
TextField's label detaches from its input by 870px in Arabic. MUI's documented
fix is `stylis-plugin-rtl`, a third-party package that Brief 1 constraint 2
forbids adding. Reproduced identically in `apps/delta-mui`, so it is the
candidate's behaviour, not the host's. See `EVIDENCE.md`.

Outputs:

- `test-results/axe-*.json` — one per page section, plus scoped and whole-page
- `test-results/leakage.json` — canary computed-style diff
- `test-results/long-labels-*.json` — overflow measurement per viewport
- `test-results/hidden-inputs.json` — the Mangrove `[hidden]` bug survey
- `test-results/host-input-styling.json` — proof the host's input rules are contained
- `test-results/portal-styling.json` — portalled overlay background and token visibility
- `test-results/rtl-label-offset.json` — the failing RTL measurement
- `screenshots/{mobile,tablet,desktop}/` and `.../rtl/`

## Three things to know before reading the code

**`CssBaseline` is deliberately absent.** It is MUI's global reset and writes to
`html`, `body` and `*`, which would restyle the host's canary elements and fail
the leakage assertion by design. `ScopedCssBaseline` is used instead. On this
host the deviation costs more than on Delta, because CssBaseline is exactly what
would have neutralised Mangrove's element-level `input[type=...]` styling.

**`src/theme.ts` is identical to `apps/delta-mui/src/theme.ts`.** That is a
result, not a copy-paste shortcut: the token mapping did not need to change
between hosts, so everything Mangrove cost is isolated in `src/demo.css`, where
it can be counted.

**`src/demo.css` documents four rules that were deleted.** Three host repairs the
brief anticipated turned out to be inert against MUI 9.10.1, including the
`[hidden]` specificity fix. They were measured, not assumed, and removed rather
than left in to inflate the CSS count. The comment block at the top of the file
says which and why.

## Layout

```
src/
  main.tsx          entry: stylesheet order, mount, the CssBaseline note
  App.tsx           host shell, theme + locale providers, section order
  theme.ts          UNDRR tokens mapped into MUI's theme object
  demo-state.ts     locale context, mocked load states
  demo.css          27 lines, 7 selectors; one host repair, two grid rules
  sections/         one file per kitchen-sink section
e2e/demo.spec.ts    evidence run
```
