# Decision axes

The comparison matrix (`comparison.md`) answers *can this library do the thing*.
Across 240 requirement assessments the answer was yes everywhere: zero
`unsupported`, zero blockers. That means the matrix, on its own, does not
discriminate — and a reader looking for a decision will reach for whatever
number is largest, which is lines of code.

Lines of code is the wrong number. It is merely the easiest one to count.

This document defines the seven axes that actually bear on the decision, states
for each what is measured and what is judgement, and records where a measurement
cannot honestly be made.

The axes exist to answer a question larger than DELTA's component needs. What is
selected becomes the default front-end foundation for DELTA, for Mangrove-based
properties, and for data systems not yet built, replacing the PrimeReact
incumbent DELTA runs today. `undrr-questions.md` maps the six questions that
framing raises onto the axes below.

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

**Standardisation is the same question asked at estate scale**, and it is worth
naming rather than leaving implied. An integration that cannot be shared does not
merely cost more per site; it produces one dialect of the design system per
project, each with its own component names, its own token mapping and its own
bugs. What `packaged` buys is a single shared vocabulary; what `fork-per-site`
guarantees is divergence, whatever any individual site's code quality. This is
also the axis on which a migration differs from a greenfield build: there is
existing PrimeReact code to convert, so a candidate whose idioms map onto
`DataTable`/`Dialog`/`Paginator` shapes is cheaper to reach than one that does
not, independent of how it scores here on a fresh build.

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

## A6 - Right-to-left

*Does Arabic work, in the components as well as the page?*

This was a requirement row before it was an axis, which understated it. It is the
most consequential unresolved finding in the run, and a requirement row is not
where a reader looks for that.

**Measured**

| Signal | Source | Reading |
| --- | --- | --- |
| Outcome | `rtl.status` | `clean` or `issues` after the run's own mitigations |
| Recorded defects | `rtl.issues[]` | Each is a specific component and a measured symptom |
| Setup cost | requirement `rtl`, `status` + `customLinesOfCode` | `native` means a `dir` attribute sufficed; `composed` means the library needed configuring beyond it |
| Consistency across hosts | both pairings for one candidate | A candidate differing by host means the host is implicated; agreeing means the candidate is |

**`clean` is not one state, and the status field alone hides that.** Read it
against the setup cost. React Aria and Ant Design are `native` at zero custom
lines on both hosts: a `dir` attribute and, for React Aria, an `I18nProvider`.
Mantine also reports `clean`, but only after 10-18 lines and two mitigations,
because its `Portal` drops `dir` and freezes its container's props at mount, so
portalled overlays rendered LTR inside an RTL page and stayed LTR across locale
changes. Both are `clean`; they are not the same purchase.

**The mechanism generalises, and the recorded defects do not.** A library
authored in logical properties (`inset-inline-start`) flips because CSS flips it.
A library emitting physical offsets (`left: 0`) does not flip, and no
configuration reaches values already emitted. That distinction predicts the
result better than any count: Carbon's own components all flip for exactly this
reason, and MUI's outlined floating labels do not. Judge a candidate on which
side of it the library sits, not on how many defects this run happened to
provoke.

**Ownership is judgement, and it changes what a defect means.** Three recorded
issues have three different owners. MUI's floating-label failure is the
candidate's own CSS, reproduces on both hosts, and MUI's remedy is
`stylis-plugin-rtl` - a third-party package outside the candidate's own ecosystem
that constraint 2 forbids, so it cannot be fixed within the rules of this
evaluation. Carbon's is `flatpickr`, a third-party non-React widget whose month
arrows keep LTR positions, so it indicts a dependency choice rather than Carbon.
Mantine's was real and was mitigated, at a cost recorded in
`theming.escapeHatchesUsed`. Only the first is a property of the candidate UNDRR
would be adopting.

**Not measured, and cannot be here.** Whether Arabic *reads* correctly to an
Arabic reader. These fixtures test layout direction and mirroring, not
typography, line breaking, numeral form or translation quality. A clean result
means nothing is visibly inverted; it does not mean the interface is good in
Arabic.

**The decision this axis puts to UNDRR.** Whether misplaced field labels in
Arabic disqualify MUI Community for a service UNDRR delivers in Arabic, or
whether `stylis-plugin-rtl` is acceptable as part of adopting MUI. That is a
policy call about an Arabic-serving service, not a bug to be closed.

## A7 - Accessibility conformance

*Does it meet UNDRR's accessibility commitments in practice?*

Also a matrix cell before it was an axis. Accessibility is a standing
organisational obligation across every property, not a per-project feature, which
puts it on the same footing as the other six axes.

**Measured**

| Signal | Source | Reading |
| --- | --- | --- |
| Violations by impact | `axe.critical`, `axe.serious` | Automated WCAG failures at run time |
| Incomplete | `axe.incomplete` | Checks axe could not decide, each needing a human |
| Scope | `axe.scope`, `axe.wholePage` | Whether the figure covers the candidate subtree or the whole page including host baseline |
| Ownership | `axe.notes`, `EVIDENCE.md` | Whether a violation is the integration's or the library's own |

**Ownership decides whether a number is actionable.** A violation in integration
code is a bug to fix once. A violation inside the library's own markup is a
property of the library, arriving on every site that adopts it and fixable only
upstream. Ant Design's remaining `aria-hidden-focus` is the second kind: `rc-table`
renders an `aria-hidden` measure row whenever `scroll.x` is set and `rowSelection`
puts a focusable checkbox inside it - verified in the DOM. Row selection plus a
horizontally scrolling table is an ordinary combination, so it will affect any
real UNDRR table. The same run found and fixed two critical violations that were
its own. Both figures are 1 serious; only one of them is UNDRR's to fix.

**`incomplete` is not a pass.** It counts checks axe declined to decide, and each
is work a human still owes. MUI carries 4 on both hosts, the highest in the run,
against 0-1 for React Aria and Mantine. Reading `incomplete` as "clean" converts
unfinished review into a good score.

**A measurement limitation that must be stated.** The runs are not strictly
comparable. Nine of the ten ran axe unscoped; only `mangrove-mui` recorded a
scope and separated a whole-page figure from the candidate subtree, which is why
its whole-page count is higher (it includes a known Mangrove host baseline
`link-in-text-block` on the host's own canary paragraph, documented in
`requirements.md`, and not caused by MUI). Cross-row comparison is therefore
sound at the level of "0 versus some" and unsound at the level of exact counts.

**Not measured, and cannot be from this repository.** Automated tooling reaches a
minority of WCAG criteria. No screen-reader pass was run, on any pairing, with
any assistive technology. No human keyboard-only walkthrough was performed. No
cognitive-load or plain-language review. A pairing at 0 critical and 0 serious has
passed the automated subset and has not been accessibility tested in the sense
UNDRR's obligations mean. **Zero automated violations is a floor, not a
conformance claim**, and this repository cannot be cited as one.

## What this does not cover

Procurement and governance questions do not reduce to axes and are tracked
separately in the repository's issues: dependency telemetry, licence obligations
and the origin of a dependency are decisions for people, not measurements.
