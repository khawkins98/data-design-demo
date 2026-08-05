# mangrove-carbon

IBM Carbon on the UNDRR Mangrove host shell.

One of eight controlled demos. See `EVIDENCE.md` for findings and
`evidence.json` for the structured record.

**This pairing exists to test one thing: what happens when the host and the
candidate both ship a large global stylesheet.** Mangrove's `style.css` is 197 kB
of element-level and class-level rules; Carbon's `styles.css` is 958 kB opening
with a full CSS reset. They collide in both directions, and the leakage assertion
fails on purpose. Read `EVIDENCE.md` before drawing conclusions from the
screenshots.

## Run

From the repository root:

```sh
pnpm install
pnpm --filter @undrr-eval/mangrove-carbon dev    # http://localhost:5200
```

Or browse it alongside the other demos:

```sh
pnpm site        # http://localhost:4180
```

No `pnpm build:packages` step is needed: `host-mangrove` ships prebuilt CSS.

## Query parameters

### `?candidate=off` — the leakage contract

The leakage assertion loads the page twice and diffs the host canaries:

| URL | Renders |
| --- | --- |
| `/` or `/?candidate=on` | Host shell with the Carbon subtree |
| `/?candidate=off` | Host shell with an empty candidate subtree — the leakage baseline |

**`?candidate=off` also skips importing Carbon's stylesheet.** That matters more
here than in any other pairing. The harness compares across a page reload
specifically so that CSS a library injects at import time shows up as a
difference; if the baseline loaded Carbon's reset, it would be present in both
snapshots, cancel out, and the assertion would pass vacuously. See
`src/css-mode.ts`.

### `?carbonCss=scoped` — the containment experiment

| URL | Carbon CSS |
| --- | --- |
| default | `@carbon/styles/css/styles.css`, global, as documented. **Leakage fails: 54 differences.** |
| `?carbonCss=scoped` | Carbon's Sass entry compiled inside a `.demo { }` block. **Leakage passes: 0 differences.** |

Global is the default because it is what a team adopting Carbon would actually
ship. The scoped build is an experiment with four measured costs, all listed at
the top of `src/carbon-scoped.scss`.

## Build

```sh
pnpm --filter @undrr-eval/mangrove-carbon build
```

Do not pass `--base` by hand; `scripts/build-apps.mjs` supplies it for both local
and Pages builds and verifies it applied.

The build emits Carbon's global stylesheet and the scoped experiment as separate
CSS assets, because both are dynamic imports. Only one is ever loaded per page
view. The scoped Sass compile prints ~200 warnings about unresolvable
`~@ibm/plex/...` font URLs; that is Carbon's Sass entry emitting webpack-style
paths, and it is discussed in `EVIDENCE.md`.

## Test

```sh
pnpm exec playwright install chromium    # once
pnpm --filter @undrr-eval/mangrove-carbon build
cd apps/mangrove-carbon && pnpm exec playwright test
```

**63 tests across three viewports: 60 pass, 3 fail.** The three failures are the
same test — the leakage assertion — once per viewport. It is left failing
deliberately; weakening it would hide the central result of this pairing.

Outputs in `test-results/`:

| File | What it holds |
| --- | --- |
| `leakage.json` | Canary computed-style diff with Carbon's global stylesheet. 54 differences. |
| `leakage-scoped.json` | The same measurement with the scoped build. 0 differences. |
| `collisions.json` | Style collisions in both directions, attributed by stylesheet. |
| `overlays.json` | Per overlay type: portalled or not, background, whether the tokens reach it. |
| `axe-*.json` | One per page section, plus candidate-scoped, whole-page, and whole-page-with-Carbon-contained. |
| `long-labels-*.json` | Horizontal overflow measurement per viewport, written before the assertion. |

Screenshots in `screenshots/{mobile,tablet,desktop}/` and `.../rtl/`.

## Four things to know before reading the code

**The leakage failure is the finding, not a bug to fix.** `e2e/demo.spec.ts`
asserts zero canary differences and gets 54. The diff is committed.

**Carbon is themed through CSS custom properties, in `src/theme.css`.** Every
colour in Carbon's stylesheet is written `var(--cds-token, #fallback)`, so theming
is one block of 97 `--cds-*` assignments on the candidate wrapper, resolved at
runtime. No theme provider, no build step, no `!important`.

**`src/theme.css` also has to push the host back.** Mangrove styles inputs at
element level — `input[type="text"], ... { border: 2px solid #1a1a1a; height: 46px }`
at specificity (0,1,1) — which outranks Carbon's `.cds--text-input` at (0,1,0).
Every Carbon field rendered as a Mangrove field until ten declarations were
re-asserted at (0,2,0). Stylesheet order does not help; specificity beats order.

**Carbon's `DatePicker` is not a controlled component.** It is a React shell
around flatpickr's imperative API. Passing an inline array to `value` re-runs
`setDate` on every render and tears down the open calendar mid-selection. See the
`INITIAL_RANGE` comment in `src/sections/SectionDates.tsx`.

## Layout

```
src/
  main.tsx            entry: stylesheet order, why Carbon loads last and dynamically
  css-mode.ts         the ?candidate and ?carbonCss switches, and why they exist
  App.tsx             host shell, locale switcher, section order, the three wrapper classes
  theme.css           611 lines: 97 --cds-* token mappings, page layout, host push-back
  carbon-scoped.scss  the containment experiment and its four measured costs
  demo-state.ts       locale context and mocked load states — no sort or filter code, see the comment
  sections/           one file per kitchen-sink section
e2e/demo.spec.ts      evidence run
```
