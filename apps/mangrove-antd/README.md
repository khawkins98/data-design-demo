# mangrove-antd

Ant Design 6.5.3 on the Mangrove host shell, against the real published
`@undrr/undrr-mangrove@1.8.1` stylesheet.

| | |
| --- | --- |
| Evidence | [`EVIDENCE.md`](./EVIDENCE.md), [`evidence.json`](./evidence.json) |
| Licences | [`licences.md`](./licences.md) |
| Dev port | 5208 |
| Preview port | 5209 |

## Run

From the repository root:

```sh
pnpm --filter ./apps/mangrove-antd dev        # hot reload, http://localhost:5208
pnpm --filter ./apps/mangrove-antd build
pnpm --filter ./apps/mangrove-antd preview    # http://localhost:5209
pnpm --filter ./apps/mangrove-antd test:e2e   # Playwright, 3 viewports
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
`apps/delta-antd`: the `ConfigProvider` theme, the shared demo state, the
column-resize hook, and seven of the eight page sections.

This app owns four files, and only four:

| File | Why it cannot be shared |
| --- | --- |
| `src/main.tsx` | stylesheet imports and their order, which is load-bearing here: Mangrove's real stylesheet is imported by deep path, because its `main` field points at a `dist/` the tarball does not ship |
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

**antd's controls render as MANGROVE's controls on this host. Not approximately -
identically.**

`StyleProvider layer` wraps every antd rule in a CSS `@layer`, and Mangrove 1.8.1
ships **zero** `@layer` at-rules. Unlayered CSS beats layered CSS regardless of
specificity, so Mangrove's `input[type=text]` rules win outright over antd's
`.ant-input`. Measured against a bare Mangrove input injected into the same page:
2px `#1a1a1a` border, 46px height, 0 radius, Roboto - identical on both.

**Zero lines of host-repair CSS were written**, where `mangrove-mui` needed 27 to
fight those same Mangrove rules and keep MUI looking like MUI.

Whether that is the point or the problem is a decision for UNDRR, not a defect.
[`EVIDENCE.md`](./EVIDENCE.md) sets out both sides. It is reversible per site by
dropping `layer`.

Compare this app's `screenshots/` with [`apps/delta-antd`](../delta-antd)'s at the
same viewport. The two do not look alike, and that is expected: no conclusion from
one host's screenshots transfers to the other.
