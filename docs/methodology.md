# Methodology

This evaluation answers two related questions at the same time:

1. **Can each candidate meet the practical needs of DELTA and Mangrove?**
2. **What kind of design-system architecture would adopting it create across UNDRR?**

Normally, an organisation would first agree the target architecture and operating
model, then evaluate technologies within that choice. UNDRR has not yet made
that first decision. The exercise therefore uses working prototypes both to test
the candidates and to make the consequences of Types A, B and C concrete enough
for a business decision.

## How to read the evidence

| Part | What it answers | Status |
| --- | --- | --- |
| Requirement audit and prototypes | Can the candidate implement the evaluated experiences in both hosts? | Measured in this exercise |
| Evidence axes | What effort, compatibility, theming, RTL and automated accessibility signals did the implementations expose? | Measured or explicitly qualified |
| Architecture options | Where would components, tokens, ownership and change propagation sit across the estate? | Proposed operating models informed by the prototypes |
| Ranking | How do the candidates compare under the evaluation author's current priorities? | Provisional; weights are not yet ratified by UNDRR |
| Adoption gates | What must be validated before a final commitment? | Outstanding decision and pilot work |

The ranking is therefore decision support, not the decision itself. In
particular, Type C includes the cost and value of creating a governed UNDRR
asset, while Types A and B accept more component structure from an upstream
system. A single score cannot fully express that distinction.

The central architectural hypothesis is about **when cost is paid**. Types A
and B can reduce initial coordination—most clearly in Type A—but parallel stacks
accumulate translation, synchronisation and upgrade cost as the estate grows.
Type C needs more shared investment and coordination now, with the expectation
that governed reuse will reduce marginal cost and make organisation-wide change
easier later. The prototypes demonstrate mechanisms behind this hypothesis;
they do not constitute a multi-year cost forecast. A2 makes the hypothesis
testable through a six-site change-amplification scenario, while keeping source
edits, rebuilds and validation boundaries separate.

Accessibility and Arabic are also gates rather than compensating features. Good
results elsewhere cannot offset a failed human accessibility review or an
unacceptable RTL implementation.

## A more formal sequence

Once UNDRR is ready to settle the operating model, established practice would
separate the work into four stages:

1. **Choose the architecture.** Agree the business drivers and test Types A, B
   and C against change scenarios such as a Mangrove upgrade, a central token
   change, second-product reuse, or a shared accessibility defect.
2. **Evaluate technical fit within that model.** Use the requirement audit and
   realistic prototypes to confirm that the enabling technology can do the job.
3. **Evaluate ownership and lifecycle economics.** Compare funded capacity,
   upgrade and propagation costs, contribution governance, dependency risk and
   the cost of changing direction.
4. **Run a bounded validation pilot.** Demonstrate reuse in a second product,
   a controlled cross-estate change, an upstream upgrade, and human accessibility
   and Arabic validation.

This would turn the present conditional recommendation into two explicit
decisions: the preferred UNDRR operating architecture, followed by the best
technology foundation for that architecture.

## Reference models

- [Architecture Tradeoff Analysis Method (CMU SEI)](https://www.sei.cmu.edu/library/architecture-tradeoff-analysis-method-collection/) connects business drivers to prioritised scenarios, architectural risks and trade-off points.
- [ISO/IEC/IEEE 42010:2022](https://www.iso.org/standard/74393.html) provides a standard structure for describing architectures through stakeholder concerns, viewpoints and models, including product families and product lines.
- [ISO/IEC 25010:2023](https://www.iso.org/standard/78176.html) provides a reference model for specifying and evaluating software product quality.
- [Software Product Lines (CMU SEI)](https://www.sei.cmu.edu/library/software-product-lines-curriculum/) treats related products as a managed family built from shared core assets in a prescribed way.
- [Cost Benefit Analysis Method (CMU SEI)](https://www.sei.cmu.edu/library/cost-benefit-analysis-method-cbam/) adds costs, benefits, risk and uncertainty to architectural choices.
- [GOV.UK Design System contribution criteria](https://design-system.service.gov.uk/community/contribution-criteria/) illustrate the ownership, evidence, accessibility and cross-service reuse expected of a governed public-sector design system.

These references are guides rather than a claim that this exercise performed a
formal ATAM, ISO assessment or cost-benefit analysis.
