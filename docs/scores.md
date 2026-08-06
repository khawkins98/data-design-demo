# Weighted scores

GENERATED FILE - regenerate with `pnpm scores`. Axis definitions are in
[decision-axes.md](./decision-axes.md); the questions these serve are in
[undrr-questions.md](./undrr-questions.md).

Every value here is derived from `evidence.json`, the known-issues registry and
`extraction-results.json`. Nothing is typed by hand, and only defects owned by
the library or the pairing can affect a score - never a host defect, which is the
same for all five, and never one of ours.

## Weights

A judgement about what UNDRR values, not a measurement. Change them in
`scripts/build-scores.mjs` and regenerate; the ranking below will move.

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
| 2 | Ant Design | **68** / 100 | **1** - see below |
| 3 | Mantine | **65** / 100 | **1** - see below |
| 4 | MUI (Community only) | **58** / 100 | **2** - see below |
| 5 | IBM Carbon | **46** / 100 | **3** - see below |

**1 of 5 candidates carry no blocker at all:** Adobe React Aria.

That is narrower than a useful shortlist, so read it with the next two rows of the
ranking rather than instead of them. The candidates immediately below carry one
blocker each, and whether those blockers disqualify a candidate or merely cost
something is a decision for UNDRR - it turns on remediability, which this file
deliberately does not score. See the note under Blockers.

## Blockers, in full

A blocked axis is not a low score. It is a statement that the axis is not satisfied
at all, by the library rather than by our code.

Two things to know before reading these as a ranking of severity.

**A finding can appear twice** - once as an axis verdict derived from
`evidence.json`, once as its known-issues entry. Those are two records of one
fact from two sources, deliberately not merged, because silently collapsing them
would hide a disagreement if the two sources ever stopped matching.

**Remediability is not scored, and it differs sharply.** Ant Design's is
reversible per site by dropping one setting. Mantine's is fixable per site with a
prop, once the fixtures carry a suitable string. MUI's cannot be fixed inside this
evaluation's constraints at all. Carbon's is inherent to loading its documented
global stylesheet. Those are four very different propositions and this file cannot
tell them apart, because the registry records remediability in prose rather than in
a field. Read the linked entries before treating one blocker as equivalent to
another - and if this distinction is going to carry weight in the decision, the
registry needs a structured field for it rather than a reader's inference.

**Ant Design**

- antd-select-value-hidden-on-mangrove: Select controls do not display their selected value (owned by pairing)

**Mantine**

- mantine-modal-close-unnamed: Modal's close button ships with no accessible name (owned by candidate)

**MUI (Community only)**

- A6 Right-to-left: Arabic is not correct as shipped: 2 recorded defects, unresolved
- mui-rtl-unfixable: RTL is not achievable in the MUI Community tier (owned by candidate)

**IBM Carbon**

- carbon-unreachable-tokens: Carbon cannot express about 30% of the UNDRR design tokens (owned by candidate)
- A4 Mangrove compatibility: the candidate restyled 19 computed properties on host markup outside its own subtree
- carbon-leakage-failure: This pairing fails the style-containment assertion (owned by pairing)

## Per pairing, per axis

Each cell carries the fact that assigned the band. `strong` scores full weight,
`workable` 60%, `weak` 30%, `blocked` nothing.

### `delta-react-aria` - composite 84 / 100

Worst open issue: **caveat** - React Aria is unstyled, so this page carries 121 to 133 CSS rules

4 open findings. 6 defects were found in our own demo code and fixed; they are recorded in the registry and excluded from this score.

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

8 open findings. 6 defects were found in our own demo code and fixed; they are recorded in the registry and excluded from this score.

| Axis | Band | Weight | Why |
| --- | --- | --- | --- |
| A1 Implementation effort | **workable** | 8 | 9 of 30 requirements needed more than a documented component; 3 documented approaches failed and needed working around |
| A2 Maintainability at scale | **workable** | 16 | 3 escape hatches off the documented theming route; 0 scoreable maintenance findings |
| A3 Reproducibility across sites | **workable** | 16 | extraction outcome recorded as analysed |
| A4 Mangrove compatibility | strong | 14 | no host canary changed when the candidate mounted |
| A5 Theming fidelity | strong | 14 | all 47 reachable tokens applied |
| A6 Right-to-left | strong | 18 | Arabic worked from a dir attribute alone, at zero custom lines |
| A7 Accessibility conformance | strong | 14 | no critical or serious automated violations; 1 checks axe declined to decide, each still owed a human |

