/**
 * The six questions UNDRR asked, and the answer this evaluation gives to each.
 *
 * ONE SOURCE, TWO PAGES, ON PURPOSE. These answers began life inside
 * build-docs-index.mjs, so the landing page carried them and the evidence page did
 * not. A reader clicking "A6 Right-to-left" from a plain-language answer landed in
 * axes.html on a table headed `beyond native | traps | wrappers` with no mention of
 * the question they had just been reading. That is what a project manager clicking
 * through these pages reported as unreadable, and it was not a writing problem: the
 * plain-language layer existed, it was just on the wrong page.
 *
 * Both pages now generate from here. The alternative considered was repointing the
 * six links at scores.html, which does open in the right register - "What this says
 * to do" - but is organised BY PAIRING, so there is no per-axis section to land on
 * and all six questions would have arrived at the same page top, losing the one
 * useful thing the links do: say which axis answers which question.
 *
 * WHAT AN `answer` IS. The standing conclusion, in the register a non-engineer
 * reads: what was found, what it costs, what decision it forces. One line each -
 * anything longer belongs in the axis, and anything that cannot be said in one line
 * is not yet a finding.
 *
 * A KNOWN RISK, RECORDED RATHER THAN QUIETLY FIXED. Four of these six answers quote
 * figures - "86% of the integration shares", "21-22 of 71 tokens" - which are NOT
 * derived at build time. They are hand-written, so a rerun that moves them leaves
 * them stale, and every stale claim this repository has produced was exactly that: a
 * number written into prose and left behind by the thing it described. They are kept
 * verbatim because they carry the specificity that makes the answers useful, and
 * because rewriting them to be vaguer would be a real loss dressed up as a fix.
 * Anyone regenerating the axis tables should reread these six lines.
 *
 * Consumed by scripts/build-docs-index.mjs and scripts/build-axes.mjs.
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
    axisName: "Reproducibility across sites",
    answer:
      "Measured by extraction for MUI: 86% of the integration shares across sites. React Aria's is fully portable but has no package to hold it, so it is shared by duplication.",
  },
  {
    question: "Standardisation",
    asks: "One shared component vocabulary across the estate, or one dialect per project?",
    axis: "A3",
    axisName: "Reproducibility across sites",
    answer:
      "shadcn/ui was excluded outright for guaranteeing a fork per site. Among the five built, the theme and token layer extracts; kitchen-sink section components do not.",
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
      "React Aria and Carbon resolve tokens in the browser, so a Mangrove change is a stylesheet swap. MUI, Mantine and Ant Design bake values in, making it a rebuild of every site. Carbon leaves 21-22 of 71 tokens unreachable at all.",
  },
  {
    question: "Right-to-left",
    asks: "Does Arabic work in the components, not just the page?",
    axis: "A6",
    axisName: "Right-to-left",
    answer:
      "MUI Community fails on both hosts and cannot be fixed within the brief's constraints. React Aria and Ant Design are clean at zero cost; Mantine is clean only after mitigation. This needs a policy call, not a bug fix.",
  },
  {
    question: "Accessibility",
    asks: "Does it meet UNDRR's obligations in practice?",
    axis: "A7",
    axisName: "Accessibility conformance",
    answer:
      "Zero is a floor, not a conformance claim: no screen-reader or human keyboard pass was run on any pairing. And the floor is lower than the kitchen sinks suggested - the realistic layouts found a critical unnamed-button defect in Mantine's Modal that every scoped axe run in this repository was blind to, because portalled overlays render outside the scanned subtree.",
  },
];

/**
 * The questions one axis answers. Empty for A1 and A2, which is itself worth
 * saying on the page rather than leaving as a silent gap - see `axisPreamble`.
 *
 * @param {string} axis
 * @returns {readonly UndrrQuestion[]}
 */
export function questionsForAxis(axis) {
  return UNDRR_QUESTIONS.filter((q) => q.axis === axis);
}

/**
 * The plain-language block that opens an axis section, as markdown blockquote
 * lines: the question in UNDRR's words, then the answer, before any table.
 *
 * @param {string} axis
 * @returns {string[]} lines, empty-terminated, ready to push
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
