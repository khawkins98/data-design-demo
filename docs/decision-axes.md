# Decision axes

Seven axes for choosing a component library across UNDRR's estate (DELTA,
Mangrove-based properties, future data systems), replacing PrimeReact.
`undrr-questions.md` maps the six framing questions onto these axes.

## Why lines of code misleads

Volume and composition give opposite rankings:

| | CSS rules | hooks off the library's theming route | hooks on a documented route |
| --- | --- | --- | --- |
| React Aria | 121-133 | **0** | 15-16 semantic attributes |
| Carbon | 25-48 | **15-16** | 0 |
| Mantine | 14-18 | **0** | 3-4 documented classes |
| MUI | 3-5 | **0** | 2-4 documented classes |

React Aria's rules target published `data-*` attributes (the documented styling
mechanism); Carbon's target `cds--` BEM classes (documented as internal). Volume
is a supporting figure under A1, not a headline.

## A1 - Implementation effort

*What is the scale of time to build this the first time?*

**Measured**

| Signal | Source | Reading |
| --- | --- | --- |
| Requirement mix | `requirements[].status` | `native` costs nothing; `composed` means assembling several components; `custom` means building the behaviour |
| Wrappers | `wrappers.count`, `wrappers.totalLines` | Code standing between the host and the library |
| Escape hatches | `theming.escapeHatchesUsed[]` | Each is a place the documented path did not suffice |
| Friction log | `EVIDENCE.md` prose | Each entry is a documented approach that failed and had to be worked around |
| Volume | `customCss.lines`, src lines | Supporting only |

**Not measured.** Human implementation time — demos were built by agents, so
hour figures would be meaningless. The friction log (escape hatches, dead ends)
is the proxy.

## A2 - Maintainability at scale

*How hard is this to keep working across multiple sites, over upgrades?*

**Measured.** Every distinct styling hook, classified by the promise behind it.

| Tier | What it is | Examples |
| --- | --- | --- |
| `attribute` | Semantic state selectors. Survive DOM restructuring, because they are not tied to structure | React Aria `[data-selected]`, `[slot=…]` |
| `contract` | Class names the library documents as a styling API | Mantine `.mantine-{Component}-{element}`, gated behind `withStaticClasses`; MUI's documented global classes |
| `off route` | Styling achieved by going around the library's own theming mechanism | Carbon `.cds--*`, documented as internal BEM with a prefix consumers may reconfigure, while Carbon points at `--cds-*` custom properties for theming |
| `hashed` | Build-generated class names, unambiguously internal | Mantine `.m_8fb7ebe7`, Emotion `.css-1q2w3e` |

`off route` counts the places the supported theming route did not reach.
Also measured: token propagation (see A5).

**Judgement.** Whether a given off-route override is load-bearing or cosmetic.
Listed per pairing, not scored.

## A3 - Reproducibility across sites

*If every site has to recreate the implementation, that compounds everything
else.*

**Measured by experiment.** The host-independent part of the integration is
extracted into a shared package and both host apps consume it. What remains in
each app is the per-site cost; what refuses to move is recorded with the reason.

| Outcome | Meaning |
| --- | --- |
| `packaged` | The integration lives in one package; sites import it and supply host glue only |
| `partial` | A shared core exists but each site re-authors a named part, for a stated reason |
| `fork-per-site` | The library's distribution model requires each site to own a copy of the source |

**Measured for MUI, Ant Design and one realistic React Aria capability; the
results distinguish `basis: measured` from `analysed`.**
`packages/integration-mui` holds 809 code lines - the entire token mapping and
seven of the eight page sections - and both MUI apps now import it.
809 shared against 273-281 per site, and 135-149 of that residue is
`SectionSideBySide`, which renders host markup beside candidate markup and so
exists only because this is an evaluation. Excluding it, 86% is shared.

The residue is mostly wiring (3 of 4 items); the fourth is host repair that
scales with how aggressively the host styles bare elements (11 lines on Delta,
27 on Mangrove).

`packages/integration-react-aria` tests a narrower but more realistic unit: the
records workspace used by the DELTA application and Mangrove island. It holds
618 non-comment TypeScript lines and 147 CSS lines for filters, sorting,
selection, pagination, announcement policy and layout. Both hosts import it;
their frame, page composition and reset repair remain local. The controlled
change results are in `reuse-results.json` and rendered on the architecture page.

