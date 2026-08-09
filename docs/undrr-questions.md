# The six UNDRR questions, and where each is answered

This repository exists to answer a question larger than DELTA's component needs.
Whatever is selected becomes the default front-end foundation for DELTA, for
Mangrove-based properties, and for data systems not yet built. It replaces
PrimeReact, which DELTA runs today.

So the test is not *does it cover DELTA's components* - the requirement matrix
already answers yes for all five candidates, across all 300 pairing-assessments, with
zero `unsupported` - but *can one library carry the whole estate*. That reframing
produces six questions. This page points each at the axis that answers it and the
file that holds the evidence, so a reader arriving from the evaluation annex lands
on an answer rather than on a matrix.

| Question | Axis | Evidence |
| --- | --- | --- |
| **Repeatability** - can a second team reproduce the integration without inventing their own conventions? | [A3 New-product reproducibility](./decision-axes.md#a3---new-product-reproducibility) | `extraction-results.json`, `packages/integration-*` |
| **Standardisation** - one shared component vocabulary across the estate, or one dialect per project? | [A2 Estate change amplification](./decision-axes.md#a2---estate-change-amplification), with [A3](./decision-axes.md#a3---new-product-reproducibility) | `change-amplification.json`, `extraction-results.json` |
| **Mangrove integration** - can it live inside an existing Mangrove page without fighting it? | [A4 Mangrove compatibility](./decision-axes.md#a4---mangrove-compatibility) | `leakage.*` in each `evidence.json`, `axes.md` |
| **Design-token alignment** - can it be driven by UNDRR tokens, and does a token change propagate? | [A5 Theming fidelity and propagation](./decision-axes.md#a5---theming-fidelity-and-propagation) | `theming.*` in each `evidence.json`, `packages/undrr-tokens` |
| **Right-to-left** - does Arabic work in the components, not just the page? | [A6 Right-to-left](./decision-axes.md#a6---right-to-left) | `rtl.*` in each `evidence.json`, `axes.md` |
| **Accessibility** - does it meet UNDRR's obligations in practice? | [A7 Automated accessibility signals](./decision-axes.md#a7---automated-accessibility-signals) | `axe.*` in each `evidence.json`, `axes.md` |

## What the answers do not settle

Three limits are worth stating here rather than leaving to be discovered.

**Two of the six were promoted late.** RTL and accessibility were requirement
rows and matrix cells before they were axes. MUI's initially broken Arabic
floating labels were caused by an incomplete setup; both prototypes now pass
after implementing MUI's documented three-step RTL route. They remain axes
because silent failure and human accessibility validation matter to adoption.

**Accessibility is measured only to the automated floor.** No screen-reader pass,
no human keyboard walkthrough, no plain-language review, on any pairing. A row of
zeroes in A7 means the automated subset passed. It is not a conformance claim and
must not be cited as one.

**Realistic layouts now supplement the component inventories.** Every candidate
has been exercised inside a full DELTA screen and a Mangrove island. These prove
important integration behavior, but they remain prototypes rather than a human
accessibility pass or production operating model.

## What is out of scope here

Procurement and governance - dependency telemetry, licence obligations, the
origin of a dependency - do not reduce to axes and are decisions for people. See
issue #8. Mangrove findings that fell out of building this are in issue #4.
