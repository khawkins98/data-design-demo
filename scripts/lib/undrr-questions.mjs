/**
 * The six questions UNDRR asked and the answer this evaluation gives to each.
 * Shared by build-docs-index.mjs (landing page) and build-axes.mjs (evidence page).
 *
 * Answers quote hand-written figures that are NOT derived at build time.
 * After regenerating axis tables, verify these six lines still match.
 */

/**
 * @typedef {object} UndrrQuestion
 * @property {string} question   Short name, as UNDRR put it.
 * @property {string} asks       The question in one sentence.
 * @property {string} axis       Axis id that answers it: "A3" .. "A7".
 * @property {string} axisName   That axis's name, for link text.
 * @property {string} answer     The standing answer, in plain language.
 */

/** @type {readonly UndrrQuestion[]} */
export const UNDRR_QUESTIONS = [
  {
    question: "Repeatability",
    asks: "Can a second team reproduce the integration without inventing their own conventions?",
    axis: "A3",
    axisName: "New-product reproducibility",
    answer:
      "Measured packages now exist for the leading alternatives: MUI shares 86% once demo-only code is excluded, while the realistic React Aria records capability shares 618 source lines and 147 CSS lines across Delta and Mangrove.",
  },
  {
    question: "Standardisation",
    asks: "One shared component vocabulary across the estate, or one dialect per project?",
    axis: "A2",
    axisName: "Estate change amplification",
    answer:
      "The six-site scenario makes the architectural consequence explicit: Type C places shared policy in one governed foundation; Type A retains separate suite and Mangrove implementations; Type B can add a translation layer. These counts extrapolate measured propagation mechanisms and remain conditional on adopting the model.",
  },
  {
    question: "Mangrove integration",
    asks: "Can it live inside an existing Mangrove page without fighting it?",
    axis: "A4",
    axisName: "Mangrove compatibility",
    answer:
      "Leakage is clean for every pairing except mangrove-carbon, whose global stylesheet is not containable. Ant Design loses every cascade conflict to Mangrove - which the realistic layouts showed is not a matter of taste: Mangrove's rules also cover Select's own value, so its filters render blank on the Mangrove host.",
  },
  {
    question: "Design-token alignment",
    asks: "Can it be driven by UNDRR tokens, and does a token change propagate?",
    axis: "A5",
    axisName: "Theming fidelity and propagation",
    answer:
      "React Aria and Carbon retain browser-resolved token references. MUI, Mantine and Ant Design bake mapped values into their themes, so bundled theme changes require each consuming site to rebuild unless the token sheet is delivered centrally. Carbon leaves 21-22 of 71 evaluated tokens unreachable.",
  },
  {
    question: "Right-to-left",
    asks: "Does Arabic work in the components, not just the page?",
    axis: "A6",
    axisName: "Right-to-left",
    answer:
      "MUI works after its documented three-step RTL setup: dir, a direction-aware theme, and its first-party stylis plugin. The prototypes implement that setup in 29 integration lines with two dependencies and a provider; omission fails silently. React Aria and Ant Design work without that extra pipeline, while Mantine is clean after mitigation.",
  },
  {
    question: "Accessibility",
    asks: "Does it meet UNDRR's obligations in practice?",
    axis: "A7",
    axisName: "Automated accessibility signals",
    answer:
      "Zero is a floor, not a conformance claim: no screen-reader or human keyboard pass was run on any pairing. And the floor is lower than the kitchen sinks suggested - the realistic layouts found a critical unnamed-button defect in Mantine's Modal that every scoped axe run in this repository was blind to, because portalled overlays render outside the scanned subtree.",
  },
];

/**
 * The questions one axis answers. Empty for A1 and A2.
 * @param {string} axis
 * @returns {readonly UndrrQuestion[]}
 */
export function questionsForAxis(axis) {
  return UNDRR_QUESTIONS.filter((q) => q.axis === axis);
}

/**
 * Markdown blockquote lines: UNDRR question then answer, ready to push.
 * @param {string} axis
 * @returns {string[]}
 */
export function axisPreamble(axis) {
  const questions = questionsForAxis(axis);

  if (questions.length === 0) {
    return [
      `> **None of the six UNDRR questions maps to ${axis} directly.** It is measured because the weighted composite scores it, and because the questions were asked about living with a library rather than about building with one. See the [ranking](./scores.html) for what it is worth there.`,
      "",
    ];
  }

  const lines = [];
  for (const [index, q] of questions.entries()) {
    if (index > 0) lines.push(">");
    lines.push(`> **Answers: ${q.question}** - ${q.asks}`);
    lines.push(">");
    lines.push(`> ${q.answer}`);
  }
  lines.push("");
  return lines;
}
