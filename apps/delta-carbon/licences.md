# Licences: delta-carbon

Brief 1 constraint 2 requires the licence of every transitive dependency to be
checked, and forbids any paid, Pro, Premium, trial-key, evaluation-licence or
non-approved package.

**Result: no paid, trial or evaluation-licensed package is used, at any depth.**
Carbon has no commercial tier. Everything in `@carbon/react` and
`@carbon/styles` is Apache-2.0 and there is no Pro package to omit — which is a
material difference from MUI, where the `datetime-range-picker` requirement runs
straight into a commercially licensed package.

Audited with:

```sh
pnpm licenses list --json --filter @undrr-eval/delta-carbon
```

## Summary across the full tree

145 unique packages resolved for this app, including build and test tooling.

| Licence | Packages |
| --- | --- |
| MIT | 106 |
| Apache-2.0 | 20 |
| OFL-1.1 | 9 |
| ISC | 5 |
| MPL-2.0 | 2 |
| CC-BY-4.0 | 1 |
| BSD-3-Clause | 1 |
| 0BSD | 1 |

All permissive. Nothing copyleft beyond MPL-2.0, which is file-level and applies
only to build tooling. Every non-MIT/Apache entry is examined below.

### Apache-2.0 (20)

Twelve of these are Carbon itself, which is the point:

| Package | Version |
| --- | --- |
| `@carbon/react` | 1.113.0 |
| `@carbon/styles` | 1.112.0 |
| `@carbon/themes` | 11.78.0 |
| `@carbon/type` | 11.64.0 |
| `@carbon/layout` | 11.56.0 |
| `@carbon/colors` | 11.55.0 |
| `@carbon/grid` | 11.59.0 |
| `@carbon/motion` | 11.49.0 |
| `@carbon/icons-react` | 11.85.0 |
| `@carbon/icon-helpers` | 10.79.0 |
| `@carbon/feature-flags` | 1.6.0 |
| `@carbon/utilities` | 0.23.0 |

The remaining eight are `@ibm/telemetry-js` (see the section below — this one
matters), `@internationalized/number`, `@swc/helpers`, `baseline-browser-mapping`,
`detect-libc`, and the three Playwright packages, which are test-only.

Apache-2.0 across the whole component library is the strongest licence position
of any candidate in this evaluation: it carries an explicit patent grant, which
MIT does not, and it is the same licence as `undrr-mangrove` and `PreventionWeb/delta`
themselves.

### OFL-1.1 (9) — the IBM Plex fonts

`@ibm/plex`, `@ibm/plex-mono`, `@ibm/plex-sans`, `@ibm/plex-sans-arabic`,
`@ibm/plex-sans-devanagari`, `@ibm/plex-sans-hebrew`, `@ibm/plex-sans-thai`,
`@ibm/plex-sans-thai-looped`, `@ibm/plex-serif`.

These are dependencies of `@carbon/styles` and account for the single largest
block of installed bytes. **Zero of them reach the browser in this demo**,
because `src/carbon.scss` deliberately does not `@use
"@carbon/styles/scss/fonts"` — that partial is the only thing that emits
`@font-face`, and the UNDRR token palette names Roboto, not IBM Plex.

SIL Open Font Licence 1.1 is permissive and is the standard licence for
open fonts (Roboto is Apache-2.0, Noto is OFL-1.1). Its one condition worth
knowing is the Reserved Font Name clause: a *modified* Plex may not keep the name
"IBM Plex". Not relevant here, since the fonts are neither shipped nor modified.

If a future UNDRR build *does* want Plex, note that `@ibm/plex-sans-arabic` is
present, which is more than most design systems ship — relevant given `ar` is one
of the four evaluation locales.

### MPL-2.0 (2) — `lightningcss` and `lightningcss-darwin-arm64`

Vite's CSS transformer. Build-time only; no MPL-2.0 code reaches shipped output.
MPL-2.0 is file-level copyleft, so the obligation would only attach to
modifications of those files, which this app does not make. Identical position to
any Vite project, including the `delta-mui` and `mangrove-react-aria` runs.

