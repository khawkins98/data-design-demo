# Weighted scores

GENERATED FILE - regenerate with `pnpm scores`.

**Reading order.** Start here for the recommendation. [decision-axes.md](./decision-axes.md)
defines what was measured. Each app's `EVIDENCE.md` has the raw findings.

## Decisions needed

1. **Human accessibility pass.** A7 bands rest on automated scanning only - no conformance claim without screen-reader and keyboard testing.
2. **MUI exclusion ruling.** Its Arabic defect has a fix this evaluation's rules forbid. Relaxing that rule returns MUI to contention.

## Recommendation

**Adopt Adobe React Aria.**

Composite 84 vs 69 for MUI (Community only); one of 2/5 candidates without warnings. Arabic works from a `dir` attribute alone. Stays inside its own subtree on both hosts.

**The cost.** React Aria ships behaviour, not appearance. Adopting it means UNDRR
owns the visual layer permanently. **Read this as "fund a design system", not "save work".**

See also [architecture-options.md](./architecture-options.md) for the staffing implications.

## Weights

A judgement, not a measurement.

- **Chosen by:** Proposed by the evaluation author, not yet ratified by UNDRR
- **Date:** 2026-08-06
- **Status:** **not ratified**
- **Basis:** Estate continuity framing (undrr-questions.md). Multi-site axes outweigh first-site effort; A6/A7 highest as standing obligations the composite cannot gate on.

A6 at 18 is the weight that removes MUI from contention; at 12 the ranking would change.

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

Composite is the weighted mean of the two hosts. **Warnings are listed beside the score, never folded into it.**

| # | Candidate | Composite | Library-owned warnings |
| --- | --- | --- | --- |
| 1 | Adobe React Aria | **84** / 100 | none |
| 2 | MUI (Community only) | **69** / 100 | none |
| 3 | Ant Design | **68** / 100 | **1** - see below |
| 4 | Mantine | **65** / 100 | **1** - see below |
| 5 | IBM Carbon | **46** / 100 | **3** - see below |

**2 of 5 candidates carry no warning at all:** Adobe React Aria, MUI (Community only).

**Adobe React Aria** ranks first on the composite and carries no warning, so it is the recommendation.

**MUI (Community only)** (69) also carries no warning - viable second choice without a waiver.

Ant Design and Mantine carry warnings that can be escaped in configuration or consuming code: see the escape-cost table below.

IBM Carbon cannot escape its warnings without a library change or a UNDRR policy decision.

## Warnings, in full

Warning = axis not satisfied as shipped, typically overcomable with extra maintenance work.

**A finding can appear twice** - once from `evidence.json`, once from the known-issues registry. Two records of one fact, kept separate to surface disagreements.

**Remediability is recorded but not scored.** It answers whether a candidate below the top can be brought up to it.

| Candidate | Warnings | Cheapest escape | Hardest escape |
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

## Glossary

| Term | Meaning |
| --- | --- |
| **strong** | Full weight. Axis fully satisfied. |
| **workable** | 60% weight. Satisfied with caveats or extra effort. |
| **weak** | 30% weight. Significant gaps. |
| **blocked** | 0% weight. Axis not satisfied at all. |
| canary | A host UI element watched for unintended style changes (leakage). |
| escape hatch | A workaround used when the library's documented approach failed. |
| composed | Requirement met by assembling multiple components (vs a single `native` one). |
| leakage | A candidate's styles bleeding onto host markup outside its own subtree. |
| portalled overlay | UI (dialogs, tooltips) rendered outside the component's DOM tree via `createPortal`. |

## Per pairing, per axis

Each cell carries the fact that assigned the band.

### `delta-react-aria` - composite 84 / 100

Worst open issue: **caveat** - React Aria is unstyled, so these pairings carry 155 to 213 CSS rules

8 open findings. 7 fixed in our code and excluded from score.

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

Worst open issue: **caveat** - React Aria is unstyled, so these pairings carry 155 to 213 CSS rules

10 open findings. 7 fixed in our code and excluded from score.

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

7 open findings. 7 fixed in our code and excluded from score.

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

8 open findings. 7 fixed in our code and excluded from score.

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

Worst open issue: **warning** - Carbon cannot express about 30% of the UNDRR design tokens

9 open findings. 7 fixed in our code and excluded from score.

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

Worst open issue: **warning** - Carbon cannot express about 30% of the UNDRR design tokens

11 open findings. 7 fixed in our code and excluded from score.

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

Worst open issue: **warning** - Modal's close button ships with no accessible name

9 open findings. 7 fixed in our code and excluded from score.

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

Worst open issue: **warning** - Modal's close button ships with no accessible name

9 open findings. 7 fixed in our code and excluded from score.

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

10 open findings. 4 fixed in our code and excluded from score.

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

Worst open issue: **warning** - Select controls do not display their selected value

13 open findings. 4 fixed in our code and excluded from score.

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

- Where a band and the axis prose disagree, the prose is the evidence.
- A7 bands rest on automated checks only - `strong` means the automated floor was cleared, not that the pairing is accessible.
- A6 measures layout direction, not whether Arabic reads well to an Arabic reader.
- Changing the weights changes the ranking. A two-point gap rests on the weights, not the evidence.

