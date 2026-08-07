/**
 * The add-disaster-event wizard, Mantine.
 *
 * MANTINE SHIPS `Stepper`, AND THAT IS THE HEADLINE. The React Aria pilot
 * (`apps/delta-react-aria/src/views/EventWizard.tsx`) had to hand-build the whole
 * indicator — markup, states, connector line, number-to-check swap, responsive
 * collapse. Here `Stepper` + `Stepper.Step` cover the numbered markers, the
 * completed check, the connector separators, the wrap behaviour and the
 * step/content pairing. The label and the REQUIRED/OPTIONAL sublabel land on the
 * component's own `label` and `description` props, which is the one slot the
 * fixture's `optionalityKey` was written to test and the one thing a stepper
 * without a second text line cannot do.
 *
 * WHAT MANTINE'S STEPPER DOES NOT DO, measured against the DOM it emits rather
 * than against its documentation:
 *
 *   1. THE CURRENT STEP IS NOT IN THE ACCESSIBILITY TREE. `Stepper.Step` renders
 *      an `UnstyledButton` carrying `data-progress` (current) and `data-completed`
 *      (behind you) — data attributes, styling hooks, invisible to assistive
 *      technology. There is no `aria-current`. So out of the box a screen-reader
 *      user meets four identically-shaped buttons and is told nothing about which
 *      one they are on, while a sighted user sees a filled blue circle. Same class
 *      of defect as this pairing's recorded `Modal` close button and `Pagination`
 *      edge controls: the visual state is complete and the accessible state is
 *      absent. `aria-current="step"` below is OURS, and the e2e spec asserts both
 *      halves — that Mantine emits `data-progress`, and that the ARIA is something
 *      we added.
 *
 *   2. AN UNREACHABLE STEP IS NOT ANNOUNCED AS UNREACHABLE EITHER. With
 *      `allowNextStepsSelect={false}`, Mantine makes steps ahead inert by dropping
 *      the click handler's effect and setting `tabIndex={-1}`. It emits no
 *      `disabled` and no `aria-disabled` — so the step leaves the tab order but
 *      still reads as a plain actionable button in browse mode. `aria-disabled`
 *      below is ours. This is the better half of the trade compared with the React
 *      Aria pilot, which uses native `disabled` and therefore removes the step
 *      from the accessibility tree's actionable set entirely; Mantine's steps stay
 *      readable, they just needed to be told they are inert.
 *
 *   3. THERE IS NO GROUPING ELEMENT WITH A NAME. The steps row is a bare `div`.
 *      Mantine 9's `attributes` prop turns out to be the fix and it is the
 *      library's own API — `attributes={{ steps: … }}` spreads arbitrary
 *      attributes onto a named style slot — so the row gets `role="group"` and the
 *      fixture's `wizardProgressLabel` without a wrapper element of ours. Worth
 *      recording as a Mantine strength: no other candidate in this evaluation can
 *      reach a component's internal element without a class-name hack.
 *
 *   4. NO PROGRESS ANNOUNCEMENT. Nothing is said when the step changes. The
 *      `role="status"` line below is ours, as it is in the pilot.
 *
 *   5. THE MARKER CANNOT SIT ABOVE THE LABEL. `iconPosition` takes `"left"` or
 *      `"right"` only. DELTA's design file shows the number above the step name;
 *      this renders it beside, which is Mantine's horizontal stepper as shipped.
 *      Kept as shipped rather than overridden: the alternative is re-declaring
 *      `flex-direction` and `margin-inline-start` on two internal slots, which is
 *      the hand-styling this pairing exists to measure the absence of. The cost is
 *      a wider stepper that wraps to two rows sooner in German.
 *
 * FURTHEST-REACHED IS NOT MANTINE'S MODEL, AND `allowStepSelect` IS THE WAY OUT.
 * Mantine derives step state purely from `active`: anything with a higher index is
 * `stepInactive`, so walking back from step 4 to step 1 would re-lock steps 2 and
 * 3 that the user has already completed — not how DELTA's wizard behaves, and not
 * what the design file shows (steps 1-3 checked while step 4 is active). The
 * per-step `allowStepSelect` prop overrides the derivation, so `furthest` is
 * tracked here and fed in. One prop, no reimplementation.
 */

import { useState } from "react";
import type { ReactElement } from "react";
import {
  Button,
  Card,
  Group,
  SimpleGrid,
  Stack,
  Stepper,
  Text,
  Title,
  VisuallyHidden,
} from "@mantine/core";

import { REVIEW_GROUPS, WIZARD_STEPS } from "@undrr-eval/fixtures";

import { useDemo } from "../demo-state.js";

/**
 * The review step's label/value cards.
 *
 * ENTIRELY MANTINE, WITH NO CSS OF OURS: `Card withBorder` is the card, `Stack`
 * the vertical rhythm, `SimpleGrid` the responsive two-up label/value grid and
 * `Text` the uppercase dimmed field name. This is the part of the wizard Mantine
 * covers outright — the pilot needed ~40 lines of `views.css` for the same three
 * cards.
 *
 * `component="dl"` / `"dt"` / `"dd"` on the grid and the text, because a review
 * screen is a description list and `SimpleGrid`/`Text` both take `component`. The
 * row wrapper is a plain `div`, which is valid inside `dl` and is what keeps each
 * label glued to its own value when the grid reflows.
 */