### CC-BY-4.0 (1) — `caniuse-lite`

A build-time browser-support dataset consumed by Vite's target resolution. Data,
not code, and not shipped.

### BSD-3-Clause (1) — `source-map-js`

Build-time source-map handling. Permissive; the only obligation is attribution in
redistributed source, which does not arise here.

### 0BSD (1) — `tslib`

TypeScript helper functions. 0BSD is public-domain-equivalent with no attribution
requirement at all.

### ISC (5)

`electron-to-chromium`, `lru-cache`, `picocolors`, `semver`, `yallist`. All
build-time transitive dependencies of the toolchain; ISC is functionally
equivalent to MIT.

## Direct dependencies

| Package | Version | Licence | Ships to browser |
| --- | --- | --- | --- |
| `@carbon/react` | 1.113.0 | Apache-2.0 | yes |
| `@carbon/styles` | 1.112.0 | Apache-2.0 | yes (CSS only, hand-composed subset) |
| `sass` | 1.102.0 | MIT | no (build only) |
| `react`, `react-dom` | 19.2.8 | MIT | yes |
| `@undrr-eval/*` | workspace | Apache-2.0 | yes |
| `vite`, `@vitejs/plugin-react` | 6.x, 4.x | MIT | no (build only) |
| `@playwright/test` | 1.62.1 | Apache-2.0 | no (test only) |

`sass` is a **required** direct dependency, not an optional one, and that is
worth flagging separately: the whole leakage result in `EVIDENCE.md` depends on
compiling Carbon's Sass partials selectively rather than importing the prebuilt
`@carbon/styles/css/styles.css`. A consumer who cannot run Sass in their build
has no way to avoid Carbon's global reset.

### Notable transitive runtime dependencies

These ship to the browser and are worth naming because they are third-party code
inside Carbon rather than Carbon's own:

| Package | Version | Licence | What Carbon uses it for |
| --- | --- | --- | --- |
| `flatpickr` | 4.6.13 | MIT | The entire `DatePicker`. Not React; manipulates the DOM directly. |
| `downshift` | 9.4.0 | MIT | `Dropdown`, `ComboBox`, `MultiSelect` behaviour and ARIA. |
| `@floating-ui/dom` | 1.8.0 | MIT | `Popover` / `Tooltip` / `Toggletip` positioning. |
| `es-toolkit` | 1.50.0 | MIT | Lodash-style utilities. |
| `@internationalized/number` | 3.6.7 | Apache-2.0 | `NumberInput` formatting. Adobe's package — the same family React Aria is built on. |

`flatpickr` is the one to keep in view. It is a 2016-era non-React widget on
version 4.6.13, and it is the source of three separate findings in
`EVIDENCE.md`: the only overlay in the whole of Carbon that escapes the token
scope, the only component that cannot format dates with `Intl`, and the only
component that does not mirror in RTL.

## No third-party substitution

Constraint 2 forbids filling a gap with a package outside the candidate's
ecosystem. Nothing was added. The `datetime-range-picker` requirement was met by
composing Carbon's own free, native `DatePicker datePickerType="range"` with two
Carbon `TimePicker`s. No date library, no range library, no polyfill.

The one non-Carbon thing this app installs is `sass`, which is the compiler
`@carbon/styles` is authored in and which Carbon documents as the supported way
to consume its styles. It ships nothing.

## The packages there was no need to omit

Stated explicitly, because for MUI this table was the substance of the run:

| Package | Exists? |
| --- | --- |
| A Carbon "Pro" tier | No |
| A Carbon commercial date-range picker | No — `datePickerType="range"` is free |
| A Carbon commercial data grid | No — `DataTable` is free, and there is no paid grid to buy column resize from either |

Carbon has no commercial tier at all. Column resize and reorder are absent from
Carbon **entirely**, not withheld behind a licence — which is a different kind of
problem (no upgrade path) but not a licensing one.

