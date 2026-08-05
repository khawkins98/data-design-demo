# Host shell derivation

How the two host shells were derived, what was carried across, and what was
simplified. Brief 0 requires this record so that a reviewer can judge whether a
demo's leakage result reflects the real host or an artefact of our reproduction.

Both source repositories were readable, so no stop condition was triggered.

---

## host-mangrove

**Source:** [`unisdr/undrr-mangrove`](https://github.com/unisdr/undrr-mangrove),
Apache-2.0. Pinned to the published npm package `@undrr/undrr-mangrove@1.8.1`.

### Files read

| Source | What it told us |
| --- | --- |
| `package.json` (repo and published tarball) | Node `>=22`, `type: module`, Storybook-based build, `main: dist/index.js` |
| Published tarball file listing (241 files) | What consumers actually get: `css/`, `scss/`, `components/`, `js/`, `fonts/` |
| `css/style.css` (197 KB compiled) | Real class names and their compiled values |
| `scss/assets/scss/_variables.scss` | `$mg-*` token naming, `mg-rem()`, configurable root font size |
| `scss/Components/Buttons/CtaButton/cta-button.scss` | Button class structure and focus treatment |
| `scss/` directory tree | Atomic-design organisation: `Atom/`, `Molecules/`, `Components/`, `Utilities/` |

### Conventions carried across

- **The real stylesheet.** Rather than reimplement Mangrove, `host-mangrove`
  imports `@undrr/undrr-mangrove/css/style.css`. The canary elements are styled
  by the design system itself, so a leakage result is a statement about
  Mangrove, not about our approximation of it.
- **Real class names.** `mg-button` / `mg-button-primary` / `mg-button-secondary`,
  `mg-table` with the `mg-table--striped` modifier, `mg-card` with
  `mg-card__content`, `mg-heading-1` through `mg-heading-3`, `mg-link`.
- **Naming irregularity preserved.** Buttons use a suffix (`mg-button-primary`),
  not a BEM modifier (`mg-button--primary`), while cards and most other
  components do use BEM. We reproduced this rather than tidying it, because a
  candidate library's theming has to cope with the real thing.

### Simplified

- **No application shell.** Mangrove ships page-level components — hero, mega
  menu, footer, breadcrumbs — but no admin layout with a left-hand navigation
  column. The `mg-host__*` classes in `host-mangrove.css` are ours, prefixed so
  they are distinguishable from genuine Mangrove classes during review. They set
  layout only; every canary's *appearance* comes from Mangrove's own CSS.
- **No icon font.** `fonts/mangrove-icon-set/` is shipped in the package but the
  canaries do not use icons, so it is not loaded. This keeps the leakage
  snapshot free of font-loading races.
- **No Storybook, no Sass compilation.** We consume the prebuilt CSS.

### Findings worth carrying into the evaluation

1. **Mangrove declares no CSS custom properties.** All 2,131 `mg-` classes in
   the compiled stylesheet are themed at Sass compile time through `$mg-*`
   variables; a grep for `--x:` declarations in `css/style.css` returns zero.
   A candidate library therefore *cannot* be themed to match Mangrove by
   pointing its own custom properties at Mangrove's. Reaching Mangrove's values
   requires either recompiling the SCSS or hard-coding hex values. Brief 1 runs
   against this host should expect `theming.tokensUnreachable` to be non-zero
   and should say which route they took.

2. **The published package's `main` field is broken.** `package.json` declares
   `main: dist/index.js`, but the tarball contains no `dist/` directory. A bare
   `import "@undrr/undrr-mangrove"` fails to resolve. Deep imports work and are
   what this scaffold uses. Worth reporting upstream, separately from this
   evaluation.

3. **Mangrove has no data-visualisation components.** `StatsCard` and a base
   `Table` are the entirety of its data presentation; there are no chart, axis,
   legend or plot primitives. Given that this evaluation is about *data* design
   systems, that gap is arguably the finding rather than a footnote.

---

## host-delta

**Source:** [`PreventionWeb/delta`](https://github.com/PreventionWeb/delta),
Apache-2.0, TypeScript, read at commit state of 2026-08-05.

### Files read

| Source | What it told us |
| --- | --- |
| `package.json` | Tailwind CSS 4, PrimeReact 10, React 19, Recharts, React Router 7 |
| `app/styles/all.css` | The entire global stylesheet: four local imports plus `@import "tailwindcss"` |
| `app/root.tsx` | Stylesheet load order, `PrimeReactProvider`, lara-light-blue theme |
| `app/components/` listing | Chart components are hand-built on Recharts, not from a component library |
| `app/frontend/` listing | Feature-folder organisation |

### Conventions carried across

- **Tailwind 4, imported the same way.** `host-delta.src.css` is a single
  `@import "tailwindcss"`, mirroring `app/styles/all.css`. No custom preset or
  layer, because Delta has none.
- **Preflight, deliberately.** Tailwind's global reset is the most consequential
  thing about Delta's styling environment for a candidate library. The compiled
  output contains `button{box-sizing:border-box;border:0 solid;margin:0;padding:0}`
  and `button{font:inherit;background-color:#0000;border-radius:0}`. That is
  precisely the collision surface component libraries hit. A Delta host without
  Preflight would flatter every candidate and make the comparison worthless.
- **Utility-first markup.** The canaries carry Tailwind utility classes rather
  than semantic component classes, as Delta's own components do.

### Simplified

- **PrimeReact is excluded.** This is the significant judgement call. PrimeReact
  is Delta's incumbent component library, and this evaluation exists to compare
  what might replace it. Loading PrimeReact's theme into the host would mean
  every candidate was measured against a page already containing a competing
  component library's global styles — which would both prejudge the comparison
  and make leakage results unattributable. Recorded here so a reviewer can
  disagree: if UNDRR wants candidates measured *alongside* PrimeReact rather
  than *instead of* it, this decision should be revisited before any Brief 1 run
  starts, because it changes every leakage result.
- **No `style-dts.css`.** `app/root.tsx` loads
  `/assets/css/style-dts.css?asof=20250630` from Delta's own `public/assets`.
  This is not published on the UNDRR assets CDN (it returns 404 there), so it
  could not be retrieved without cloning Delta's asset tree. Its absence means
  the Delta host is Tailwind-only, which is the dominant influence anyway.
- **React 18, not Delta's React 19.** Brief 0 specifies React 18 and the
  candidate libraries are being compared on equal footing, so all eight demos
  use 18. Noted because it is a divergence from the real Delta.
- **No routing, data layer, maps or charts.** Delta is a full application; the
  brief asks for its conventions, not its features.

---

## Both hosts

- The canary DOM is **structurally identical** between the two hosts — same
  elements, same order, same `data-canary` attributes — differing only in class
  names and the CSS behind them. A difference between the two hosts is therefore
  attributable to host styling rather than to different markup.
- The canary contract lives in `packages/test-harness/src/canaries.ts`, imported
  by both hosts, so a canary cannot be renamed in one place and missed in the
  other.
- Neither host defines styles at `:root`, and `packages/undrr-tokens` scopes its
  custom properties to a class, so tokens do not silently theme the canaries.
