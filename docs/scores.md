# Weighted scores

GENERATED FILE - regenerate with `pnpm scores`. Axis definitions are in
[decision-axes.md](./decision-axes.md); the questions these serve are in
[undrr-questions.md](./undrr-questions.md).

Every value here is derived from `evidence.json`, the known-issues registry and
`extraction-results.json`. Nothing is typed by hand, and only defects owned by
the library or the pairing can affect a score - never a host defect, which is the
same for all five, and never one of ours.

## What this says to do

**Adopt Adobe React Aria.**

It leads on the composite at 84 against 69 for MUI (Community only), and it is the only candidate of 5 carrying no blocking defect. Arabic works from a `dir` attribute alone. It stays inside its own subtree on both hosts.

**The cost, which the composite does not charge it for.** React Aria ships behaviour,
not appearance. Adopting it means UNDRR builds and then owns the visual layer
permanently - this evaluation's own demo carries 121 to 133 hand-written CSS rules for
one page. Three of the seven axes reward exactly the property that creates that cost:
a library with no opinions cannot conflict with Mangrove, cannot bake in wrong colours
and cannot mistheme. **Read the recommendation as "adopt this and fund a design
system", not as "adopt this and save work".**

**Read this alongside the architecture it implies.**
A library that ships fewer components is also one whose gaps get filled in Mangrove
rather than per-site, which turns a missing stepper into shared tooling instead of
local work - and that is the strongest case for this recommendation, stronger than the
composite. It is also the case that carries the staffing bill. Both are set out in
[architecture-options.md](./architecture-options.md), which argues a position and
changes no score.

**Two things must happen before this is signed off, and neither is a technical task.**

1. A human accessibility pass. Every A7 band on this page rests on automated scanning.
   No screen-reader test and no human keyboard walkthrough was run on any candidate, so
   no conformance claim can be made from this evidence.
2. A decision on MUI's exclusion. Its Arabic defect has a fix that this evaluation's
   rules forbid. If UNDRR relaxes that rule, MUI returns to contention - which makes its
   position a procurement question rather than an engineering result.

## Weights

A judgement about what UNDRR values, not a measurement - so it is recorded as one.

- **Chosen by:** Proposed by the evaluation author, not yet ratified by UNDRR
- **Date:** 2026-08-06
- **Status:** **not ratified.** Nobody at UNDRR has agreed these numbers.
- **Basis:** Derived from the framing in undrr-questions.md: a continuity decision about an estate, so axes about living with a library across many sites outweigh the one about building the first site. A6 and A7 carry the most because they are standing obligations rather than preferences, and the composite model UNDRR chose cannot gate on them - weight is the only lever left.

This matters more than it looks. A6 at 18 is the weight that removes MUI from
contention; if it were 12 the ranking would change. Anyone defending this choice should
expect to defend the weights first, and should be able to say who set them.

| Axis | Weight |
| --- | --- |
| A1 Implementation effort | 8 |
| A2 Maintainability at scale | 16 |
| A3 Reproducibility across sites | 16 |
| A4 Mangrove compatibility | 14 |
| A5 Theming fidelity | 14 |
| A6 Right-to-left | 18 |
| A7 Accessibility conformance | 14 |

## Ranking

Composite is the weighted mean of the two hosts. **Blockers are listed beside the
score and never folded into it**: a weighted composite can otherwise let a good
bundle size offset an unfixable defect, so the number ranks and is not permitted
to hide anything.

| # | Candidate | Composite | Library-owned blockers |
| --- | --- | --- | --- |
| 1 | Adobe React Aria | **84** / 100 | none |
| 2 | MUI (Community only) | **69** / 100 | none |
| 3 | Ant Design | **68** / 100 | **1** - see below |
| 4 | Mantine | **65** / 100 | **1** - see below |
| 5 | IBM Carbon | **46** / 100 | **3** - see below |

**2 of 5 candidates carry no blocker at all:** Adobe React Aria, MUI (Community only).

**Adobe React Aria** ranks first on the composite and carries no blocker, so it is the recommendation.

**MUI (Community only)** (69) also carries no blocker, which makes it a viable second choice on this evidence rather than a fallback requiring a waiver.

Ant Design and Mantine carry blockers that can be escaped in configuration or consuming code: see the escape-cost table below.

IBM Carbon cannot escape its blockers without a change in the library or a decision that is UNDRR's rather than an engineer's.

## Blockers, in full

A blocked axis is not a low score. It is a statement that the axis is not satisfied
at all, by the library rather than by our code.

Two things to know before reading these as a ranking of severity.