**Not done for Carbon or Mantine** — zero files are code-identical across hosts,
so unifying would be a rewrite, not a measurement.

**Screenshot non-determinism.** Mangrove host screenshots are not byte-
reproducible (icon webfont suspected). Screenshots remain useful as illustrations,
not as regression assertions.

## A4 - Mangrove compatibility

*Does it coexist with the design system it has to live inside?*

**Measured**

| Signal | Source | Reading |
| --- | --- | --- |
| Leakage | `leakage.assertionPassed`, `differences[]` | Did the candidate restyle the host outside its own subtree |
| Global stylesheet cost | `leakage.globalStylesheetProbe` | What the *documented* setup does when loaded as documented |
| Containment tax | `theming.escapeHatchesUsed[]` | Whether containment required abandoning the documented install |
| Host-on-candidate collisions | `EVIDENCE.md`, axe results | Mangrove's own CSS breaking the candidate |
| Portal reach | appearance assertions | Whether tokens survive `createPortal` |
| Mangrove 2.0 | `mangrove-2-preview.css` | Forward compatibility with channel-triplet custom properties |

## A5 - Theming fidelity and propagation

*How closely can it be made to look like Mangrove, in a way that stays coherent?*

**Fidelity - what can be expressed**

| Signal | Source | Reading |
| --- | --- | --- |
| `theming.tokensApplied` | evidence | Tokens the library accepted |
| `theming.tokensUnreachable` | evidence | Tokens it cannot accept **at all** - a ceiling, not a cost |

**Propagation - what happens when Mangrove changes**

| Model | Consequence for N sites |
| --- | --- |
| Live custom properties | A Mangrove token change reaches every site with no code change and no rebuild |
| Build-time theme object | Values are resolved to literals at compile time, so every site must be rebuilt |
| Hand-maintained mapping | Someone re-verifies the mapping per upgrade, per site |

## A6 - Right-to-left

*Does Arabic work, in the components as well as the page?*

**Measured**

| Signal | Source | Reading |
| --- | --- | --- |
| Outcome | `rtl.status` | `clean` or `issues` after the run's own mitigations |
| Recorded defects | `rtl.issues[]` | Each is a specific component and a measured symptom |
| Setup cost | requirement `rtl`, `status` + `customLinesOfCode` | `native` means a `dir` attribute sufficed; `composed` means the library needed configuring beyond it |
| Consistency across hosts | both pairings for one candidate | A candidate differing by host means the host is implicated; agreeing means the candidate is |

**`clean` status varies in cost.** React Aria and Ant Design need only a `dir`
attribute. Mantine reports `clean` but required 10-18 lines of mitigation
because its `Portal` drops `dir` inheritance.

**The mechanism generalises, and the recorded defects do not.** A library
authored in logical properties (`inset-inline-start`) flips because CSS flips it.
Libraries using logical properties (Carbon) flip automatically. Libraries
emitting physical offsets (`left: 0`, MUI) do not, and no configuration fixes
values already emitted.

**Not measured.** Whether Arabic reads correctly to an Arabic reader — these
tests cover layout direction only, not typography or translation quality.

## A7 - Accessibility conformance

*Does it meet UNDRR's accessibility commitments in practice?*

**Measured**

| Signal | Source | Reading |
| --- | --- | --- |
| Violations by impact | `axe.critical`, `axe.serious` | Automated WCAG failures at run time |
| Incomplete | `axe.incomplete` | Checks axe could not decide, each needing a human |
| Scope | `axe.scope`, `axe.wholePage` | Whether the figure covers the candidate subtree or the whole page including host baseline |
| Ownership | `axe.notes`, `EVIDENCE.md` | Whether a violation is the integration's or the library's own |

**Ownership matters.** A violation in integration code is a one-time fix. A
violation in the library's own markup arrives on every site and is fixable only
upstream.

**`incomplete` is not a pass.** Each is a check axe could not decide, still
owing a human review.

**Not measured.** No screen-reader pass, no keyboard walkthrough, no
cognitive-load review. Zero automated violations is a floor, not a conformance
claim.

## What this does not cover

Procurement and governance questions do not reduce to axes and are tracked
separately in the repository's issues: dependency telemetry, licence obligations
and the origin of a dependency are decisions for people, not measurements.