function ReviewStep(): ReactElement {
  const { labels } = useDemo();
  return (
    <Stack gap="md">
      {REVIEW_GROUPS.map((group) => (
        <Card withBorder padding="md" key={group.id} data-testid="wizard-review-card">
          <Title order={4} mb="sm" fz="md">
            {labels[group.titleKey]}
          </Title>
          <SimpleGrid component="dl" cols={{ base: 1, sm: 2, lg: 3 }} spacing="md" m="0">
            {group.rows.map((row) => (
              <div key={row.labelKey}>
                <Text component="dt" fz="xs" fw="bold" tt="uppercase" c="dimmed">
                  {labels[row.labelKey]}
                </Text>
                {/*
                 * `m="0"` because a `dd` carries a UA `margin-inline-start` of
                 * 40px, which in the Arabic pass lands on the right and pushed
                 * every value out of its column. Mantine's style props are
                 * logical, so one declaration covers both directions.
                 *
                 * The em dashes are the fixture's, and stay: this is a
                 * part-completed submission, and how a library renders an absent
                 * value is most of what a review screen does.
                 */}
                <Text
                  component="dd"
                  fz="sm"
                  m="0"
                  style={{ overflowWrap: "break-word" }}
                  data-testid="wizard-review-value"
                >
                  {row.valueKey ? labels[row.valueKey] : row.value}
                </Text>
              </div>
            ))}
          </SimpleGrid>
        </Card>
      ))}
    </Stack>
  );
}

export function EventWizard(): ReactElement {
  const { labels } = useDemo();
  const [current, setCurrent] = useState(0);
  /* See the header note: Mantine derives state from `active` alone, so the
     furthest-reached index is tracked here and handed back via `allowStepSelect`. */
  const [furthest, setFurthest] = useState(0);

  /*
   * `?? WIZARD_STEPS[0]!` rather than a non-null assertion on the index, for the
   * reason the pilot gives: `current` only ever holds a real index, but under
   * `noUncheckedIndexedAccess` the compiler cannot know that, and `!` would also
   * silence a genuine out-of-range bug later.
   */
  const step = WIZARD_STEPS[current] ?? WIZARD_STEPS[0]!;
  const isLast = current === WIZARD_STEPS.length - 1;

  function go(next: number): void {
    setCurrent(next);
    setFurthest((reached) => Math.max(reached, next));
  }

  return (
    <Card withBorder padding="lg" mt="xl" data-testid="wizard">
      <Title order={3} mb="md">
        {labels.wizardTitle}
      </Title>

      <Stepper
        active={current}
        onStepClick={go}
        /*
         * The library's own gate on forward navigation. Without it Mantine lets a
         * click jump to any step, which for a submission flow with a REQUIRED
         * first step is wrong; with it, and with the per-step `allowStepSelect`
         * below, "behind you is revisitable, ahead is not" is entirely Mantine's
         * behaviour rather than ours.
         */
        allowNextStepsSelect={false}
        /*
         * See header note 3. `attributes` writes onto Mantine's `steps` slot — the
         * bare div holding the row — so the group gets a role and a name from
         * inside the library's API rather than from a wrapper of ours.
         */
        attributes={{ steps: { role: "group", "aria-label": labels.wizardProgressLabel } }}
      >
        {WIZARD_STEPS.map((entry, index) => {
          const reachable = index <= furthest;
          return (
            <Stepper.Step
              key={entry.id}
              label={labels[entry.labelKey]}
              /* The fixture's REQUIRED / OPTIONAL line. `description` is
                 Mantine's second text slot and takes it verbatim — no wrapper, no
                 CSS. The one thing the pilot's comment predicted would separate
                 the candidates, and Mantine has it. */
              description={labels[entry.optionalityKey]}
              allowStepSelect={reachable}
              /* Both of these are OURS. Mantine emits `data-progress` /
                 `data-completed` and nothing else; see header notes 1 and 2. */
              {...(index === current ? { "aria-current": "step" as const } : {})}
              {...(reachable ? {} : { "aria-disabled": true })}
              data-testid={`wizard-step-${entry.id}`}
            >
              {/* Keyed off THIS step's index, not off `current`: Mantine renders
                  only the active step's children (`keepMounted` is false by
                  default), but a ternary on `current` would have put the review
                  cards inside all four steps and hidden the mistake. */}
              {index === WIZARD_STEPS.length - 1 ? (
                <ReviewStep />
              ) : (
                <Text>{labels.longSubmissionGuidance}</Text>
              )}
            </Stepper.Step>
          );
        })}
      </Stepper>

      {/*
       * Progress, announced. Mantine says nothing when `active` changes, so a
       * screen-reader user gets the new panel with no statement of where they are
       * in the sequence — and `aria-current` alone is only discoverable by
       * navigating back to the indicator.
       */}
      <VisuallyHidden role="status">
        {labels[step.labelKey]} — {current + 1} / {WIZARD_STEPS.length}
      </VisuallyHidden>

      {/*
       * `data-testid` on the action row is not decoration: the records screen
       * above renders a `Pagination` whose next control is also named "Next", so
       * every wizard button locator in `e2e/app.spec.ts` is scoped to this Group
       * or it hits a strict-mode violation.
       */}
      <Group gap="sm" mt="lg" data-testid="wizard-actions">
        <Button variant="default" disabled={current === 0} onClick={() => go(current - 1)}>
          {labels.actionBack}
        </Button>
        <Button variant="default">{labels.actionSaveDraft}</Button>
        {/*
         * The primary becomes Save on the last step rather than a disabled Next. A
         * greyed-out Next on the final step says the flow is broken rather than
         * finished, and the design file's step 4 is headed "Review and save" — the
         * save IS the step.
         */}
        {isLast ? (
          <Button variant="filled">{labels.actionSave}</Button>
        ) : (
          <Button variant="filled" onClick={() => go(current + 1)}>
            {labels.actionNext}
          </Button>
        )}
      </Group>
    </Card>
  );
}