**A finding can appear twice** - once as an axis verdict derived from
`evidence.json`, once as its known-issues entry. Those are two records of one
fact from two sources, deliberately not merged, because silently collapsing them
would hide a disagreement if the two sources ever stopped matching.

**Remediability is recorded but not scored.** Each blocker carries how it could be
escaped, taken from the registry rather than inferred. It is kept out of the
composite on purpose: it describes the cost of living with a defect, not the axis
the defect sits on, so averaging it in would double-count severity and blur both.
It is here to answer one question the composite cannot - whether a candidate below
the top of the ranking can be brought up to it.

| Candidate | Blockers | Cheapest escape | Hardest escape |
| --- | --- | --- | --- |
| Ant Design | 1 | reversible per site by changing a setting | reversible per site by changing a setting |
| Mantine | 1 | fixable in consuming code, repeated per site | fixable in consuming code, repeated per site |
| IBM Carbon | 3 | needs a change in the library | cannot be escaped while using the library as documented |

**Ant Design**

- antd-select-value-hidden-on-mangrove: Select controls do not display their selected value (owned by pairing) [escape: reversible per site by changing a setting]

**Mantine**

- mantine-modal-close-unnamed: Modal's close button ships with no accessible name (owned by candidate) [escape: fixable in consuming code, repeated per site]

**IBM Carbon**

- carbon-unreachable-tokens: Carbon cannot express about 30% of the UNDRR design tokens (owned by candidate) [escape: needs a change in the library]
- A4 Mangrove compatibility: the candidate restyled 19 computed properties on host markup outside its own subtree
- carbon-leakage-failure: This pairing fails the style-containment assertion (owned by pairing) [escape: cannot be escaped while using the library as documented]

## Per pairing, per axis

Each cell carries the fact that assigned the band. `strong` scores full weight,
`workable` 60%, `weak` 30%, `blocked` nothing.

### `delta-react-aria` - composite 84 / 100

Worst open issue: **caveat** - React Aria is unstyled, so this page carries 121 to 133 CSS rules

7 open findings. 6 defects were found in our own demo code and fixed; they are recorded in the registry and excluded from this score.

| Axis | Band | Weight | Why |
| --- | --- | --- | --- |
| A1 Implementation effort | **workable** | 8 | 10 of 30 requirements needed more than a documented component; 5 documented approaches failed and needed working around |
| A2 Maintainability at scale | **workable** | 16 | 5 escape hatches off the documented theming route; 0 scoreable maintenance findings |
| A3 Reproducibility across sites | **workable** | 16 | extraction outcome recorded as analysed |
| A4 Mangrove compatibility | strong | 14 | no host canary changed when the candidate mounted |
| A5 Theming fidelity | strong | 14 | all 48 reachable tokens applied |
| A6 Right-to-left | strong | 18 | Arabic worked from a dir attribute alone, at zero custom lines |
| A7 Accessibility conformance | strong | 14 | no critical or serious automated violations; 1 checks axe declined to decide, each still owed a human |

### `mangrove-react-aria` - composite 84 / 100

Worst open issue: **caveat** - React Aria is unstyled, so this page carries 121 to 133 CSS rules

9 open findings. 6 defects were found in our own demo code and fixed; they are recorded in the registry and excluded from this score.

| Axis | Band | Weight | Why |
| --- | --- | --- | --- |
| A1 Implementation effort | **workable** | 8 | 9 of 30 requirements needed more than a documented component; 3 documented approaches failed and needed working around |
| A2 Maintainability at scale | **workable** | 16 | 3 escape hatches off the documented theming route; 0 scoreable maintenance findings |
| A3 Reproducibility across sites | **workable** | 16 | extraction outcome recorded as analysed |
| A4 Mangrove compatibility | strong | 14 | no host canary changed when the candidate mounted |
| A5 Theming fidelity | strong | 14 | all 47 reachable tokens applied |
| A6 Right-to-left | strong | 18 | Arabic worked from a dir attribute alone, at zero custom lines |
| A7 Accessibility conformance | strong | 14 | no critical or serious automated violations; 1 checks axe declined to decide, each still owed a human |

### `delta-mui` - composite 71 / 100

Worst open issue: **caveat** - MUI needs a third setup step for RTL, and fails silently without it

6 open findings. 7 defects were found in our own demo code and fixed; they are recorded in the registry and excluded from this score.

