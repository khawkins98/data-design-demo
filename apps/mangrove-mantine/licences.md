# Licences — mangrove-mantine

Generated with:

```sh
pnpm licenses list --json --filter @undrr-eval/mangrove-mantine
```

Installed sizes are the on-disk size of each package's resolved directory in the
pnpm store, walked recursively.

## Summary

| Licence | Packages |
| --- | --- |
| MIT | 96 |
| Apache-2.0 | 6 |
| ISC | 5 |
| MPL-2.0 | 2 |
| BSD-3-Clause | 1 |
| CC-BY-4.0 | 1 |
| (MIT OR CC0-1.0) | 1 |
| **Total** | **113** |

**No commercial, paid-tier, trial or evaluation licence is present, and none was
needed.** This matters for the comparison: `@mantine/core`, `@mantine/dates` and
`@mantine/hooks` are all plain MIT, and `@mantine/dates` includes the date-time
**range** picker that MUI puts behind `@mui/x-date-pickers-pro`
(`SEE LICENSE IN LICENSE`, commercial). Mantine has no paid tier at all — there
is no Mantine equivalent of MUI X Pro, so there is no requirement in this
evaluation that a licence fee could unlock.

The MPL-2.0 entries are `lightningcss` platform binaries pulled in by Vite, a
build-time dependency that ships nothing to the browser. `CC-BY-4.0` is a
`caniuse-lite` data file, also build-time.

## What Mantine costs at runtime

21 of the 113 packages are reachable from the browser bundle because of Mantine:

| Package | Why |
| --- | --- |
| `@mantine/core`, `@mantine/dates`, `@mantine/hooks` | the library itself, three packages |
| `@floating-ui/react`, `@floating-ui/react-dom`, `@floating-ui/dom`, `@floating-ui/core`, `@floating-ui/utils` | overlay positioning for Popover, Tooltip, Modal and every combobox dropdown |
| `react-remove-scroll`, `react-remove-scroll-bar`, `react-style-singleton`, `use-callback-ref`, `use-sidecar`, `detect-node-es`, `get-nonce`, `tslib` | scroll locking for Modal and Drawer |
| `react-number-format` | `NumberInput` |
| `clsx` | class name composition |
| `type-fest` | types only, erased at build |
| `tabbable` | focus trapping |
| `dayjs` | peer dependency of `@mantine/dates`, required |

`dayjs` is a *peer* dependency, so it is the consumer's job to install it and to
import the locale files. Four `import "dayjs/locale/…"` lines in `App.tsx` are
there for that reason; without them `DatesProvider` silently falls back to
English formatting in French, German and Arabic.

## Full tree

