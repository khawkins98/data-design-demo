# delta-carbon

IBM Carbon on the PreventionWeb Delta host shell.

One of eight controlled demos. See `EVIDENCE.md` for findings and
`evidence.json` for the structured record.

## Run

From the repository root:

```sh
pnpm install
pnpm build:packages                          # host-delta compiles its Tailwind CSS
pnpm --filter @undrr-eval/delta-carbon dev   # http://localhost:5198
```

Or browse it alongside the other demos:

```sh
pnpm site        # http://localhost:4180
```

## The two query parameters

### `candidate` — the leakage assertion

The leakage assertion loads the page twice and diffs the host canaries:

| URL | Renders |
| --- | --- |
| `/` or `/?candidate=on` | Host shell with the Carbon subtree |
| `/?candidate=off` | Host shell with an **empty** candidate subtree — the leakage baseline |

Comparing across a reload rather than a React unmount is deliberate: stylesheets a
library injects at import time are not removed on unmount.

### `globalcss` — the leakage *probe*, specific to this demo

| URL | Renders |
| --- | --- |
| `/?candidate=on&globalcss=on` | The page **plus** `@carbon/styles/css/styles.css`, Carbon's prebuilt global stylesheet |

This demo does **not** ship that stylesheet (see below). The parameter exists so
the e2e run can measure exactly what importing it does to the host canaries rather
than describing it from reading the CSS. It is a dynamic `import()`, so the 831 kB
file is code-split and fetched only when the parameter is present — it is not part
of the shipped bundle.

**Result: 79 computed-style differences across all 14 canaries.** Full detail in
`EVIDENCE.md` and `test-results/leakage-carbon-global-css.json`. This is the
central finding of the pairing.

## Build

```sh
pnpm --filter @undrr-eval/delta-carbon build
```

Do not pass `--base` by hand; `scripts/build-apps.mjs` supplies it for both local
and Pages builds and verifies it applied.

The build compiles Sass. `sass` is a required direct dependency, not an optional
one — see the first note below.

## Test

```sh
pnpm exec playwright install chromium         # once
pnpm --filter @undrr-eval/delta-carbon build
pnpm --filter @undrr-eval/delta-carbon test:e2e
```

**51 tests across three viewports, all passing.**

Outputs:

- `test-results/axe-*.json` — one per page section, plus scoped and whole-page
- `test-results/leakage.json` — canary computed-style diff, shipped configuration
- `test-results/leakage-carbon-global-css.json` — the `?globalcss=on` probe
- `test-results/long-labels-*.json` — overflow measurement per viewport
- `screenshots/{mobile,tablet,desktop}/` and `.../rtl/`

Several tests assert appearance rather than behaviour, deliberately, because the
failures this evaluation is looking for are invisible to behavioural tests: an
overlay that works perfectly and renders unthemed, or a screen-reader-only string
that renders visibly. Notable ones:

| Test | What it guards |
| --- | --- |
| `measures what Carbon's prebuilt global stylesheet does to the host` | Asserts the difference count is **greater than zero**, so if a future Carbon release drops the reset the finding is revisited rather than left stale. |
| `keeps the flatpickr calendar inside the token scope and themed` | That `appendTo` reparented the calendar into `[data-candidate-root]`, and that its selected day is neither transparent nor Carbon's default field grey. |
| `renders all four validation states with visible messages` | Guards the `readOnly` trap below. Asserts the rendered message text, not the props. |
| `applies RTL for Arabic` | A component *internal* mirrored (accordion chevron padding), not just the `dir` attribute. |
| `renders the 250-row table…` | That Carbon hides the page-size control at 390px — asserted as `false` on mobile, so the behaviour is on record. |

## Five things to know before reading the code

**1. `@carbon/styles/css/styles.css` is deliberately not imported.**

It is Carbon's documented prebuilt stylesheet and the simple route to getting
Carbon to look right. It opens with a global Eric-Meyer reset across 46 bare
element selectors — `*`, `html`, `body`, `h1`–`h6`, `p`, `a`, `table`, `ul`, `nav`,
`section`, `button`, `input`, `select` — which restyles the Delta host's leakage
canaries. `src/carbon.scss` compiles only the `.cds--`-prefixed component partials
instead. The full reasoning, and the measurement, are in that file's header comment
and in `EVIDENCE.md`.

This is a **real deviation from Carbon's intended setup**, and it works here partly
because the Delta host already loads Tailwind Preflight, which covers much of the
same ground. That substitution will not hold on a host without Preflight.

**2. Hand-composing Carbon's Sass has two silent traps, and both are commented in
`src/carbon.scss`.**

- `@carbon/styles/scss/layout` is **required** but is not a component partial. It
  declares the control-height and inline-padding custom properties every form
  control sizes itself from. Omit it and a failed `var()` voids the declarations
  entirely: every input and button loses its padding *and* its height, with no
  error and no warning.
- `components/data-table/_index.scss` includes only the *core* table mixin. Sort,
  action, skeleton and expandable are sibling partials it does not forward. Without
  `data-table/sort`, Carbon's screen-reader-only sort instruction renders as
  **visible text** in every header cell.

Read that file before adding a Carbon component; you will probably need a partial
that is not where you expect.

**3. Theming is a CSS custom-property mapping in `src/demo.css`, not a theme
object.**

Carbon's theme *is* custom properties — every colour it draws with is
`var(--cds-token, <white-theme-literal>)` — so theming against
`packages/undrr-tokens` is 164 `--cds-*` declarations on the `.demo` element. No
provider, no `ThemeProvider`, nothing to rebuild on a locale change. Change a
`--undrr-*` value at runtime and every Carbon component follows it in the same
frame.

The trade-off: the mapping is a stylesheet maintained by hand, and anything
rendered *outside* `.demo` falls back to Carbon's stock white theme silently rather
than failing visibly. Spacing, z-index and radius cannot be reached this way at
all; see `EVIDENCE.md`.

**4. `readOnly` silently suppresses `invalid` and `warn` on Carbon inputs.**

`useNormalizedInputProps` computes `invalid: !readOnly && !disabled && invalid`.
Pinning a fixture value with `value` + `readOnly`, as the `delta-mui` demo does,
makes every validation state render blank with no warning. `src/sections/SectionForms.tsx`
uses `defaultValue` for that reason, and there is an e2e test guarding it.

**5. `src/carbon-props.ts` exists because Carbon's types do not compile under
`exactOptionalPropertyTypes: true`.**

`DataTable`'s render-prop getters return optional properties where the components
they are spread into declare them required — six errors in the exact code Carbon's
documentation tells you to write. One cast, documented, rather than relaxing the
tsconfig.

## Layout

```
src/
  main.tsx            entry: stylesheet order, the globalcss probe, the reset note
  App.tsx             host shell, locale switcher, section order (no provider needed)
  carbon.scss         Carbon's Sass, composed to EXCLUDE the global reset.
                        Read the header comment before editing.
  demo.css            300 lines: 164 --cds-* token mappings, layout, 19 escape hatches
  demo-state.ts       locale context, mocked load states, shared Intl formatters
  overlay-scope.ts    which Carbon overlays portal (one) and the flatpickr fix
  carbon-props.ts     the exactOptionalPropertyTypes cast, with the reasoning
  sections/           one file per kitchen-sink section, in the brief's fixed order
e2e/demo.spec.ts      evidence run, including the global-stylesheet probe
vite.config.ts        includes a 20-line plugin that scopes Carbon's one :root rule
```

Every section file opens with a comment recording what Carbon gave, what it did
not, and what had to be written by hand — that is where the per-requirement
reasoning behind `evidence.json` lives.
