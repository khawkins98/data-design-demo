# Licences: mangrove-carbon

Brief 1 constraint 2 requires the licence of every transitive dependency to be
checked, and forbids any paid, Pro, Premium, trial-key, evaluation-licence or
non-approved package.

**Result: no paid, trial or evaluation-licensed package is used, at any depth.**
Carbon has no commercial tier. Everything in the component library, including the
data table, the date range picker and the pagination control, is Apache-2.0.
There is no `@carbon/react-pro` and nothing was withheld from us — which is a
material difference from MUI, whose date-range and column-reorder features sit
behind a per-developer seat licence.

There is, however, a **non-licence governance finding**: 21 packages in this tree
run a `postinstall` script that reports usage telemetry to IBM. See the last
section; it is not a licensing problem but it is a procurement one.

Audited with:

```sh
pnpm licenses list --json --filter @undrr-eval/mangrove-carbon
```

## Summary across the full tree

146 unique packages resolved for this app, including build tooling.

| Licence | Packages |
| --- | --- |
| MIT | 106 |
| Apache-2.0 | 21 |
| OFL-1.1 | 9 |
| ISC | 5 |
| MPL-2.0 | 2 |
| BSD-3-Clause | 1 |
| 0BSD | 1 |
| CC-BY-4.0 | 1 |

All permissive. Notes on the four non-MIT/Apache groups:

- **OFL-1.1 (9 packages)** — the IBM Plex font family (`@ibm/plex`,
  `@ibm/plex-sans`, `@ibm/plex-mono`, `@ibm/plex-serif`, and the Arabic,
  Devanagari, Hebrew, Thai and Thai-Looped subsets). SIL Open Font Licence 1.1,
  which permits redistribution and embedding. They arrive as transitive
  dependencies of `@carbon/styles`. This demo does not ship them: the theme sets
  the UNDRR token font stack, and the prebuilt Carbon CSS references Plex from
  IBM's CDN rather than from the package. Worth flagging anyway, because a real
  deployment that wanted Carbon's intended typography would be self-hosting an
  IBM-branded font family — a brand question rather than a licence one.
- **MPL-2.0 (2)** — `lightningcss` and its darwin-arm64 binary, Vite's CSS
  transformer. Build-time only.
- **CC-BY-4.0 (1)** — `caniuse-lite`, a build-time browser dataset.
- **0BSD (1)** — `tslib`.

None of the MPL/CC-BY/0BSD entries reach shipped output; the position is identical
to any Vite project.

## Direct dependencies

| Package | Version | Licence | Ships to browser |
| --- | --- | --- | --- |
| `@carbon/react` | 1.113.0 | Apache-2.0 | yes |
| `@carbon/styles` | 1.112.0 | Apache-2.0 | yes (CSS) |
| `sass` | 1.102.0 | MIT | no (build only, for the scoped-CSS experiment) |
| `@undrr/undrr-mangrove` | 1.8.1 | Apache-2.0 | yes (host) |
| `react`, `react-dom` | 19.2.8 | MIT | yes |
| `@undrr-eval/*` | workspace | Apache-2.0 | yes |
| `vite`, `@vitejs/plugin-react` | 6.x, 4.x | MIT | no (build only) |
| `@playwright/test` | 1.58.x | Apache-2.0 | no (test only) |

## What `@carbon/react` pulls in

Carbon is not a single package. Its runtime dependency list is worth reading
before adoption, because several entries are libraries a team is then indirectly
on the hook for:

| Dependency | Version | What it does |
| --- | --- | --- |
| `flatpickr` | 4.6.13 (pinned) | The entire date picker. Not a wrapper — Carbon's `DatePicker` is a React shell around flatpickr's imperative API, which is why it is not a controlled component and why its calendar is appended to `document.body`. |
| `downshift` | 9.4.0 (pinned) | `Dropdown`, `ComboBox`, `MultiSelect`. Exposed as a `downshiftProps` escape hatch. |
| `@floating-ui/react` | ^0.27.4 | Popover and tooltip positioning. |
| `motion` | ^12.42.0 | Animation. |
| `es-toolkit` | ^1.27.0 | Utilities. |
| `@carbon/icons-react` | ^11.85.0 | Icon set. |
| `@ibm/telemetry-js` | ^1.5.0 | See below. |
| `classnames`, `prop-types`, `invariant`, `tabbable`, `copy-to-clipboard`, `react-fast-compare`, `@babel/runtime` | various | Support. |