| Axis | Band | Weight | Why |
| --- | --- | --- | --- |
| A1 Implementation effort | **workable** | 8 | 4 of 30 requirements needed more than a documented component; 5 documented approaches failed and needed working around |
| A2 Maintainability at scale | **workable** | 16 | 5 escape hatches off the documented theming route; 0 scoreable maintenance findings |
| A3 Reproducibility across sites | **workable** | 16 | extraction outcome recorded as measured |
| A4 Mangrove compatibility | strong | 14 | no host canary changed when the candidate mounted |
| A5 Theming fidelity | strong | 14 | all 29 reachable tokens applied |
| A6 Right-to-left | **workable** | 18 | clean, but only after 29 custom lines and 0 recorded mitigations |
| A7 Accessibility conformance | **workable** | 14 | 1 serious automated violations; 4 checks axe declined to decide, each still owed a human |

### `mangrove-mui` - composite 66 / 100

Worst open issue: **caveat** - MUI needs a third setup step for RTL, and fails silently without it

7 open findings. 7 defects were found in our own demo code and fixed; they are recorded in the registry and excluded from this score.

| Axis | Band | Weight | Why |
| --- | --- | --- | --- |
| A1 Implementation effort | **workable** | 8 | 4 of 30 requirements needed more than a documented component; 7 documented approaches failed and needed working around |
| A2 Maintainability at scale | **weak** | 16 | 7 escape hatches off the documented theming route; 0 scoreable maintenance findings |
| A3 Reproducibility across sites | **workable** | 16 | extraction outcome recorded as measured |
| A4 Mangrove compatibility | strong | 14 | no host canary changed when the candidate mounted |
| A5 Theming fidelity | strong | 14 | all 32 reachable tokens applied |
| A6 Right-to-left | **workable** | 18 | clean, but only after 29 custom lines and 0 recorded mitigations |
| A7 Accessibility conformance | **workable** | 14 | 1 serious automated violations; 4 checks axe declined to decide, each still owed a human |

### `delta-carbon` - composite 49 / 100

Worst open issue: **blocker** - Carbon cannot express about 30% of the UNDRR design tokens

8 open findings. 7 defects were found in our own demo code and fixed; they are recorded in the registry and excluded from this score.

| Axis | Band | Weight | Why |
| --- | --- | --- | --- |
| A1 Implementation effort | **weak** | 8 | 11 of 30 requirements needed more than a documented component; 14 documented approaches failed and needed working around |
| A2 Maintainability at scale | **weak** | 16 | 14 escape hatches off the documented theming route; 0 scoreable maintenance findings |
| A3 Reproducibility across sites | **workable** | 16 | extraction outcome recorded as analysed |
| A4 Mangrove compatibility | **workable** | 14 | clean only because the documented global stylesheet was not loaded as documented |
| A5 Theming fidelity | **weak** | 14 | 21 of 71 UNDRR tokens cannot be attached at all - a ceiling, not a cost |
| A6 Right-to-left | **workable** | 18 | clean, but only after 0 custom lines and 1 recorded mitigations |
| A7 Accessibility conformance | **workable** | 14 | 2 serious automated violations; 2 checks axe declined to decide, each still owed a human |

### `mangrove-carbon` - composite 43 / 100

Worst open issue: **blocker** - Carbon cannot express about 30% of the UNDRR design tokens

10 open findings. 7 defects were found in our own demo code and fixed; they are recorded in the registry and excluded from this score.

| Axis | Band | Weight | Why |
| --- | --- | --- | --- |
| A1 Implementation effort | **workable** | 8 | 11 of 30 requirements needed more than a documented component; 8 documented approaches failed and needed working around |
| A2 Maintainability at scale | **weak** | 16 | 8 escape hatches off the documented theming route; 0 scoreable maintenance findings |
| A3 Reproducibility across sites | **workable** | 16 | extraction outcome recorded as analysed |
| A4 Mangrove compatibility | **blocked** | 14 | the candidate restyled 19 computed properties on host markup outside its own subtree |
| A5 Theming fidelity | **weak** | 14 | 22 of 72 UNDRR tokens cannot be attached at all - a ceiling, not a cost |
| A6 Right-to-left | **workable** | 18 | clean, but only after 6 custom lines and 2 recorded mitigations |
| A7 Accessibility conformance | **workable** | 14 | 1 serious automated violations; 2 checks axe declined to decide, each still owed a human |

### `delta-mantine` - composite 60 / 100

Worst open issue: **blocker** - Modal's close button ships with no accessible name

6 open findings. 7 defects were found in our own demo code and fixed; they are recorded in the registry and excluded from this score.

