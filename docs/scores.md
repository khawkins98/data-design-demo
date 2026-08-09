# Weighted scores

GENERATED FILE - regenerate with `pnpm scores`.

## Decisions needed

1. **Human accessibility pass.** A7 bands rest on automated scanning only - no conformance claim without screen-reader and keyboard testing.
2. **MUI fallback plan.** Put its documented RTL setup in the delivery standard.
3. **Operating-model commitment.** Fund and govern the Type C design-system family; otherwise React Aria becomes bespoke work per product.

## Recommendation

**Fund a bounded Type C pilot on Adobe React Aria.**

It leads provisionally at 97 and is one of 2/5 candidates without a scored blocker. It also passed the measured RTL and host-containment checks.

React Aria keeps visual authority with UNDRR and supports the Type C family described on the architecture page. The cost is permanent ownership of the visual component layer: **fund a design system, not save implementation work.**

See [architecture options](./architecture-options.html) for the operating-model trade-off, or [open the prototype matrix](./prototypes.html).

## Weights

A judgement, not a measurement.

- **Chosen by:** Proposed by the evaluation author, not yet ratified by UNDRR
- **Date:** 2026-08-06
- **Status:** **not ratified**
- **Basis:** Estate continuity framing (undrr-questions.md). Multi-site axes outweigh first-site effort; A6/A7 highest as standing obligations the composite cannot gate on.

The weights are proposed, not ratified. They order close alternatives but do not remove the separate adoption gates.

| Axis | Weight |
| --- | --- |
| A1 Implementation effort | 8 |
| A2 Estate change amplification | 16 |
| A3 New-product reproducibility | 16 |
| A4 Mangrove compatibility | 14 |
| A5 Visual control and theming fidelity | 14 |
| A6 Right-to-left | 18 |
| A7 Automated accessibility signals | 14 |

## Ranking

The provisional composite is the weighted mean of the two hosts. **Scored blockers are listed beside the score, never folded into it. Adoption gates are reported separately.**

| # | Candidate | Provisional composite | Scored library blockers |
| --- | --- | --- | --- |
| 1 | Adobe React Aria | **97** / 100 | none |
| 2 | MUI (Community only) | **81** / 100 | none |
| 3 | Ant Design | **77** / 100 | **1** - see below |
| 4 | Mantine | **69** / 100 | **1** - see below |
| 5 | IBM Carbon | **47** / 100 | **3** - see below |

**2 of 5 candidates carry no scored library blocker:** Adobe React Aria, MUI (Community only).

**Adobe React Aria** ranks first on the composite and carries no scored blocker. Its recommendation remains conditional on the adoption gates above.

**MUI (Community only)** (81) carries no scored blocker and is the preferred warning-free fallback, subject to the same human-review gates and a repeatable integration standard.

Ant Design and Mantine carry warnings that can be escaped in configuration or consuming code: see the escape-cost table below.

IBM Carbon cannot escape its warnings without a library change or a UNDRR policy decision.

## Scored blockers, in full

Scored blocker = axis not satisfied as shipped, typically overcomable with extra maintenance work. This list is narrower than the adoption gates and technical findings.

**A finding can appear twice** - once from `evidence.json`, once from the known-issues registry. Two records of one fact, kept separate to surface disagreements.

**Remediability is recorded but not scored.** It answers whether a candidate below the top can be brought up to it.

| Candidate | Scored blockers | Cheapest escape | Hardest escape |
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
- A4 Mangrove compatibility: the candidate restyled 54 computed properties on host markup outside its own subtree
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

### `delta-react-aria` - composite 97 / 100

Worst open issue: **caveat** - React Aria is unstyled, so these pairings carry 155 to 213 CSS rules

8 open findings. 7 fixed in our code and excluded from score.