### `delta-mui` - composite 60 / 100

Worst open issue: **blocker** - RTL is not achievable in the MUI Community tier

3 open findings. 5 defects were found in our own demo code and fixed; they are recorded in the registry and excluded from this score.

| Axis | Band | Weight | Why |
| --- | --- | --- | --- |
| A1 Implementation effort | **workable** | 8 | 4 of 30 requirements needed more than a documented component; 5 documented approaches failed and needed working around |
| A2 Maintainability at scale | **workable** | 16 | 5 escape hatches off the documented theming route; 0 scoreable maintenance findings |
| A3 Reproducibility across sites | **workable** | 16 | extraction outcome recorded as measured |
| A4 Mangrove compatibility | strong | 14 | no host canary changed when the candidate mounted |
| A5 Theming fidelity | strong | 14 | all 29 reachable tokens applied |
| A6 Right-to-left | **blocked** | 18 | Arabic is not correct as shipped: 2 recorded defects, unresolved |
| A7 Accessibility conformance | **workable** | 14 | 1 serious automated violations; 4 checks axe declined to decide, each still owed a human |

### `mangrove-mui` - composite 56 / 100

Worst open issue: **blocker** - RTL is not achievable in the MUI Community tier

5 open findings. 5 defects were found in our own demo code and fixed; they are recorded in the registry and excluded from this score.

| Axis | Band | Weight | Why |
| --- | --- | --- | --- |
| A1 Implementation effort | **workable** | 8 | 4 of 30 requirements needed more than a documented component; 7 documented approaches failed and needed working around |
| A2 Maintainability at scale | **weak** | 16 | 7 escape hatches off the documented theming route; 0 scoreable maintenance findings |
| A3 Reproducibility across sites | **workable** | 16 | extraction outcome recorded as measured |
| A4 Mangrove compatibility | strong | 14 | no host canary changed when the candidate mounted |
| A5 Theming fidelity | strong | 14 | all 32 reachable tokens applied |
| A6 Right-to-left | **blocked** | 18 | Arabic is not correct as shipped: 1 recorded defect, unresolved |
| A7 Accessibility conformance | **workable** | 14 | 1 serious automated violations; 4 checks axe declined to decide, each still owed a human |

### `delta-carbon` - composite 49 / 100

Worst open issue: **blocker** - Carbon cannot express about 30% of the UNDRR design tokens

5 open findings. 7 defects were found in our own demo code and fixed; they are recorded in the registry and excluded from this score.

| Axis | Band | Weight | Why |
| --- | --- | --- | --- |
| A1 Implementation effort | **weak** | 8 | 11 of 30 requirements needed more than a documented component; 12 documented approaches failed and needed working around |
| A2 Maintainability at scale | **weak** | 16 | 12 escape hatches off the documented theming route; 0 scoreable maintenance findings |
| A3 Reproducibility across sites | **workable** | 16 | extraction outcome recorded as analysed |
| A4 Mangrove compatibility | **workable** | 14 | clean only because the documented global stylesheet was not loaded as documented |
| A5 Theming fidelity | **weak** | 14 | 21 of 71 UNDRR tokens cannot be attached at all - a ceiling, not a cost |
| A6 Right-to-left | **workable** | 18 | clean, but only after 0 custom lines and 1 recorded mitigations |
| A7 Accessibility conformance | **workable** | 14 | 2 serious automated violations; 2 checks axe declined to decide, each still owed a human |

### `mangrove-carbon` - composite 43 / 100

Worst open issue: **blocker** - Carbon cannot express about 30% of the UNDRR design tokens

8 open findings. 7 defects were found in our own demo code and fixed; they are recorded in the registry and excluded from this score.

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

4 open findings. 7 defects were found in our own demo code and fixed; they are recorded in the registry and excluded from this score.

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

6 open findings. 7 defects were found in our own demo code and fixed; they are recorded in the registry and excluded from this score.

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

5 open findings. 4 defects were found in our own demo code and fixed; they are recorded in the registry and excluded from this score.

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

9 open findings. 4 defects were found in our own demo code and fixed; they are recorded in the registry and excluded from this score.

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