All MIT or Apache-2.0. `flatpickr` and `downshift` are **pinned to exact
versions**, so a security fix in either waits on a Carbon release.

## No third-party substitution

Constraint 2 forbids filling a gap with a package outside the candidate's
ecosystem. Nothing was added. Specifically:

- The `datetime-range-picker` gap was closed by composing Carbon's own
  `DatePicker datePickerType="range"` with two Carbon `TimePicker`s. No date
  library was installed; the arithmetic is `Date` and `Intl`.
- `table-column-resize-or-reorder` was written by hand rather than by adding a
  drag-and-drop library.
- `sass` is not a substitution: it is the compiler for `@carbon/styles`' own Sass
  entry point, which Carbon documents as one of its two supported consumption
  routes. It is used only for the scoped-CSS containment experiment; the default
  build consumes the prebuilt `css/styles.css` and needs no Sass at all.

## Installed size

Not captured. `pnpm`'s content-addressed store hard-links packages between apps,
so a per-app `du` reports store-wide content and overstates the marginal cost.

The comparable figure is shipped bundle size, in `evidence.json`: **207.8 kB
gzipped JavaScript** and **121.8 kB gzipped CSS** (84.4 kB of that is Carbon's own
stylesheet, 34.8 kB is the Mangrove host, 2.7 kB is tokens plus our theme).

For context across the runs completed so far:

| Run | Gzipped JS | Dependencies |
| --- | --- | --- |
| `mangrove-react-aria` | 237.6 kB | 20 |
| `delta-mui` | 387.4 kB | 142 |
| `mangrove-carbon` | 207.8 kB | 146 |

Carbon ships the least JavaScript of the three and the most CSS by a wide margin.
That is the trade its architecture makes, and it is the same trade that produces
this run's leakage result.

## IBM telemetry: a procurement question, not a licence one

**21 packages in this tree declare `postinstall: ibmtelemetry --config=telemetry.yml`.**
Verified by reading each `package.json` in the resolved store, not from
documentation:

`@carbon/react`, `@carbon/styles`, `@carbon/colors`, `@carbon/themes`,
`@carbon/type`, `@carbon/layout`, `@carbon/grid`, `@carbon/motion`,
`@carbon/icons-react`, `@carbon/icon-helpers`, `@carbon/feature-flags`,
`@carbon/utilities` (12 Carbon packages), plus the 9 `@ibm/plex*` font packages.

Each POSTs to `https://www-api.ibm.com/ibm-telemetry/v1/metrics`.
`@carbon/react`'s `telemetry.yml` (991 lines) enables three collectors — `jsx`,
`npm` and `js` — and carries an allow-list of **829 entries (739 unique names)**
of component and prop names whose usage is reported.

- It runs at **install time**, so it fires in CI and on every developer machine.
- It is **on by default**. The opt-out is the environment variable
  `IBM_TELEMETRY_DISABLED=true`.
- IBM documents it as anonymised and aggregated. That claim is not verifiable from
  the consumer side.
- **No other candidate in this evaluation installs anything comparable.** React
  Aria, MUI and Mantine ship no telemetry hooks.

This is not a licence restriction and does not breach constraint 2. It is a data
governance decision a UN body should take deliberately rather than inherit: for
UNDRR the questions are whether build-time egress to a vendor endpoint is
acceptable under its own policies, and whether `IBM_TELEMETRY_DISABLED=true`
should be set in CI and documented for contributors. Raised here so it reaches the
procurement conversation rather than being discovered later.