| Axis | Band | Weight | Why |
| --- | --- | --- | --- |
| A1 Implementation effort | **workable** | 8 | 10 of 30 requirements needed composition or custom code; 1 audited off-route overrides |
| A2 Estate change amplification | strong | 16 | 1 authoritative change location at worst across 6 sites; 0 consumer source edits; measured mechanism, modelled at six sites |
| A3 New-product reproducibility | strong | 16 | the integration extracted into one shared package |
| A4 Mangrove compatibility | strong | 14 | no host canary changed when the candidate mounted |
| A5 Visual control and theming fidelity | strong | 14 | all 48 reachable tokens applied; visual authority across hosts: yes; 0 manual alias corrections |
| A6 Right-to-left | strong | 18 | Arabic worked from a dir attribute alone, at zero custom lines |
| A7 Automated accessibility signals | strong | 14 | no critical or serious automated violations; 1 checks axe declined to decide, each still owed a human |

### `mangrove-react-aria` - composite 97 / 100

Worst open issue: **caveat** - React Aria is unstyled, so these pairings carry 155 to 213 CSS rules

10 open findings. 7 fixed in our code and excluded from score.

| Axis | Band | Weight | Why |
| --- | --- | --- | --- |
| A1 Implementation effort | **workable** | 8 | 9 of 30 requirements needed composition or custom code; 2 audited off-route overrides |
| A2 Estate change amplification | strong | 16 | 1 authoritative change location at worst across 6 sites; 0 consumer source edits; measured mechanism, modelled at six sites |
| A3 New-product reproducibility | strong | 16 | the integration extracted into one shared package |
| A4 Mangrove compatibility | strong | 14 | no host canary changed when the candidate mounted |
| A5 Visual control and theming fidelity | strong | 14 | all 47 reachable tokens applied; visual authority across hosts: yes; 0 manual alias corrections |
| A6 Right-to-left | strong | 18 | Arabic worked from a dir attribute alone, at zero custom lines |
| A7 Automated accessibility signals | strong | 14 | no critical or serious automated violations; 1 checks axe declined to decide, each still owed a human |

### `delta-mui` - composite 81 / 100

Worst open issue: **caveat** - MUI needs a third setup step for RTL, and fails silently without it

7 open findings. 7 fixed in our code and excluded from score.

| Axis | Band | Weight | Why |
| --- | --- | --- | --- |
| A1 Implementation effort | strong | 8 | 4 of 30 requirements needed composition or custom code; 1 audited off-route overrides |
| A2 Estate change amplification | **workable** | 16 | 2 authoritative change locations at worst across 6 sites; 0 consumer source edits; measured package, modelled across two parallel stacks |
| A3 New-product reproducibility | strong | 16 | the integration extracted into one shared package |
| A4 Mangrove compatibility | strong | 14 | no host canary changed when the candidate mounted |
| A5 Visual control and theming fidelity | strong | 14 | all 29 reachable tokens applied; visual authority across hosts: yes; 0 manual alias corrections |
| A6 Right-to-left | **workable** | 18 | clean, but only after 29 custom lines and 0 recorded mitigations |
| A7 Automated accessibility signals | **workable** | 14 | 1 serious automated violations; 4 checks axe declined to decide, each still owed a human |

### `mangrove-mui` - composite 81 / 100

Worst open issue: **caveat** - MUI needs a third setup step for RTL, and fails silently without it

8 open findings. 7 fixed in our code and excluded from score.

| Axis | Band | Weight | Why |
| --- | --- | --- | --- |
| A1 Implementation effort | strong | 8 | 4 of 30 requirements needed composition or custom code; 1 audited off-route overrides |
| A2 Estate change amplification | **workable** | 16 | 2 authoritative change locations at worst across 6 sites; 0 consumer source edits; measured package, modelled across two parallel stacks |
| A3 New-product reproducibility | strong | 16 | the integration extracted into one shared package |
| A4 Mangrove compatibility | strong | 14 | no host canary changed when the candidate mounted |
| A5 Visual control and theming fidelity | strong | 14 | all 32 reachable tokens applied; visual authority across hosts: yes; 0 manual alias corrections |
| A6 Right-to-left | **workable** | 18 | clean, but only after 29 custom lines and 0 recorded mitigations |
| A7 Automated accessibility signals | **workable** | 14 | 1 serious automated violations; 4 checks axe declined to decide, each still owed a human |

