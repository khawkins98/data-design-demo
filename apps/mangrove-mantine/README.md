# mangrove-mantine

Mantine on the UNDRR Mangrove host shell.

One of eight controlled demos. See `EVIDENCE.md` for findings and
`evidence.json` for the structured record.

## Run

From the repository root:

```sh
pnpm install
pnpm build:packages                              # workspace packages compile
pnpm --filter @undrr-eval/mangrove-mantine dev   # http://localhost:5204
```

Or browse it alongside the other demos:

```sh
pnpm site
```

## The candidate query parameter

The leakage assertion loads the page twice and diffs the host canaries:

| URL | Renders |
| --- | --- |
| `/` or `/?candidate=on` | Host shell with the Mantine subtree |
| `/?candidate=off` | Host shell with an empty candidate subtree — the leakage baseline |

**With `candidate=off` this app loads no Mantine CSS at all**, which is not just
an empty React subtree. Mantine ships a plain stylesheet rather than injecting
styles at render time, so a static `import` would put it in *both* snapshots and
the leakage assertion would pass without measuring anything. `src/main.tsx`
therefore loads it through an awaited dynamic import inside the `candidate=on`
branch, and the e2e suite asserts `--mantine-font-family` is absent from `:root`
on the baseline load. Read the comment at the top of `main.tsx` before changing
how CSS is imported here.

## Build

```sh
pnpm --filter @undrr-eval/mangrove-mantine build
```

Do not pass `--base` by hand; `scripts/build-apps.mjs` supplies it for both local
and Pages builds and verifies it applied.

## Test

```sh
pnpm exec playwright install chromium    # once
pnpm --filter @undrr-eval/mangrove-mantine build
cd apps/mangrove-mantine && pnpm exec playwright test
```

48 tests, 16 per viewport across mobile/tablet/desktop, all passing.

Outputs:

- `test-results/axe-*.json` — one per page section, plus scoped and whole-page
- `test-results/leakage.json` — canary computed-style diff
- `test-results/leakage-with-baseline.json` — **the counterfactual**: what
  Mantine's global `baseline.css` *would* have done to the host canaries if it
  had been imported. 36 differences across all 14 canaries
- `test-results/host-collision.json` — the reverse direction: which Mantine
  components the Mangrove host's element-level form rules can actually reach, and
  what they look like with our repair disabled
- `test-results/overlay-backgrounds.json` — computed `background-color` of every
  portalled overlay, to catch the transparent-overlay trap
- `test-results/long-labels-*.json` — overflow measurement per viewport
- `screenshots/{mobile,tablet,desktop}/` and `.../rtl/` — 57 PNGs, including
  `03-dates-range-open.png`, the open date-time range popover

## Typecheck

```sh
pnpm exec tsc -p apps/mangrove-mantine/tsconfig.json
```

## Four things to know before reading the code

**1. `@mantine/core/styles.css` is deliberately not imported.** It is a
concatenation of `baseline.css`, `global.css`, `default-css-variables.css` and 98
per-component files, and `baseline.css` is a *global* reset — it writes
`box-sizing` to `*`, `font` to every form control, and
`font-family`/`font-size`/`line-height`/`background-color`/`color` to `body`.
Mangrove has no global `box-sizing` reset of its own, so importing it changes 36
computed properties across all 14 host canaries. `src/mantine-styles.css` imports
everything *except* the baseline, and `src/demo.css` BLOCK 1 re-applies the
equivalent reset scoped to `.demo`. This is the same trade `apps/delta-mui` made
with `ScopedCssBaseline` instead of `CssBaseline`, and it carries the same
caveat: Mantine's components are built expecting that baseline, so omitting it is
a real deviation from the library's documented setup, not a free win.

**2. The per-component CSS import order in `src/mantine-styles.css` is
load-bearing. Do not sort it.** Every Mantine class is a single hashed class at
specificity (0,1,0), so the cascade between component stylesheets is decided
purely by source order. `UnstyledButton.css` sets
`background: transparent; border: 0; padding: 0`, `Button.css` sets the real
appearance, and a `<Button>` carries *both* classes. Sorted alphabetically,
Button came first and **every button on the page rendered as bare text** — with a
clean build, clean `tsc`, all e2e tests passing and zero axe violations, because
the buttons still worked. The order in that file is derived from the byte offsets
of each file's content inside `@mantine/core/styles.css`, so it is exactly
Mantine's own. Regenerate it the same way if the version changes.

**3. Styling lives in `src/theme.ts`, not in CSS.** Mantine is themed through a
JavaScript object, so `theme.ts` is where the token mapping happens. `demo.css`
is 103 code lines and exists almost entirely for the two things the theme object
cannot express: the scoped baseline (BLOCK 1) and two host-collision repairs
(BLOCK 2). Note that Mantine requires a **ten-shade tuple** per colour and
`primaryColor` must be a *key* of `theme.colors` — a hex string is rejected — so
read the comments in `theme.ts` before touching the ramps. Getting `gray-6` wrong
is silently an accessibility bug: Mantine maps it to `--mantine-color-dimmed`.

**4. Section 6 is where the cost is.** `@mantine/core`'s `Table` is
presentational only — no sorting, filtering, pagination, row selection or column
sizing, and there is no headless table hook in `@mantine/hooks` either. The
comparator, filter predicate, page slice, selection set, `aria-sort` contract and
the entire column resizer are in `src/table-behaviour.ts`,
`src/use-column-resize.ts` and `src/sections/SectionDataTable.tsx`. That is 229
of this demo's 293 custom lines. No third-party table package was installed, per
the brief.

## Layout

```
src/
  main.tsx             entry: host CSS statically, Mantine CSS dynamically
  App.tsx              host shell, Mantine/Dates/Direction providers, locale
                       switcher (section 8), section order
  theme.ts             UNDRR tokens mapped into Mantine's theme object
  mantine-styles.css   Mantine's stylesheet minus its global baseline, in
                       Mantine's own import order
  demo.css             103 code lines: scoped baseline, 2 host-collision
                       repairs, focus ring, layout
  demo-state.ts        locale context, mocked load states, fixture ISO -> the
                       plain date strings Mantine 8+ uses
  overlay-class.ts     class applied to every portalled Mantine surface
  table-behaviour.ts   sort comparator, filter predicate, paging — all the
                       behaviour Mantine's Table does not provide
  use-column-resize.ts column resizing, pointer and keyboard, written by hand
  sections/            one file per kitchen-sink section
e2e/demo.spec.ts       evidence run
```

## Deploy

Handled by `.github/workflows/pages.yml`, which builds every app under `apps/`
with the right `base` and publishes beneath the comparison landing page. No
per-app deploy step.