| Axis | Band | Weight | Why |
| --- | --- | --- | --- |
| A1 Implementation effort | **weak** | 8 | 10 of 30 requirements needed more than a documented component; 11 documented approaches failed and needed working around |
| A2 Maintainability at scale | **weak** | 16 | 11 escape hatches off the documented theming route; 0 scoreable maintenance findings |
| A3 Reproducibility across sites | **workable** | 16 | extraction outcome recorded as analysed |
| A4 Mangrove compatibility | strong | 14 | no host canary changed when the candidate mounted |
| A5 Theming fidelity | **weak** | 14 | 5 of 71 UNDRR tokens cannot be attached at all - a ceiling, not a cost |
| A6 Right-to-left | **workable** | 18 | clean, but only after 18 custom lines and 2 recorded mitigations |
| A7 Accessibility conformance | strong | 14 | no critical or serious automated violations; 1 checks axe declined to decide, each still owed a human |

### `mangrove-mantine` - composite 70 / 100

Worst open issue: **blocker** - Modal's close button ships with no accessible name

7 open findings. 7 defects were found in our own demo code and fixed; they are recorded in the registry and excluded from this score.

| Axis | Band | Weight | Why |
| --- | --- | --- | --- |
| A1 Implementation effort | **weak** | 8 | 11 of 30 requirements needed more than a documented component; 9 documented approaches failed and needed working around |
| A2 Maintainability at scale | **weak** | 16 | 9 escape hatches off the documented theming route; 0 scoreable maintenance findings |
| A3 Reproducibility across sites | **workable** | 16 | extraction outcome recorded as analysed |
| A4 Mangrove compatibility | strong | 14 | no host canary changed when the candidate mounted |
| A5 Theming fidelity | strong | 14 | all 62 reachable tokens applied |
| A6 Right-to-left | **workable** | 18 | clean, but only after 10 custom lines and 0 recorded mitigations |
| A7 Accessibility conformance | strong | 14 | no critical or serious automated violations; 0 checks axe declined to decide, each still owed a human |

### `delta-antd` - composite 68 / 100

Worst open issue: **caveat** - The data table has an upstream accessibility defect

8 open findings. 4 defects were found in our own demo code and fixed; they are recorded in the registry and excluded from this score.

| Axis | Band | Weight | Why |
| --- | --- | --- | --- |
| A1 Implementation effort | **workable** | 8 | 2 of 30 requirements needed more than a documented component; 7 documented approaches failed and needed working around |
| A2 Maintainability at scale | **weak** | 16 | 7 escape hatches off the documented theming route; 0 scoreable maintenance findings |
| A3 Reproducibility across sites | **workable** | 16 | extraction outcome recorded as measured |
| A4 Mangrove compatibility | **workable** | 14 | clean only because the documented global stylesheet was not loaded as documented |
| A5 Theming fidelity | strong | 14 | all 44 reachable tokens applied |
| A6 Right-to-left | strong | 18 | Arabic worked from a dir attribute alone, at zero custom lines |
| A7 Accessibility conformance | **workable** | 14 | 1 serious automated violations; 1 checks axe declined to decide, each still owed a human |

### `mangrove-antd` - composite 68 / 100

Worst open issue: **blocker** - Select controls do not display their selected value

11 open findings. 4 defects were found in our own demo code and fixed; they are recorded in the registry and excluded from this score.

| Axis | Band | Weight | Why |
| --- | --- | --- | --- |
| A1 Implementation effort | **workable** | 8 | 2 of 30 requirements needed more than a documented component; 7 documented approaches failed and needed working around |
| A2 Maintainability at scale | **weak** | 16 | 7 escape hatches off the documented theming route; 0 scoreable maintenance findings |
| A3 Reproducibility across sites | **workable** | 16 | extraction outcome recorded as measured |
| A4 Mangrove compatibility | **workable** | 14 | clean only because the documented global stylesheet was not loaded as documented |
| A5 Theming fidelity | strong | 14 | all 44 reachable tokens applied |
| A6 Right-to-left | strong | 18 | Arabic worked from a dir attribute alone, at zero custom lines |
| A7 Accessibility conformance | **workable** | 14 | 1 serious automated violations; 1 checks axe declined to decide, each still owed a human |

## What this cannot tell you

- A composite is a summary of the diagnostics, not a replacement for them. Where a
  band and the axis prose disagree, the prose is the evidence.
- Accessibility bands rest on automated checks only. No screen-reader pass and no
  human keyboard walkthrough was run on any pairing, so `strong` on A7 means the
  automated floor was cleared, not that the pairing is accessible.
- A6 measures layout direction and mirroring, not whether Arabic reads well to an
  Arabic reader.
- Changing the weights changes the ranking. If a decision rests on a two-point gap,
  it rests on the weights and not on the evidence.

