# Decision axes

The comparison matrix (`comparison.md`) answers *can this library do the thing*.
Across 240 requirement assessments the answer was yes everywhere: zero
`unsupported`, zero blockers. That means the matrix, on its own, does not
discriminate — and a reader looking for a decision will reach for whatever
number is largest, which is lines of code.

Lines of code is the wrong number. It is merely the easiest one to count.

This document defines the five axes that actually bear on the decision, states
for each what is measured and what is judgement, and records where a measurement
cannot honestly be made.

## Why lines of code misleads

Counting volume and counting what the volume is *made of* give opposite rankings:

| | CSS rules | hooks off the library's theming route | hooks on a documented route |
| --- | --- | --- | --- |
| React Aria | 121-133 | **0** | 15-16 semantic attributes |
| Carbon | 25-48 | **15-16** | 0 |
| Mantine | 14-18 | **0** | 3-4 documented classes |
| MUI | 3-5 | **0** | 2-4 documented classes |

React Aria carries roughly five times Carbon's stylesheet and none of Carbon's
off-route styling, because React Aria's rules target published `data-*` state
attributes - the mechanism the library offers for exactly this - while Carbon's
target `cds--` BEM classes, which Carbon documents as an internal authoring
convention with a reconfigurable prefix while pointing consumers at `--cds-*`
custom properties instead.

So volume is a supporting figure under A1, never a headline.

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

**Not measured, and cannot be.** Human implementation time. These demos were
built by agents, some in parallel, at speeds that say nothing about how long a
person takes. Any hour figure derived from this repository would be invented.

The friction log is the honest proxy: time is consumed by dead ends, not by
typing. A library where 26 of 30 requirements are `native` and nothing surprised
the implementer is fast. A library with ten `composed` requirements and eight
documented traps is not, regardless of final line count.

## A2 - Maintainability at scale

*How hard is this to keep working across multiple sites, over upgrades?*

The multiplier is the point. A fragile integration maintained on one site is an
annoyance; on eight sites it is eight independent breakages, discovered
separately.

**Measured.** Every distinct styling hook, classified by the promise behind it.
A binary safe/fragile split was the wrong shape: the libraries make genuinely
different promises, and reading their documentation moved two of them.

| Tier | What it is | Examples |
| --- | --- | --- |
| `attribute` | Semantic state selectors. Survive DOM restructuring, because they are not tied to structure | React Aria `[data-selected]`, `[slot=…]` |
| `contract` | Class names the library documents as a styling API | Mantine `.mantine-{Component}-{element}`, gated behind `withStaticClasses`; MUI's documented global classes |
| `off route` | Styling achieved by going around the library's own theming mechanism | Carbon `.cds--*`, documented as internal BEM with a prefix consumers may reconfigure, while Carbon points at `--cds-*` custom properties for theming |
| `hashed` | Build-generated class names, unambiguously internal | Mantine `.m_8fb7ebe7`, Emotion `.css-1q2w3e` |

`off route` is the number that matters, and it is **not** a prediction of
breakage — Carbon's class names are stable in practice. It counts the places the
supported theming route did not reach, which is what accumulates as sites and
upgrades multiply.

Also measured: token propagation (see A5), which decides whether a design change
requires touching each site at all.

**Judgement.** Whether a given off-route override is load-bearing or cosmetic.
The count is mechanical; the severity is not. Listed per pairing, not scored.

**Discarded.** `customCss.overridesLibraryInternals`, which every run set to
`true` including six with no off-route hook at all. A self-assessment that
collapses to a constant carries no information. Two measurement bugs of my own
were caught here and are worth recording: the first scan counted class names
appearing inside CSS *comments*, penalising exactly the pairings that documented
their reasoning, and the second treated Mantine's documented static classes as
internals.

## A3 - Reproducibility across sites

*If every site has to recreate the implementation, that compounds everything
else.*

This is the axis nothing in the original evaluation measured, because it built
eight standalone demos - the opposite arrangement to the one being asked about.

**Measured by experiment.** The host-independent part of the integration is
extracted into a single shared package and both host apps are rewired to consume
it. What is left in each app is, by construction, the per-site cost. What refuses
to move is recorded with the reason.

