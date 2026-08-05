# delta-react-aria

Adobe React Aria Components on the PreventionWeb Delta host shell.

One of eight controlled demos. See `EVIDENCE.md` for findings and
`evidence.json` for the structured record.

## Run

From the repository root:

```sh
pnpm install
pnpm build:packages                                # host-delta compiles its CSS
pnpm --filter @undrr-eval/delta-react-aria dev     # http://localhost:5194
```

## The candidate query parameter

The leakage assertion loads the page twice and diffs the host canaries:

| URL | Renders |
| --- | --- |
| `/` or `/?candidate=on` | Host shell with the React Aria subtree |
| `/?candidate=off` | Host shell with an empty candidate subtree — the leakage baseline |

## Build

```sh
pnpm --filter @undrr-eval/delta-react-aria build
```

For a GitHub Pages subpath, the shared workflow passes `--base`:

```sh
pnpm --filter @undrr-eval/delta-react-aria build -- --base /data-design-demo/delta-react-aria/
```

## Test

```sh
pnpm exec playwright install chromium    # once
pnpm --filter @undrr-eval/delta-react-aria build
pnpm --filter @undrr-eval/delta-react-aria test:e2e
```

**45 tests across three viewports, all passing.** Nothing was weakened to get
there — two assertions failed for real reasons on the first run and both led to
code changes rather than test changes:

- `select-all` did not exist, because `selectionMode="multiple"` renders no
  checkboxes. A selection column was added. See finding 1 in `EVIDENCE.md`.
- long labels overflowed 260px at 390px. The cause was `ColumnResizer`'s
  absolutely positioned hidden input escaping the scroll container. See
  finding 2.

Outputs:

- `test-results/axe-*.json` — one per page section, plus scoped and whole-page
- `test-results/leakage.json` — canary computed-style diff
- `test-results/long-labels-*.json` — overflow measurement per viewport
- `screenshots/{mobile,tablet,desktop}/` and `.../rtl/` — 54 PNGs

## Typecheck

```sh
pnpm exec tsc -p apps/delta-react-aria/tsconfig.json
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
  demo-state.ts     locale context, sort/filter helpers, Delta utility strings
  overlay-class.ts  the token scope class for portalled overlays — read this
  theme.css         all 715 lines of candidate styling
  sections/         one file per kitchen-sink section
e2e/demo.spec.ts    evidence run
```

`theme.css` is the implementation cost this demo exists to measure. React Aria
ships no CSS, and the Delta host is Tailwind **with Preflight**, so there is no
browser default to fall back on either — the rules marked `PREFLIGHT RECOVERY`
are the ones that exist only because of the host.

## Things to know before editing

- **Portalled overlays need `TOKEN_SCOPE_CLASS`.** React Aria portals to
  `document.body`, outside `.undrr-tokens`, so every `var(--undrr-*)` inside an
  overlay resolves to nothing — silently. Use the constants in
  `src/overlay-class.ts`, never a bare class name.
- **`.demo-tablewrap` needs `position: relative`.** Removing it reintroduces a
  335px horizontal document scroll that looks like a table bug and is not.
- **The responsive media query must stay last in `theme.css`.** It carries no
  extra specificity and loses to any equally specific rule below it.
- **Only the host's 75 Tailwind utilities exist.** `host-delta` scopes Tailwind
  to `@source "./HostShell.tsx"`, so a new utility class emits no CSS and fails
  silently. Reuse the strings exported from `demo-state.ts`.
- **No `new Date()`.** Use `TODAY_ISO`, `DEFAULT_RANGE` and
  `parseAbsolute(iso, FIXED_TIME_ZONE)` — never `parseAbsoluteToLocal`.