### `delta-carbon` - composite 51 / 100

Worst open issue: **warning** - Carbon cannot express about 30% of the UNDRR design tokens

9 open findings. 7 fixed in our code and excluded from score.

| Axis | Band | Weight | Why |
| --- | --- | --- | --- |
| A1 Implementation effort | **workable** | 8 | 11 of 30 requirements needed composition or custom code; 5 audited off-route overrides |
| A2 Estate change amplification | **weak** | 16 | 3 authoritative change locations at worst across 6 sites; consumer source-edit fan-out is unmeasured; architecture model; translation path not measured |
| A3 New-product reproducibility | **workable** | 16 | extraction outcome recorded as unknown - confounded |
| A4 Mangrove compatibility | **workable** | 14 | clean only because the documented global stylesheet was not loaded as documented |
| A5 Visual control and theming fidelity | **weak** | 14 | 21 of 71 UNDRR tokens cannot be attached at all - a ceiling, not a cost |
| A6 Right-to-left | **workable** | 18 | clean, but only after 0 custom lines and 1 recorded mitigations |
| A7 Automated accessibility signals | **workable** | 14 | 2 serious automated violations; 2 checks axe declined to decide, each still owed a human |

### `mangrove-carbon` - composite 43 / 100

Worst open issue: **warning** - Carbon cannot express about 30% of the UNDRR design tokens

11 open findings. 7 fixed in our code and excluded from score.

| Axis | Band | Weight | Why |
| --- | --- | --- | --- |
| A1 Implementation effort | **workable** | 8 | 11 of 30 requirements needed composition or custom code; 4 audited off-route overrides |
| A2 Estate change amplification | **weak** | 16 | 3 authoritative change locations at worst across 6 sites; consumer source-edit fan-out is unmeasured; architecture model; translation path not measured |
| A3 New-product reproducibility | **workable** | 16 | extraction outcome recorded as unknown - confounded |
| A4 Mangrove compatibility | **blocked** | 14 | the candidate restyled 54 computed properties on host markup outside its own subtree |
| A5 Visual control and theming fidelity | **weak** | 14 | 22 of 72 UNDRR tokens cannot be attached at all - a ceiling, not a cost |
| A6 Right-to-left | **workable** | 18 | clean, but only after 6 custom lines and 2 recorded mitigations |
| A7 Automated accessibility signals | **workable** | 14 | 1 serious automated violations; 2 checks axe declined to decide, each still owed a human |

### `delta-mantine` - composite 67 / 100

Worst open issue: **warning** - Modal's close button ships with no accessible name

9 open findings. 7 fixed in our code and excluded from score.

| Axis | Band | Weight | Why |
| --- | --- | --- | --- |
| A1 Implementation effort | **workable** | 8 | 10 of 30 requirements needed composition or custom code; 4 audited off-route overrides |
| A2 Estate change amplification | **workable** | 16 | 2 authoritative change locations at worst across 6 sites; consumer source-edit fan-out is unmeasured; architecture model; package propagation not measured |
| A3 New-product reproducibility | **workable** | 16 | extraction outcome recorded as unknown - confounded |
| A4 Mangrove compatibility | strong | 14 | no host canary changed when the candidate mounted |
| A5 Visual control and theming fidelity | **weak** | 14 | 5 of 71 UNDRR tokens cannot be attached at all - a ceiling, not a cost |
| A6 Right-to-left | **workable** | 18 | clean, but only after 18 custom lines and 2 recorded mitigations |
| A7 Automated accessibility signals | strong | 14 | no critical or serious automated violations; 1 checks axe declined to decide, each still owed a human |

