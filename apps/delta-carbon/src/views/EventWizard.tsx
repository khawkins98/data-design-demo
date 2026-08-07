/**
 * The add-disaster-event wizard, IBM Carbon.
 *
 * CARBON SHIPS THIS PATTERN, UNDER A DIFFERENT NAME. There is no component called
 * `Stepper` in `@carbon/react`; the thing is called `ProgressIndicator` /
 * `ProgressStep`, and it is the same pattern — ordered steps, one current, the ones
 * behind complete, the ones ahead not yet reachable, a connector line between them.
 * Stated explicitly because a reader comparing five demos and grepping for
 * "stepper" would conclude Carbon ships nothing, which is wrong and is the opposite
 * of the React Aria result. Carbon is one of the candidates that DOES cover
 * PrimeReact's `Stepper`.
 *
 * WHAT CARBON OWNS HERE
 *   The markup       `<ul class="cds--progress">` with one `<li><button>` per step,
 *                    the icon (CircleDash / Incomplete / CheckmarkOutline), the
 *                    connector line, the current/complete/incomplete/disabled
 *                    classes, and Enter/Space key handling on the step button.
 *   The state model  `currentIndex` on the indicator plus `complete` / `disabled`
 *                    on each step. Nothing below recomputes what a step looks like.
 *   The sublabel     `secondaryLabel` is a real prop and takes the design file's
 *                    REQUIRED / OPTIONAL line. Carbon renders it in
 *                    `.cds--progress-optional`. React Aria had nowhere to put it
 *                    because it had no component at all; Carbon has the slot.
 *   Equal columns    `spaceEqually`, which is what makes the four connectors the
 *                    same length. Without it every step is a hard 128px.
 *
 * WHAT IS OURS, AND WHY — the part that is the evaluation's output
 *
 *   1. `aria-current="step"`. Carbon does NOT emit it. Its only accessibility-tree
 *      signal for the current step is a visually hidden `<span
 *      class="cds--assistive-text">Current</span>` folded into the step button's
 *      accessible name (ProgressIndicator.js:118-126). That works for a screen
 *      reader but has two costs: the name becomes "Event basics Required Current"
 *      rather than carrying the state as state, and the word is English unless
 *      every step is given a `translateWithId`. `LabelSet` has no word for
 *      "Current"/"Complete"/"Incomplete", so the English stays and is recorded as a
 *      fixture gap — the same call AppView.tsx makes for Carbon's Pagination
 *      chrome. `aria-current="step"` is one attribute and reaches the button
 *      through ProgressStep's `...rest`, so it is added here.
 *
 *   2. `complete={index !== current && index < furthest}` — the `index !== current`
 *      guard is forced by Carbon, not a preference. `ProgressIndicator` resolves
 *      the current step as `current: !child.props.complete`
 *      (ProgressIndicator.js:53-56), so a step that is BOTH the one you are on and
 *      one you have already been past renders as complete and NOTHING on the
 *      indicator is current. Measured: click Next then Back and the checkmark
 *      appears on step 1 with no current marker anywhere. Carbon's precedence is
 *      complete-over-current; a wizard's is current-over-complete.
 *
 *   3. The revisitable/unreachable rule. Carbon has no notion of "furthest
 *      reached": `currentIndex` alone would relock every step behind you. So
 *      `furthest` is tracked separately, exactly as the React Aria pilot does, and
 *      fed to Carbon's own `disabled`.
 *
 *   4. The live region. Carbon announces nothing when `currentIndex` changes.
 *
 *   5. Horizontal overflow at 390px. `.cds--progress-step` is `min-inline-size:
 *      7rem`, or 8rem under `spaceEqually`, and the partial contains ZERO media
 *      queries — so four steps demand 512px and scroll the whole document on a
 *      390px viewport. Carbon's answer is the `vertical` prop, which is a React
 *      prop and not a breakpoint, so responsiveness would mean a `matchMedia` hook
 *      in application code. The scroll container in demo.css is the cheaper of the
 *      two and keeps the indicator horizontal at every viewport, which is what the
 *      design file shows. Recorded rather than presented as free.
 *
 *   6. The review cards' group titles. `StructuredListWrapper` has no heading slot,
 *      so the `<h4>` is ours.
 */

import { useId, useState } from "react";
import type { ReactElement } from "react";
import {
  Button,
  ProgressIndicator,
  ProgressStep,
  StructuredListBody,
  StructuredListCell,
  StructuredListRow,
  StructuredListWrapper,
  Tile,
} from "@carbon/react";

import { REVIEW_GROUPS, WIZARD_STEPS } from "@undrr-eval/fixtures";

import { useDemo } from "../demo-state.js";

/**
 * The review step's label/value cards.
 *
 * `Tile` is Carbon's card and `StructuredList` is the closest thing it has to a
 * label/value list, so both are the library's. WHAT THAT COSTS, and it is a real
 * finding rather than a nitpick: `StructuredList` is a TABLE. It emits
 * `role="table"` / `rowgroup` / `row` / `cell`, so a screen reader hears "table, 6
 * rows, 2 columns" over a card that is conceptually six field/value pairs. And
 * `StructuredListCell` offers `head`, which is `role="columnheader"`, but nothing
 * for `role="rowheader"` — so the field name in each row cannot be marked as the
 * header OF that row. Using `head` here would put a column header inside a body
 * row, which is worse than leaving both cells plain. So the association between
 * "GLIDE number" and "—" is positional only, which a `<dl>` would have given for
 * free. The wrapper is named by the card's own heading via `aria-labelledby`,
 * because an unnamed table is the one part of this that axe does flag.
 */
