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

1. **Mangrove 1.8.1 declares no CSS custom properties — but 2.0 will.** All
   2,131 `mg-` classes in the compiled 1.8.1 stylesheet are themed at Sass
   compile time through `$mg-*` variables; a grep for `--x:` declarations in
   `css/style.css` returns zero. Against 1.8.1, a candidate cannot be themed to
   match Mangrove by pointing its own custom properties at Mangrove's.

   Mangrove 2.0 changes this. See **Mangrove 2.0** below; the constraint is
   temporary, but three parts of it are not.

2. **The published package's `main` field is broken.** `package.json` declares
   `main: dist/index.js`, but the tarball contains no `dist/` directory. A bare
   `import "@undrr/undrr-mangrove"` fails to resolve. Deep imports work and are
   what this scaffold uses. Worth reporting upstream, separately from this
   evaluation.

3. **Mangrove has no data-visualisation components.** `StatsCard` and a base
   `Table` are the entirety of its data presentation; there are no chart, axis,
   legend or plot primitives. Given that this evaluation is about *data* design
   systems, that gap is arguably the finding rather than a footnote.

4. **Mangrove inline links fail WCAG 1.4.1.** Measured with axe against the
   scaffold preview, which loads no component library: the Delta host reports
   zero violations, the Mangrove host reports one serious `link-in-text-block`.

   The cause is Mangrove's base element styling, not a component class —
   `_foundational.scss` line 137:

   ```scss
   a {
     color: $mg-color-interactive;
     text-decoration: none;

     &:hover {
       text-decoration: underline;
     }
   }
   ```

   Underline appears only on hover, so an inline link in a paragraph is
   distinguishable from surrounding text by colour alone until pointed at — and
   never, for keyboard or touch users. Worth fixing in Mangrove; recorded in
   `docs/requirements.md` as a host baseline so demos subtract it rather than
   being blamed for it.

### Mangrove 2.0

Unlanded at the time of writing. Branch `css-custom-properties-pilot`,
38 commits ahead of `main`, 82 files changed, head commit `592ca0fa`
(2026-06-26). Read from `docs/RELEASE-2.0.md` and
`stories/assets/scss/_variables.scss` on that branch.

2.0 replaces SCSS variable theming with CSS custom properties on `:root`, and
replaces the four sub-brand `_variables-*.scss` files with `_theme-*.scss` files
applied through `.mg-theme-X { }` selector blocks. For CDN and prebuilt-CSS
consumers it is a drop-in replacement; for anyone importing the SCSS it is
breaking.

The 155 tokens are transcribed into
`packages/host-mangrove/src/mangrove-2-preview.css` by
`pnpm mangrove2:tokens`, so candidate demos can be themed against the real
forthcoming API rather than a guess. `host-mangrove` still *loads* 1.8.1: the
preview file is tokens only, and is deleted when 2.0 publishes.

Three things about 2.0 matter to this evaluation, and two of them survive the
upgrade:

1. **Colours are space-separated RGB channels, not colour values.**
   `--mg-color-blue-900: 0 79 145`, consumed as
   `rgb(var(--mg-color-blue-900))` or `rgb(var(--mg-color-blue-900) / 0.1)`.
   This is a deliberate choice that buys alpha compositing, but it means a
   candidate whose theming API accepts only a colour *string* cannot be pointed
   at a Mangrove token directly — the assignment produces an invalid value and
   fails silently. Expect this to be a real, measurable integration cost, and
   expect it to differ sharply between candidates.

2. **Ten colour tokens are not in channel format.** `--mg-color-green: #008484`,
   `--mg-color-yellow-light: lightyellow`, `--mg-color-ebony-clay: #3d4242` and
   seven others are hex or named colours, so `rgb(var(--x))` is invalid for
   exactly those. Of 102 colour tokens: 46 channel triplets, 32 `var()` aliases,
   10 raw colour values. A consumer applying the documented pattern uniformly
   will hit silent failures on the last group. **This looks like an
   inconsistency in the pilot branch rather than an intentional split, and is
   worth raising on the PR before it lands.**

3. **Typography and breakpoints stay SCSS-only.** `RELEASE-2.0.md` is explicit
   that `$mg-font-size-*`, `$mg-font-family*`, `$mg-breakpoint-*` and
   `$mg-html-font-size` remain build-time variables with no custom property
   equivalent, because they are needed for `@media` queries and interpolation.
   One token, `--mg-font-size-button`, is declared as a custom property but its
   value is still an SCSS expression; the generator comments it out rather than
   emitting invalid CSS.

   So even after 2.0, a candidate cannot reach Mangrove's type scale or font
   stacks at runtime. `theming.tokensUnreachable` stays non-zero on this host
   for typography, whichever version is loaded.

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

- **PrimeReact is excluded. Confirmed by UNDRR, 2026-08-05.** PrimeReact is
  Delta's incumbent component library, and removing it is the goal this
  evaluation serves — the candidates are being compared as replacements for it,
  not as additions alongside it.

  Loading PrimeReact's theme into the host would mean every candidate was
  measured against a page already carrying a competing component library's
  global styles, which would both prejudge the comparison and make leakage
  results unattributable to the candidate.

  The consequence to keep in view: `host-delta` therefore reproduces Delta's
  *styling* approach faithfully (Tailwind 4 with Preflight) but not its current
  *component* approach. That is intentional — it models the Delta that UNDRR
  wants to arrive at, not the one that exists today.
- **No `style-dts.css`.** `app/root.tsx` loads
  `/assets/css/style-dts.css?asof=20250630` from Delta's own `public/assets`.
  This is not published on the UNDRR assets CDN (it returns 404 there), so it
  could not be retrieved without cloning Delta's asset tree. Its absence means
  the Delta host is Tailwind-only.
- **Tailwind-only overstates the separation between the two hosts.** Measured
  against a Delta checkout, Delta's own markup uses Mangrove classes throughout
  alongside its Tailwind utilities: `mg-button` 72 times, `mg-grid` 68,
  `mg-container` 14, plus local `dts-*` classes (`dts-table`, `dts-status`,
  `dts-page-header`), and `app/frontend/container.tsx` wraps every page in
  `mg-container`. Real Delta is a Mangrove consumer with Tailwind layered on top,
  not an alternative to Mangrove.

  So `host-delta` and `host-mangrove` are further apart than the two hosts they
  model, and the scaffold's clean split is a simplification in the candidates'
  favour: no demo currently has to coexist with Tailwind utilities and `mg-`
  classes in the same page, which is the condition a real Delta screen imposes.
  Issue #11 tracks closing that gap with a full-application Delta layout.
- **React 19, matching Delta.** Brief 0 specified React 18, but Mantine 9 will
  not install on 18 at all, so all ten demos use 19 - which is what both Delta and
  Mangrove develop against. See the README's requirements section.
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