### `mangrove-mantine` - composite 71 / 100

Worst open issue: **warning** - Modal's close button ships with no accessible name

9 open findings. 7 fixed in our code and excluded from score.

| Axis | Band | Weight | Why |
| --- | --- | --- | --- |
| A1 Implementation effort | **workable** | 8 | 11 of 30 requirements needed composition or custom code; 4 audited off-route overrides |
| A2 Estate change amplification | **workable** | 16 | 2 authoritative change locations at worst across 6 sites; consumer source-edit fan-out is unmeasured; architecture model; package propagation not measured |
| A3 New-product reproducibility | **workable** | 16 | extraction outcome recorded as unknown - confounded |
| A4 Mangrove compatibility | strong | 14 | no host canary changed when the candidate mounted |
| A5 Visual control and theming fidelity | **workable** | 14 | all 62 reachable tokens applied; visual authority across hosts: partial; 3 manual alias corrections |
| A6 Right-to-left | **workable** | 18 | clean, but only after 10 custom lines and 0 recorded mitigations |
| A7 Automated accessibility signals | strong | 14 | no critical or serious automated violations; 0 checks axe declined to decide, each still owed a human |

### `delta-antd` - composite 77 / 100

Worst open issue: **caveat** - The data table has an upstream accessibility defect

10 open findings. 4 fixed in our code and excluded from score.

| Axis | Band | Weight | Why |
| --- | --- | --- | --- |
| A1 Implementation effort | strong | 8 | 2 of 30 requirements needed composition or custom code; 1 audited off-route overrides |
| A2 Estate change amplification | **workable** | 16 | 2 authoritative change locations at worst across 6 sites; 0 consumer source edits; measured package, modelled across two parallel stacks |
| A3 New-product reproducibility | strong | 16 | the integration extracted into one shared package |
| A4 Mangrove compatibility | **workable** | 14 | clean only because the documented global stylesheet was not loaded as documented |
| A5 Visual control and theming fidelity | **workable** | 14 | all 44 reachable tokens applied; visual authority across hosts: partial; 4 manual alias corrections |
| A6 Right-to-left | strong | 18 | Arabic worked from a dir attribute alone, at zero custom lines |
| A7 Automated accessibility signals | **workable** | 14 | 1 serious automated violations; 1 checks axe declined to decide, each still owed a human |

### `mangrove-antd` - composite 77 / 100

Worst open issue: **warning** - Select controls do not display their selected value

13 open findings. 4 fixed in our code and excluded from score.

| Axis | Band | Weight | Why |
| --- | --- | --- | --- |
| A1 Implementation effort | strong | 8 | 2 of 30 requirements needed composition or custom code; 1 audited off-route overrides |
| A2 Estate change amplification | **workable** | 16 | 2 authoritative change locations at worst across 6 sites; 0 consumer source edits; measured package, modelled across two parallel stacks |
| A3 New-product reproducibility | strong | 16 | the integration extracted into one shared package |
| A4 Mangrove compatibility | **workable** | 14 | clean only because the documented global stylesheet was not loaded as documented |
| A5 Visual control and theming fidelity | **workable** | 14 | all 44 reachable tokens applied; visual authority across hosts: partial; 4 manual alias corrections |
| A6 Right-to-left | strong | 18 | Arabic worked from a dir attribute alone, at zero custom lines |
| A7 Automated accessibility signals | **workable** | 14 | 1 serious automated violations; 1 checks axe declined to decide, each still owed a human |

## What this cannot tell you

- Where a band and the axis prose disagree, the prose is the evidence.
- A7 bands rest on automated checks only - `strong` means the automated floor was cleared, not that the pairing is accessible.
- A6 measures layout direction, not whether Arabic reads well to an Arabic reader.
- Changing the weights changes the ranking. A two-point gap rests on the weights, not the evidence.