function ReviewStep(): ReactElement {
  const { labels } = useDemo();
  const idPrefix = useId();
  return (
    <div className="demo__review">
      {REVIEW_GROUPS.map((group) => {
        const titleId = `${idPrefix}-${group.id}`;
        return (
          <Tile className="demo__review-card" key={group.id}>
            <h4 className="demo__review-title" id={titleId}>
              {labels[group.titleKey]}
            </h4>
            <StructuredListWrapper aria-labelledby={titleId} isCondensed isFlush>
              <StructuredListBody>
                {group.rows.map((row) => (
                  <StructuredListRow key={row.labelKey}>
                    <StructuredListCell className="demo__review-label">
                      {labels[row.labelKey]}
                    </StructuredListCell>
                    {/*
                     * The em dashes are the design file's "no value recorded" and are
                     * rendered as-is. A review screen's whole job is showing which
                     * fields are still empty, so nothing here substitutes a
                     * placeholder or hides the row.
                     */}
                    <StructuredListCell className="demo__review-value">
                      {row.valueKey ? labels[row.valueKey] : row.value}
                    </StructuredListCell>
                  </StructuredListRow>
                ))}
              </StructuredListBody>
            </StructuredListWrapper>
          </Tile>
        );
      })}
    </div>
  );
}

export function EventWizard(): ReactElement {
  const { labels } = useDemo();
  const [current, setCurrent] = useState(0);
  /*
   * Steps ahead of this are unreachable. Tracked separately from `current` because
   * Carbon's `currentIndex` does not carry it: on its own, stepping back would
   * relock every step you had already completed. DELTA's own wizard leaves them
   * open, and the design file shows steps 1-3 checked while step 4 is active.
   */
  const [furthest, setFurthest] = useState(0);
  const panelId = useId();

  /*
   * `?? WIZARD_STEPS[0]!` rather than a non-null assertion on the index: `current`
   * is only ever set from a real index, so the fallback is unreachable, but under
   * `noUncheckedIndexedAccess` the compiler cannot know that, and silencing it with
   * `!` would also silence a genuine out-of-range bug later.
   */
  const step = WIZARD_STEPS[current] ?? WIZARD_STEPS[0]!;
  const isLast = current === WIZARD_STEPS.length - 1;

  function go(next: number): void {
    setCurrent(next);
    setFurthest((reached) => Math.max(reached, next));
  }

  return (
    <Tile className="demo__wizard">
      <h3 className="demo__wizard-title">{labels.wizardTitle}</h3>

      {/*
        * The scroll container, and item 5 in the header note: Carbon's step has a
        * 7rem/8rem minimum inline size and the partial has no media queries, so four
        * steps need 512px and would scroll the DOCUMENT at 390px. `overflow-x` is on
        * our own class, the same treatment `.demo__table-scroll` gives the records
        * table, so no `.cds--` rule is overridden to get it.
        */}
      <div className="demo__stepper-scroll">
        <ProgressIndicator
          currentIndex={current}
          spaceEqually
          onChange={go}
          aria-label={labels.wizardProgressLabel}
        >
          {WIZARD_STEPS.map((entry, index) => (
            <ProgressStep
              key={entry.id}
              label={labels[entry.labelKey]}
              /* Carbon's own slot for the design file's REQUIRED / OPTIONAL line. */
              secondaryLabel={labels[entry.optionalityKey]}
              /* See item 2: the `index !== current` guard is Carbon's precedence,
                 not a preference. */
              complete={index !== current && index < furthest}
              disabled={index > furthest}
              /* See item 1: Carbon emits no `aria-current`, only hidden text. */
              {...(index === current ? { "aria-current": "step" as const } : {})}
            />
          ))}
        </ProgressIndicator>
      </div>

      {/*
        * Progress, announced. Carbon changes the indicator's classes and its hidden
        * "Current" text when `currentIndex` moves, but nothing is announced: a
        * screen-reader user pressing Next hears the new panel and is told nothing
        * about where they now are in the sequence.
        */}
      <p className="cds--visually-hidden" role="status">
        {labels[step.labelKey]} — {current + 1} / {WIZARD_STEPS.length}
      </p>

      <div className="demo__wizard-panel" id={panelId}>
        <h4 className="demo__wizard-panel-title">{labels[step.labelKey]}</h4>
        {isLast ? (
          <ReviewStep />
        ) : (
          <p className="demo__prose">{labels.longSubmissionGuidance}</p>
        )}
      </div>

      {/*
        * The action row carries its own class because the records pagination below
        * also has a button named "Next" — both e2e specs scope to
        * `.demo__wizard-actions` for that reason.
        */}
      <div className="demo__wizard-actions">
        <Button kind="secondary" disabled={current === 0} onClick={() => go(current - 1)}>
          {labels.actionBack}
        </Button>
        <Button kind="ghost">{labels.actionSaveDraft}</Button>
        {/*
          * The primary becomes Save on the last step rather than a disabled Next. A
          * greyed-out Next on the final step tells the reader the flow is broken
          * rather than finished, and the design file's step 4 is headed "Review and
          * save" — the save IS the step.
          */}
        {isLast ? (
          <Button kind="primary">{labels.actionSave}</Button>
        ) : (
          <Button kind="primary" onClick={() => go(current + 1)}>
            {labels.actionNext}
          </Button>
        )}
      </div>
    </Tile>
  );
}