## IBM Telemetry — the one finding in this file worth escalating

**Both direct Carbon dependencies run a telemetry collector on install.**

```
@carbon/react   "postinstall": "ibmtelemetry --config=telemetry.yml"
@carbon/styles  "postinstall": "ibmtelemetry --config=telemetry.yml"
```

`@ibm/telemetry-js@1.11.0` (Apache-2.0) performs static analysis of the
consuming project's source and POSTs the result to
`https://www-api.ibm.com/ibm-telemetry/v1/metrics`.

Read from `@ibm/telemetry-js/README.md` and the two `telemetry.yml` files, what
it collects is:

- date and time of collection
- a de-identified form of the project's **git repository URL**
- a de-identified form of the project's most recent **commit hash**, and the
  branches and tags on it
- a de-identified form of the project's **name** and its version from
  `package.json`
- the project's full npm **dependency list**
- **which Carbon JSX elements the project uses, and which props are set on
  them**, against an allow-list of ~450 prop names and ~250 prop string values
  enumerated in `@carbon/react/telemetry.yml`

Facts that soften it:

- IBM documents that collection runs **only on CI servers and in containers**,
  never on a developer's local machine.
- The package has no exports and no runtime code; nothing reaches shipped output.
- It is opt-out-able with a single environment variable:
  `IBM_TELEMETRY_DISABLED=true`.
- Values are de-identified (hashed) rather than sent in the clear.

Facts that do not:

- It is **on by default**, and the default behaviour of installing a UI library
  is not usually "transmit a description of your codebase to the vendor".
- "De-identified" is not the same as anonymous. A hashed repository URL is a
  stable identifier for that repository, and combined with the dependency list
  and the exact set of Carbon props in use it is a reasonably distinctive
  fingerprint.
- The prop-value allow-list includes `locale`, `dir`, `dateFormat` and `theme`,
  so the shape of a deployment is inferable.

**This is a procurement and data-governance question, not an engineering one, and
it should go to whoever owns UNDRR's supplier data policy before Carbon is
adopted.** The engineering mitigation is one line in CI
(`IBM_TELEMETRY_DISABLED=true`), and if Carbon is adopted that line should be in
the pipeline from the first commit rather than added after someone notices.

Neither MUI, React Aria nor Mantine installs anything comparable. Recorded here
rather than in `EVIDENCE.md` because it is a property of the dependency tree.

## Installed size

Not captured as a per-app figure. `pnpm`'s content-addressed store hard-links
packages between apps, so a per-app `du` reports store-wide content and
overstates the marginal cost.

The comparable figure is shipped bundle size, in `evidence.json`:

| Asset | Raw | Gzipped |
| --- | --- | --- |
| JavaScript | 762.9 kB | **207.7 kB** |
| CSS (host + tokens + Carbon components + demo) | 490.1 kB | **53.8 kB** |
| **Total shipped** | 1,253.0 kB | **261.5 kB** |
| `styles.css` leakage probe, `?globalcss=on` only | 830.8 kB | 83.4 kB |

The probe stylesheet is code-split behind a dynamic import and is fetched only
when the URL carries `?globalcss=on`, so it is not part of the shipped cost. It
is in `dist/` because the leakage measurement in `EVIDENCE.md` runs against the
built preview.

For context across the runs so far:

| Run | Gzipped JS | Dependencies |
| --- | --- | --- |
| `mangrove-react-aria` | 237.6 kB | 20 |
| `delta-carbon` | **207.7 kB** | **145** |
| `delta-mui` | 387.4 kB | 142 |

Carbon ships the least JavaScript of the three despite having by far the largest
CSS, which follows directly from its architecture: styling is a stylesheet with
custom properties rather than a runtime CSS-in-JS engine, so there is no emotion
or styled-engine in the bundle. The 145-package dependency count is high, but 12
of those are Carbon's own scoped packages and 9 are fonts that ship nothing.
