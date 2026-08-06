# delta-antd

Ant Design 6.5.3 on the Delta host shell (Tailwind CSS 4, including Preflight).

| | |
| --- | --- |
| Evidence | [`EVIDENCE.md`](./EVIDENCE.md), [`evidence.json`](./evidence.json) |
| Licences | [`licences.md`](./licences.md) |
| Dev port | 5206 |
| Preview port | 5207 |

## Run

From the repository root:

```sh
pnpm --filter ./apps/delta-antd dev        # hot reload, http://localhost:5206
pnpm --filter ./apps/delta-antd build
pnpm --filter ./apps/delta-antd preview    # http://localhost:5207
pnpm --filter ./apps/delta-antd test:e2e   # Playwright, 3 viewports
```

Playwright needs its browser once:

```sh
pnpm exec playwright install chromium
```

To see this demo alongside the other nine, which is the only way to click between
them:

```sh
pnpm site
```

## Where the code lives

Most of this pairing is **not** in this directory. The host-independent part of
the integration is in `packages/integration-antd` and is shared with
`apps/mangrove-antd`: the `ConfigProvider` theme, the shared demo state, the
column-resize hook, and seven of the eight page sections.

This app owns four files, and only four:

| File | Why it cannot be shared |
| --- | --- |
| `src/main.tsx` | stylesheet imports and their order |
| `src/App.tsx` | wires in this host's own `HostShell`, plus the `ConfigProvider` and `StyleProvider` setup |
| `src/demo.css` | the column-resize grip and section 9's grid |
| `src/sections/SectionSideBySide.tsx` | renders host markup beside candidate markup, so it is host-specific by definition |

That split is the point rather than tidiness: it is the measurement for axis A3 in
[`docs/decision-axes.md`](../../docs/decision-axes.md), which asks whether one
package can serve many sites.

## The `candidate` query parameter

| URL | Renders |
| --- | --- |
| `?candidate=on`, or omitted | host shell plus Ant Design |
| `?candidate=off` | host shell alone, empty candidate subtree |

`off` is not a debugging convenience. It is the leakage assertion's baseline: the
harness loads the page both ways and diffs the computed styles of the host's 14
canary elements.

## Do not hard-code `base`

`vite.config.ts` deliberately has no `base`. `scripts/build-apps.mjs` supplies it
for local and Pages builds and then verifies it landed in `dist/index.html`.
Hard-coding it breaks `pnpm site`.

## What to look at

**antd's own styling survives on this host, and the theme is in charge.**

`StyleProvider layer` wraps every antd rule in a CSS `@layer`. Tailwind 4 compiles
its Preflight into `@layer base`, so host and candidate are both layered and
antd's later layer wins normally. Measured: the input keeps its 1px border, 40px
height from the `controlHeight` seed token and 4px radius, and the primary button
renders `rgb(47, 111, 143)` - the UNDRR accent token.

**Zero lines of host-repair CSS were needed.**

Then read [`apps/mangrove-antd`](../mangrove-antd), where the *same* `layer`
setting produces the opposite outcome, because Mangrove 1.8.1 ships no `@layer` at
all and its unlayered rules beat antd's layered ones regardless of specificity.
Comparing the two apps' `screenshots/` directories at the same viewport is the
fastest way to see what that one prop does.
