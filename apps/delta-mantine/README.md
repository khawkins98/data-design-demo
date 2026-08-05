# delta-mantine

Mantine 9.5.1 on the PreventionWeb Delta host shell.

One of eight controlled demos. See `EVIDENCE.md` for findings and
`evidence.json` for the structured record.

## Run

From the repository root:

```sh
pnpm install
pnpm build:packages                            # host-delta compiles its Tailwind CSS
pnpm --filter @undrr-eval/delta-mantine dev    # http://localhost:5202
```

Or browse it alongside the other demos:

```sh
pnpm site        # http://localhost:4180
```

## Query parameters

| URL | Renders |
| --- | --- |
| `/` or `/?candidate=on` | Host shell with the Mantine subtree |
| `/?candidate=off` | Host shell with an empty candidate subtree — the leakage baseline |
| `/?baseline=on` | Additionally injects `@mantine/core/styles/baseline.css` |

`?baseline=on` exists to **measure** something rather than to demonstrate it. See
the next section.

## Three things to know before reading the code

**1. `@mantine/core/styles.css` is deliberately not imported.**
`src/mantine-styles.css` imports Mantine's per-component stylesheets individually
and omits `baseline.css`, whose `body { font-family; font-size; line-height;
background-color; color }` rule is inherited by the host's leakage canaries.
Loading it costs **23 computed-style differences across all 14 canaries**
(`test-results/leakage-with-baseline.json`), which is why `?baseline=on` exists.
This is the Mantine equivalent of the `delta-mui` run omitting `CssBaseline`, and
it is a real deviation from the documented setup, not a free win.

**2. The per-component import order is Mantine's, not alphabetical.** Mantine's
component styles are single-class selectors of equal specificity, so source order
decides. `UnstyledButton.css` must precede `Button.css` or every button renders as
bare text — with `--button-bg` reading back as the correct token, so the theme
looks like it worked. The regeneration command is in the header of
`src/mantine-styles.css`.

**3. `src/table-model.ts` is the finding, not a helper.** Mantine's `Table` is
presentational: no sorting, filtering, pagination, row selection or column sizing.
All of it lives in that file so the cost is countable.

## Build

```sh
pnpm --filter @undrr-eval/delta-mantine build
```

Do not pass `--base` by hand; `scripts/build-apps.mjs` supplies it for both local
and Pages builds and verifies it applied.

## Test

```sh
pnpm exec playwright install chromium    # once
pnpm --filter @undrr-eval/delta-mantine build
pnpm --filter @undrr-eval/delta-mantine test:e2e
```

51 tests across three viewports, all passing.

Outputs:

- `test-results/axe-*.json` — one per page section, plus scoped and whole-page
- `test-results/leakage.json` — canary computed-style diff, as shipped
- `test-results/leakage-with-baseline.json` — the same diff with `baseline.css`
- `test-results/overlays-*.json` — computed background, token visibility and
  direction for each portalled overlay type
- `test-results/rtl-*.json` — direction inside the subtree and inside a portal
- `test-results/long-labels-*.json` — overflow measurement per viewport
- `screenshots/{mobile,tablet,desktop}/` and `.../rtl/`

## Layout

```
src/
  main.tsx             entry: stylesheet order, dayjs locales, the ?baseline=on probe
  App.tsx              host shell, provider stack, section order, portal dir fix-up
  theme.ts             UNDRR tokens -> createTheme + cssVariablesResolver
  demo-state.ts        locale context, dayjs locale map, mocked load states
  overlay-class.ts     portal props: token scope class and text direction
  table-model.ts       everything Mantine's Table does not do
  mantine-styles.css   generated; per-component imports, baseline.css omitted
  demo.css             72 lines; focus ring, sort and resize affordances
  sections/            one file per kitchen-sink section
e2e/demo.spec.ts       evidence run
```