| Package | Version | Licence | Installed |
| --- | --- | --- | --- |
| `playwright-core` | 1.62.1 | Apache-2.0 | 13128 kB |
| `@esbuild/darwin-arm64` | 0.25.12 | MIT | 9703 kB |
| `@mantine/core` | 9.5.1 | MIT | 8904 kB |
| `lightningcss-darwin-arm64` | 1.32.0 | MPL-2.0 | 8333 kB |
| `react-dom` | 19.2.8 | MIT | 7148 kB |
| `sass` | 1.102.0 | MIT | 5808 kB |
| `playwright` | 1.62.1 | Apache-2.0 | 4957 kB |
| `@undrr/undrr-mangrove` | 1.8.1 | Apache-2.0 | 3250 kB |
| `rollup` | 4.62.4 | MIT | 2786 kB |
| `@babel/types` | 7.29.8 | MIT | 2686 kB |
| `vite` | 6.4.3 | MIT | 2601 kB |
| `@types/node` | 22.20.1 | MIT | 2381 kB |
| `@babel/parser` | 7.29.8 | MIT | 1955 kB |
| `@rollup/rollup-darwin-arm64` | 4.62.4 | MIT | 1772 kB |
| `jiti` | 2.7.0 | MIT | 1711 kB |
| `caniuse-lite` | 1.0.30001806 | CC-BY-4.0 | 1464 kB |
| `@mantine/dates` | 9.5.1 | MIT | 1400 kB |
| `@mantine/hooks` | 9.5.1 | MIT | 1276 kB |
| `csstype` | 3.2.3 | MIT | 1224 kB |
| `@floating-ui/react` | 0.27.20 | MIT | 912 kB |
| `@babel/helpers` | 7.29.7 | MIT | 857 kB |
| `@babel/core` | 7.29.7 | MIT | 795 kB |
| `immutable` | 5.1.9 | MIT | 709 kB |
| `@babel/traverse` | 7.29.8 | MIT | 693 kB |
| `dayjs` | 1.11.21 | MIT | 664 kB |
| `type-fest` | 5.8.0 | (MIT OR CC0-1.0) | 556 kB |
| `@babel/generator` | 7.29.8 | MIT | 529 kB |
| `lightningcss` | 1.32.0 | MPL-2.0 | 499 kB |
| `tabbable` | 6.5.0 | MIT | 417 kB |
| `@types/react` | 19.2.18 | MIT | 399 kB |
| `node-addon-api` | 7.1.1 | MIT | 387 kB |
| `@parcel/watcher-darwin-arm64` | 2.5.1 | MIT | 336 kB |
| `fsevents` | 2.3.2 | MIT | 322 kB |
| `react-number-format` | 5.4.5 | MIT | 238 kB |
| `json5` | 2.2.3 | MIT | 231 kB |
| `@floating-ui/core` | 1.8.0 | MIT | 213 kB |
| `postcss` | 8.5.25 | MIT | 213 kB |
| `electron-to-chromium` | 1.5.401 | ISC | 192 kB |
| `picomatch` | 2.3.2 | MIT | 179 kB |
| `@floating-ui/dom` | 1.8.0 | MIT | 170 kB |
| `react` | 19.2.8 | MIT | 168 kB |
| `@babel/helper-module-transforms` | 7.29.7 | MIT | 158 kB |
| `@jridgewell/trace-mapping` | 0.3.31 | MIT | 143 kB |
| `source-map-js` | 1.2.1 | BSD-3-Clause | 137 kB |
| `esbuild` | 0.25.12 | MIT | 133 kB |
| `baseline-browser-mapping` | 2.11.12 | Apache-2.0 | 132 kB |
| `@parcel/watcher` | 2.5.1 | MIT | 129 kB |
| `@jridgewell/gen-mapping` | 0.3.13 | MIT | 92 kB |
| `tslib` | 2.8.1 | 0BSD | 88 kB |
| `@jridgewell/sourcemap-codec` | 1.5.5 | MIT | 85 kB |
| `@types/babel__traverse` | 7.28.0 | MIT | 84 kB |
| `undici-types` | 6.21.0 | MIT | 82 kB |
| `scheduler` | 0.27.0 | MIT | 81 kB |
| `chokidar` | 5.0.0 | MIT | 80 kB |
| `react-remove-scroll` | 2.7.2 | MIT | 77 kB |
| `browserslist` | 4.28.7 | MIT | 73 kB |
| `@babel/template` | 7.29.7 | MIT | 70 kB |
| `semver` | 6.3.1 | ISC | 68 kB |
| `@babel/compat-data` | 7.29.7 | MIT | 67 kB |
| `@floating-ui/utils` | 0.2.12 | MIT | 65 kB |
| `@floating-ui/react-dom` | 2.1.9 | MIT | 62 kB |
| `@babel/helper-module-imports` | 7.29.7 | MIT | 62 kB |
| `@vitejs/plugin-react` | 4.7.0 | MIT | 60 kB |
| `node-releases` | 2.0.52 | MIT | 60 kB |
| `@jridgewell/remapping` | 2.3.5 | MIT | 58 kB |
| `react-refresh` | 0.17.0 | MIT | 57 kB |
| `micromatch` | 4.0.8 | MIT | 55 kB |
| `@babel/helper-compilation-targets` | 7.29.7 | MIT | 55 kB |
| `fdir` | 6.5.0 | MIT | 52 kB |
| `@jridgewell/resolve-uri` | 3.1.2 | MIT | 52 kB |
| `use-callback-ref` | 1.3.3 | MIT | 51 kB |
| `use-sidecar` | 1.1.3 | MIT | 48 kB |
| `@babel/helper-validator-identifier` | 7.29.7 | MIT | 48 kB |
| `detect-libc` | 1.0.3 | Apache-2.0 | 44 kB |
| `braces` | 3.0.3 | MIT | 44 kB |
| `debug` | 4.4.3 | MIT | 42 kB |
| `tinyglobby` | 0.2.17 | MIT | 38 kB |
| `@babel/code-frame` | 7.29.7 | MIT | 34 kB |
| `@types/babel__core` | 7.20.5 | MIT | 33 kB |
| `jsesc` | 3.1.0 | MIT | 33 kB |
| `@babel/helper-string-parser` | 7.29.7 | MIT | 31 kB |
| `@playwright/test` | 1.62.1 | Apache-2.0 | 29 kB |
| `gensync` | 1.0.0-beta.2 | MIT | 28 kB |
| `@rolldown/pluginutils` | 1.0.0-beta.27 | MIT | 26 kB |
| `@types/estree` | 1.0.9 | MIT | 26 kB |
| `nanoid` | 3.3.17 | MIT | 25 kB |
| `react-remove-scroll-bar` | 2.3.8 | MIT | 24 kB |
| `@babel/helper-globals` | 7.29.7 | MIT | 23 kB |
| `to-regex-range` | 5.0.1 | MIT | 22 kB |
| `readdirp` | 5.0.0 | MIT | 22 kB |
| `react-style-singleton` | 2.2.3 | MIT | 19 kB |
| `update-browserslist-db` | 1.2.3 | MIT | 17 kB |
| `fill-range` | 7.1.1 | MIT | 16 kB |
| `convert-source-map` | 2.0.0 | MIT | 15 kB |
| `lru-cache` | 5.1.1 | ISC | 15 kB |
| `js-tokens` | 4.0.0 | MIT | 15 kB |
| `yallist` | 3.1.1 | ISC | 14 kB |
| `is-glob` | 4.0.3 | MIT | 13 kB |
| `escalade` | 3.2.0 | MIT | 12 kB |
| `@babel/helper-validator-option` | 7.29.7 | MIT | 11 kB |
| `@babel/helper-plugin-utils` | 7.29.7 | MIT | 11 kB |
| `@types/babel__generator` | 7.27.0 | MIT | 11 kB |
| `is-number` | 7.0.0 | MIT | 9 kB |
| `@babel/plugin-transform-react-jsx-source` | 7.29.7 | MIT | 9 kB |
| `@babel/plugin-transform-react-jsx-self` | 7.29.7 | MIT | 9 kB |
| `clsx` | 2.1.1 | MIT | 8 kB |
| `@types/babel__template` | 7.4.4 | MIT | 7 kB |
| `ms` | 2.1.3 | MIT | 7 kB |
| `picocolors` | 1.1.1 | ISC | 6 kB |
| `is-extglob` | 2.1.1 | MIT | 6 kB |
| `get-nonce` | 1.0.1 | MIT | 5 kB |
| `detect-node-es` | 1.1.0 | MIT | 3 kB |
| `tagged-tag` | 1.0.0 | MIT | 2 kB |

Total installed: 93.3 MiB across 113 packages, dev dependencies included.
