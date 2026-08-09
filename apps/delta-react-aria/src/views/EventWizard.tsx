/**
 * The add-disaster-event wizard, React Aria.
 *
 * REACT ARIA SHIPS NO STEPPER, AND THAT IS THE FINDING. PrimeReact - the incumbent
 * this evaluation is replacing - has `Stepper`, and DELTA's own add-event screen
 * uses one, so "step indicator" is not a nice-to-have on this estate: it is
 * existing functionality that has to survive the migration. React Aria Components
 * has `Tabs`, `Breadcrumbs`, `ProgressBar` and `Disclosure`, and none of them is
 * this. Everything below the buttons is ours: the markup, the states, the
 * connector line, the completed check, the number-to-check swap, the responsive
 * collapse and the announcement.
 *
 * WHY NOT `Tabs`, WHICH IS THE TEMPTING SHORTCUT. A tab set says its panels are
 * peers you may visit in any order. A wizard says the opposite: the steps are
 * ordered, later ones may be unreachable until earlier ones are done, and "where
 * you are" is progress rather than preference. Announcing this as tabs would tell
 * a screen-reader user they can move freely through a form that will not let them.
 *
 * WHAT IT IS INSTEAD. An ordered list inside a labelled `nav`, one button per
 * step, `aria-current="step"` on the current one, `aria-disabled` on steps ahead
 * of the furthest reached, and a live region announcing the change - because a
 * mouse user sees the indicator move and a screen-reader user otherwise gets only
 * the new panel with no statement of progress. `aria-current="step"` is the
 * ARIA-documented value for exactly this and costs one attribute; a wizard that
 * omits it leaves the current step indistinguishable from the rest in the
 * accessibility tree, however obvious the blue circle is on screen.
 *
 * REACT ARIA STILL EARNS ITS PLACE HERE. The step buttons are `Button`, so
 * disabled state, press handling and focus ring behaviour are the library's, and
 * they behave identically to every other button in the demo. That is the honest
 * shape of this library on a real screen: it does the interaction, we do the
 * component.
 */

import { useId, useState } from "react";
import type { ReactElement } from "react";
import { Button } from "react-aria-components";

import { REVIEW_GROUPS, WIZARD_STEPS } from "@undrr-eval/fixtures";

import { useDemo } from "../demo-state.js";

/** The review step's label/value cards, from the design file. */
function ReviewStep(): ReactElement {
  const { labels } = useDemo();
  return (
    <div className="demo-review">
      {REVIEW_GROUPS.map((group) => (
        <section className="demo-review__card" key={group.id} aria-labelledby={`review-${group.id}`}>
          <h4 className="demo-review__title" id={`review-${group.id}`}>
            {labels[group.titleKey]}
          </h4>
          <dl className="demo-review__grid">
            {group.rows.map((row) => (
              <div className="demo-review__row" key={row.labelKey}>
                <dt className="demo-review__label">{labels[row.labelKey]}</dt>
                <dd className="demo-review__value">
                  {row.valueKey ? labels[row.valueKey] : row.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}

export function EventWizard(): ReactElement {
  const { labels } = useDemo();
  const [current, setCurrent] = useState(0);
  /*
   * Steps ahead of this are unreachable. Tracked separately from `current` so that
   * stepping back does not lock the steps you already completed - which is how
   * DELTA's own wizard behaves, and the reason the design file shows steps 1-3
   * checked while step 4 is active.
   */
  const [furthest, setFurthest] = useState(0);
  const panelId = useId();

  /*
   * `?? WIZARD_STEPS[0]!` rather than a non-null assertion on the index: `current`
   * is only ever set from a real index, so the fallback is unreachable, but under
   * `noUncheckedIndexedAccess` the compiler cannot know that and silencing it with
   * `!` would also silence a genuine out-of-range bug later.
   */
  const step = WIZARD_STEPS[current] ?? WIZARD_STEPS[0]!;
  const isLast = current === WIZARD_STEPS.length - 1;

  function go(next: number): void {
    setCurrent(next);
    setFurthest((reached) => Math.max(reached, next));
  }

  return (
    <section className="demo-wizard" aria-labelledby="wizard-heading">
      <h3 className="demo-wizard__title" id="wizard-heading">
        {labels.wizardTitle}
      </h3>

      <nav className="demo-stepper" aria-label={labels.wizardProgressLabel}>
        <ol className="demo-stepper__list">
          {WIZARD_STEPS.map((entry, index) => {
            const state =
              index === current ? "current" : index < furthest ? "complete" : "upcoming";
            return (
              <li className="demo-stepper__item" data-state={state} key={entry.id}>
                <Button
                  className="demo-stepper__button"
                  isDisabled={index > furthest}
                  onPress={() => go(index)}
                  {...(index === current ? { "aria-current": "step" as const } : {})}
                >
                  {/*
                   * The marker carries the number, or a check once the step is
                   * behind you. `aria-hidden` because the button's text already
                   * names the step: announcing "3" before "Additional details"
                   * adds noise, and announcing a tick character adds nonsense.
                   */}
                  <span className="demo-stepper__marker" aria-hidden="true">
                    {state === "complete" ? "✓" : index + 1}
                  </span>
                  <span className="demo-stepper__text">
                    <span className="demo-stepper__label">{labels[entry.labelKey]}</span>
                    <span className="demo-stepper__optionality">
                      {labels[entry.optionalityKey]}
                    </span>
                  </span>
                </Button>
              </li>
            );
          })}
        </ol>
      </nav>

      {/*
       * Progress, announced. A screen-reader user moving through this hears the new
       * panel but is told nothing about where they are in the sequence unless it is
       * said out loud, and `aria-current` alone is only discoverable by navigating
       * back to the indicator.
       */}
      <p className="demo-visually-hidden" role="status">
        {labels[step.labelKey]} — {current + 1} / {WIZARD_STEPS.length}
      </p>

      <div className="demo-wizard__panel" id={panelId}>
        <h4 className="demo-wizard__panel-title">{labels[step.labelKey]}</h4>
        {isLast ? (
          <ReviewStep />
        ) : (
          <p className="demo-wizard__placeholder">{labels.longSubmissionGuidance}</p>
        )}
      </div>

      <div className="demo-wizard__actions">
        <Button className="demo-button" isDisabled={current === 0} onPress={() => go(current - 1)}>
          {labels.actionBack}
        </Button>
        <Button className="demo-button">{labels.actionSaveDraft}</Button>
        {/*
         * The primary action becomes Save on the last step rather than a disabled
         * Next. A greyed-out Next on the final step of a wizard tells the reader
         * the flow is broken rather than finished, and the design file's step 4 is
         * headed "Review and save" - the save IS the step.
         */}
        {isLast ? (
          <Button className="demo-button demo-button--primary">{labels.actionSave}</Button>
        ) : (
          <Button className="demo-button demo-button--primary" onPress={() => go(current + 1)}>
            {labels.actionNext}
          </Button>
        )}
      </div>
    </section>
  );
}