| Outcome | Meaning |
| --- | --- |
| `packaged` | The integration lives in one package; sites import it and supply host glue only |
| `partial` | A shared core exists but each site re-authors a named part, for a stated reason |
| `fork-per-site` | The library's distribution model requires each site to own a copy of the source |

**Done for MUI only, and the results say `basis: measured` or `analysed`
accordingly.** `packages/integration-mui` holds 809 code lines - the entire token
mapping and seven of the eight page sections - and both MUI apps now import it.
809 shared against 273-281 per site, and 135-149 of that residue is
`SectionSideBySide`, which renders host markup beside candidate markup and so
exists only because this is an evaluation. Excluding it, 86% is shared.

The residue's *shape* matters more than its size: three of four items are wiring,
and the fourth is host repair that scales with how aggressively the host styles
bare elements - 11 lines against Delta, 27 against Mangrove.

The refactor was checked for behaviour preservation rather than assumed: the built
CSS bundle is byte-identical, `document.scrollHeight` and all eight section
offsets are unchanged, and screenshots reproduce to within 1-5 pixels at a maximum
channel delta of 2.

**Not done for Carbon or Mantine, deliberately.** Zero of their files are
code-identical across hosts, so unifying them means discarding one of two
independent implementations. That is a rewrite, and a rewrite cannot measure
whether an integration is shareable - it only measures whether I can write one.

**A caveat found while verifying.** The committed `mangrove-mui` tablet RTL
screenshots do not reproduce from their own code: the unmodified baseline
regenerates them with 9-30% of pixels different, identically on repeated runs.
So those particular PNGs were captured under conditions the repository no longer
reproduces. Unrelated to the extraction, but it means committed screenshots are
not a reliable regression baseline, and any future refactor should verify against
computed layout instead, as this one did.

**A caveat that must be stated.** The raw divergence between `delta-<x>` and
`mangrove-<x>` is *not* evidence for this axis, however tempting it looks.
`delta-mui` and `mangrove-react-aria` were built first; the other six were built
afterwards in parallel, so the MUI and React Aria runs had a sibling to copy and
the Carbon and Mantine runs did not. Divergence therefore measures whether an
agent had a head start, not whether a library needs per-site work.

Two further measurements were tried and discarded for the same reason. Counting
host-coupling points gave 2-3 files for every pairing, because the scaffold hides
the host behind `HostShell` by design - it measures the scaffold, not the library.
Classifying CSS declarations as token-valued or neutralising put MUI at zero
because MUI's styling lives in `theme.ts` rather than in CSS, so it systematically
misreads whichever library themes in JavaScript. Extraction is the only method
that treats all four fairly, which is why the axis reports `basis` per candidate
instead of a number for everyone.

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

Note the direction of the collision matters. A candidate that loses specificity
fights to the host is easier to live with than one that wins them, because the
host is the thing that must stay correct.

## A5 - Theming fidelity and propagation

*How closely can it be made to look like Mangrove, in a way that stays coherent?*

Two distinct questions, and the second is the one that bites at scale.

**Fidelity - what can be expressed**

| Signal | Source | Reading |
| --- | --- | --- |
| `theming.tokensApplied` | evidence | Tokens the library accepted |
| `theming.tokensUnreachable` | evidence | Tokens it cannot accept **at all** - a ceiling, not a cost |

A non-zero `tokensUnreachable` is qualitatively different from a high line
count. Carbon leaves 21-22 of 71 UNDRR tokens unreachable: no amount of effort
closes that gap, because there is no hook to attach them to.

**Propagation - what happens when Mangrove changes**

| Model | Consequence for N sites |
| --- | --- |
| Live custom properties | A Mangrove token change reaches every site with no code change and no rebuild |
| Build-time theme object | Values are resolved to literals at compile time, so every site must be rebuilt |
| Hand-maintained mapping | Someone re-verifies the mapping per upgrade, per site |

This is where a build-time theme system quietly costs more than its tidy
`createTheme()` call suggests, and it is invisible in any line count.

## What this does not cover

Procurement and governance questions do not reduce to axes and are tracked
separately in the repository's issues: dependency telemetry, licence obligations
and the origin of a dependency are decisions for people, not measurements.
