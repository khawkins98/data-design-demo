/**
 * The add-disaster-event wizard, MUI Community.
 *
 * WHAT THIS PAIRING GETS FOR FREE, AND IT IS MOST OF IT. MUI ships `Stepper`,
 * `Step`, `StepLabel`, `StepButton` and `StepConnector`. Against the React Aria
 * pilot — which ships no stepper and therefore hand-writes the markup, the states,
 * the connector line, the number-to-check swap and the responsive collapse in 165
 * lines of component plus ~190 lines of CSS — this file writes no connector, no
 * marker circle, no completed check and no stepper CSS at all. `activeStep`,
 * `completed` and `disabled` are the whole state surface, and `alternativeLabel`
 * is the "label under the circle" layout the DELTA design file shows, as one prop.
 *
 * `optional` TOOK THE SUBLABEL, WHICH IS THE FIRST THING WORTH REPORTING. The
 * design file's REQUIRED/OPTIONAL line under each step label is exactly what
 * `StepLabel`'s `optional` prop is for (StepLabel.d.ts:62, "The optional node to
 * display"), and it renders inside the label container so it wraps and mirrors with
 * the label rather than beside it. The fixture comment noted that "a stepper that
 * has nowhere to put it is a finding"; MUI has somewhere to put it.
 *
 * AND NOW THE DEFECT, WHICH IS NOT SMALL. MUI 9's `Stepper` puts
 * `role="tablist"` on its root and `role="tab"` + `aria-selected` +
 * `aria-posinset`/`aria-setsize` on every `StepButton`, and it does so
 * automatically: `Stepper` sniffs its children for `StepButton` and switches into
 * tab-list mode (Stepper.js:149-161, StepButton.js:135-138). There is no prop to
 * opt out. A tab list says its panels are peers you may visit in any order; a
 * linear wizard says the opposite — the steps are ordered, the ones ahead are
 * unreachable, and "where you are" is progress rather than preference. Announcing
 * this markup as tabs tells a screen-reader user they can move freely through a
 * form that will refuse them, and `aria-selected` on a step is a statement about
 * selection where the correct statement is `aria-current="step"` — which MUI emits
 * nowhere and offers no prop for. `Step` also takes `role="presentation"` in this
 * mode (Step.js:156), which strips the list-item semantics the same release added.
 *
 * IT IS DELIBERATE, AND MUI RAISED THIS OBJECTION AGAINST ITSELF. Not a bug
 * awaiting a fix: v5, v6 and v7 all emitted `aria-current="step"` on `StepButton`;
 * PR #47687 ("[Stepper][MenuList][Tabs] Improve accessibility", merged 2026-03-12)
 * replaced it for v9.0.0, and the v9 migration guide records "the `aria-current`
 * changed to `aria-selected`" as an improvement.
 *
 * On issue #43689, 2026-01-27, a MUI maintainer asked "Wouldn't it be a bit odd if
 * Stepper provides all the `tab` roles except `tabpanel`?" and the PR's own author
 * answered the same day: "I'm currently hesitant in turning the stepper into a tab
 * list. I think the ordered list markup, combined with the aria-current and step
 * buttons pointing to the content area is enough." That is the LAST HUMAN COMMENT
 * on the thread. A commit titled `refactor as tablist` landed two weeks later and
 * a bot closed the issue on merge. A second reviewer asked the same thing inside
 * the PR - "Since this isn't a tablist, I'm not sure" - and was answered about
 * keyboard mechanics rather than the role. So the override below is permanent
 * maintenance, not a stopgap.
 *
 * NOBODY OUTSIDE MUI HAS FILED AGAINST IT, and the reason is adoption, not
 * consensus: four months after release v9 is 11.4% of `@mui/material` installs
 * against v5's 40%, MUI's screen-reader test matrix postdates v9.0.0 and omits
 * Stepper, and their axe CI asserts only `color-contrast` and `link-in-text-block`
 * - which would miss this anyway, because a wrong tablist is a valid tablist.
 *
 *   https://github.com/mui/material-ui/pull/47687
 *   https://github.com/mui/material-ui/issues/43689
 *   https://mui.com/material-ui/migration/upgrade-to-v9/
 *
 * SO THREE ARIA ATTRIBUTES ARE OVERRIDDEN BY HAND BELOW, and the override only
 * works by accident of prop order: both components spread `...other` AFTER their
 * own `role`, so an app-level `role` wins. That is not a documented extension
 * point. What it costs: the roving tab index MUI installs along with tab-list mode
 * (`useRovingTabIndex`, Stepper.js:103-107) STAYS — one step is tabbable and the
 * arrow keys move between them — because it is wired to the same child-sniffing
 * flag, and dropping it would mean dropping `StepButton`. So the indicator keeps
 * tab-set keyboard behaviour while no longer announcing itself as a tab set. That
 * is a worse mismatch than either end alone, and it is the honest state of this
 * component: MUI will not let the two be separated.
 *
 * The roving index does get RTL right — `Stepper` reads `useRtl()` and hands
 * `isRtl` to the roving container, so ArrowLeft moves forward in Arabic. That is
 * more than the app-level flip the rest of this demo gets from `dir`.
 *
 * NO STYLESHEET. Every visual decision here is a `sx` prop or the shared theme,
 * matching how the rest of this app is written; `demo.css` gains nothing.
 */

import { useState } from "react";
import type { ReactElement } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Paper,
  Stack,
  Step,
  StepButton,
  StepLabel,
  Stepper,
  Typography,
  stepConnectorClasses,
} from "@mui/material";

import { REVIEW_GROUPS, WIZARD_STEPS } from "@undrr-eval/fixtures";

import { useDemo } from "@undrr-eval/integration-mui";

/**
 * The review step's label/value cards, from the design file.
 *
 * `Card` + `CardContent` for the container and a `Box component="dl"` grid for the
 * rows: MUI has no description-list component, so the label/value pairing itself
 * is ours. That is a smaller gap than it sounds — the semantics are `dl`/`dt`/`dd`
 * either way — but it is the same shape of gap the React Aria pilot has everywhere,
 * and it is worth noting that MUI's coverage stops at the card.
 */
function ReviewStep(): ReactElement {
  const { labels } = useDemo();
  return (
    <Box
      data-testid="wizard-review"
      sx={{ display: "grid", gap: 3, gridTemplateColumns: "repeat(auto-fit, minmax(18rem, 1fr))" }}
    >
      {REVIEW_GROUPS.map((group) => (
        <Card key={group.id} variant="outlined" data-testid="wizard-review-card">
          <CardContent>
            <Typography variant="h4" component="h4" sx={{ mb: 2 }}>
              {labels[group.titleKey]}
            </Typography>
            <Box
              component="dl"
              sx={{
                display: "grid",
                gap: 1,
                gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
                m: 0,
              }}
            >
              {group.rows.map((row) => [
                <Typography
                  key={`${row.labelKey}-label`}
                  component="dt"
                  variant="body2"
                  color="text.secondary"
                >
                  {labels[row.labelKey]}
                </Typography>,
                <Typography
                  key={`${row.labelKey}-value`}
                  component="dd"
                  variant="body2"
                  data-testid="wizard-review-value"
                  /* `overflowWrap` because one value is a 36-character UUID and the
                     card column is 18rem at its narrowest: without it the UUID
                     forces the grid wider than the viewport. Measured at 360px. */
                  sx={{ m: 0, overflowWrap: "anywhere" }}
                >
                  {row.valueKey ? labels[row.valueKey] : row.value}
                </Typography>,
              ])}
            </Box>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}

export function EventWizard(): ReactElement {
  const { labels } = useDemo();
  const [current, setCurrent] = useState(0);
  /*
   * Steps ahead of this are unreachable. Tracked separately from `current` — same
   * two-state model as the React Aria pilot, and MUI does not supply it either:
   * `Stepper` takes `activeStep` and each `Step` takes `completed`/`disabled`, all
   * of them controlled, so "how far did they get" is still the application's to
   * remember. What MUI removes is the rendering of those states, not the states.
   */
  const [furthest, setFurthest] = useState(0);

  /*
   * `?? WIZARD_STEPS[0]!` rather than an assertion on the index: `current` is only
   * ever set from a real index, so the fallback is unreachable, but under
   * `noUncheckedIndexedAccess` the compiler cannot know that and `!` would also
   * silence a genuine out-of-range bug later.
   */
  const step = WIZARD_STEPS[current] ?? WIZARD_STEPS[0]!;
  const isLast = current === WIZARD_STEPS.length - 1;

  function go(next: number): void {
    setCurrent(next);
    setFurthest((reached) => Math.max(reached, next));
  }

  return (
    <Paper
      variant="outlined"
      data-testid="wizard"
      component="section"
      aria-labelledby="wizard-heading"
      /* `position: relative` only so the visually-hidden status line below is
         positioned against this card. Absolutely positioning it against the
         document instead pushed the page's scroll width out at 360px. */
      sx={{ position: "relative", mt: 6, p: 5 }}
    >
      <Typography variant="h3" component="h3" id="wizard-heading" sx={{ mb: 4 }}>
        {labels.wizardTitle}
      </Typography>

      {/*
       * `nonLinear` is what makes a completed step clickable — without it MUI
       * renders the label inert even inside a `StepButton`. `alternativeLabel` is
       * the design file's layout: marker above, label below, connector between the
       * markers rather than between the labels.
       *
       * `role="group"` overrides MUI's `role="tablist"`; see the file header. A
       * group with an accessible name is the honest description of a progress
       * indicator whose items are buttons — it claims nothing about ordering or
       * selection that the wizard then contradicts. `component="ol"` (MUI's
       * default) still emits the list element underneath, so nothing is lost.
       */}
      <Stepper
        nonLinear
        alternativeLabel
        activeStep={current}
        role="group"
        /*
         * MUI also hard-codes `aria-orientation` on the stepper root
         * (Stepper.js:115), which is invalid on `role="group"` — axe flagged it as a
         * CRITICAL `aria-allowed-attr` violation on `.MuiStepper-root` the first time
         * this ran, which is how the attribute was found at all. Removed the same
         * way as the rest.
         */
        aria-orientation={undefined}
        aria-label={labels.wizardProgressLabel}
        sx={{
          /*
           * MUI'S CONNECTOR IS POSITIONED WITH PHYSICAL CSS AND IS WRONG IN ARABIC.
           * THIS RULE IS THE FIX AND THE FINDING.
           *
           * In horizontal + `alternativeLabel` mode `StepConnector` is absolutely
           * positioned with `left: calc(-50% + 20px); right: calc(50% + 20px)`
           * (StepConnector.js:70-72) — a box half a step wide, centred on the step's
           * PHYSICAL left edge, which in LTR is the boundary with the previous step.
           * `left`/`right` do not swap under `dir="rtl"`, so in Arabic every
           * connector stays centred on the physical left edge, which is now the
           * boundary with the NEXT step. Measured at 1280px in Arabic before this
           * rule: the gap between steps 1 and 2 had no line at all, and step 4's
           * connector was centred at x=37 — half of it, 94px, hanging off the left
           * edge of the page.
           *
           * The fix is to state the same geometry logically. Identical output in
           * LTR (`inset-inline-start` maps to `left`), correct in RTL, and it has to
           * be written by hand: there is no prop, no `direction`-aware variant and
           * no theme switch for it, and the rest of this pairing gets its mirroring
           * from `dir` alone with no RTL plugin. `left`/`right: auto` first because
           * physical and logical inset map to the same property and the later
           * declaration must win.
           */
          [`& .${stepConnectorClasses.alternativeLabel}`]: {
            left: "auto",
            right: "auto",
            insetInlineStart: "calc(-50% + 20px)",
            insetInlineEnd: "calc(50% + 20px)",
          },
        }}
      >
        {WIZARD_STEPS.map((entry, index) => (
          <Step
            key={entry.id}
            completed={index < furthest}
            /*
             * `disabled` goes on `Step`, not `StepButton` — StepButton lists
             * `disabled` in `ignoredProps` (StepButton.d.ts:33) and reads it from
             * StepContext instead. It comes out as the NATIVE `disabled`
             * attribute, same as the React Aria pilot: the steps ahead leave the
             * tab order entirely rather than staying readable-but-inert, which
             * `aria-disabled` would give. Neither library offers the latter.
             */
            disabled={index > furthest}
            /*
             * `minWidth: 0`, because MUI's `Step` is `flex: 1 1 auto` with no
             * min-width override and therefore refuses to shrink below its
             * min-content width. Measured at 390px in German: the four steps wanted
             * 422px inside a 316px stepper and pushed the DOCUMENT's scrollWidth to
             * 459px against a 390px viewport — the existing "long labels do not
             * overflow the viewport" test caught it. MUI's answer to a narrow
             * stepper is `orientation="vertical"`, which the app must switch itself;
             * there is no responsive behaviour in the component. One `sx` line buys
             * the same result the React Aria pilot gets from `flex: 1 1 0;
             * min-width: 0` — the labels wrap instead of the row overflowing.
             */
            sx={{ minWidth: 0 }}
          >
            <StepButton
              onClick={() => go(index)}
              role="button"
              /*
               * The three attributes MUI emits for a tab set, removed, and the one
               * it does not emit, added. `aria-selected`/`posinset`/`setsize` are
               * meaningless on a button and were describing this wizard as a tab
               * list; `aria-current="step"` is the ARIA-documented value for "this
               * is where you are in a process" and MUI has no prop for it.
               * `undefined` is how a React attribute is removed — MUI sets these
               * before its `...other` spread, so passing them here wins.
               */
              aria-selected={undefined}
              aria-posinset={undefined}
              aria-setsize={undefined}
              {...(index === current ? { "aria-current": "step" as const } : {})}
              /*
               * The REQUIRED/OPTIONAL sublabel from the design file, in the slot MUI
               * provides for it — but on `StepButton`, NOT on the `StepLabel` below,
               * and the difference is invisible until you test it. `StepButton`
               * clones its `StepLabel` child with `{ icon, optional }` of its own
               * (StepButton.js:122-124), so an `optional` set on the StepLabel is
               * silently overwritten with `undefined` and the sublabel simply does
               * not render. No warning, no type error: the first draft put it on
               * StepLabel and the e2e assertion found four steps and zero
               * sublabels. Neither prop's documentation mentions the other.
               *
               * `caption` + `text.secondary` is theme typography, not a local font
               * size. Uppercased here rather than in the fixture because the fixture
               * strings are sentence case for every other consumer.
               */
              optional={
                <Typography
                  variant="caption"
                  color="text.secondary"
                  data-testid="wizard-step-optionality"
                  sx={{ textTransform: "uppercase", letterSpacing: "0.04em" }}
                >
                  {labels[entry.optionalityKey]}
                </Typography>
              }
            >
              <StepLabel
                /*
                 * German's "Zusätzliche Einzelheiten" is why the label may wrap.
                 * MUI's `StepLabel` does not set `white-space: nowrap`, so it
                 * wraps by default and the e2e pass measures that rather than
                 * trusting it; `overflowWrap` covers the case where a single word
                 * is wider than the column.
                 *
                 * `slotProps.label` is typed as `SlotProps<'span', {}, ...>` and
                 * that type does NOT admit `data-*`: adding a test hook here is a
                 * typecheck error, so the e2e pass targets MUI's own
                 * `.MuiStepLabel-label` class instead. Worth recording — MUI's slot
                 * props reach the styling but not the attributes.
                 */
                slotProps={{ label: { sx: { overflowWrap: "break-word" } } }}
              >
                {labels[entry.labelKey]}
              </StepLabel>
            </StepButton>
          </Step>
        ))}
      </Stepper>

      {/*
       * Progress, announced. MUI's stepper is entirely visual for this purpose:
       * `aria-current` alone is only discoverable by navigating back to the
       * indicator, so a screen-reader user pressing Next hears the new panel and
       * nothing about where they now are. `role="status"` on a text node is the
       * whole mechanism, and it is ours in both pairings.
       */}
      <Typography
        role="status"
        sx={{
          position: "absolute",
          /*
           * `"1px"`, NOT `1`. In `sx`, a unitless number between 0 and 1 on `width`
           * or `height` is a FRACTION — `width: 1` compiles to `width: 100%`, which
           * is how this visually-hidden line first pushed the document's scrollWidth
           * 3px past its clientWidth in German and failed the existing
           * "long labels do not overflow the viewport" test. Ours, not MUI's, but
           * the trap is MUI's shorthand and it fails silently.
           */
          width: "1px",
          height: "1px",
          overflow: "hidden",
          clip: "rect(0 0 0 0)",
          whiteSpace: "nowrap",
        }}
      >
        {labels[step.labelKey]} — {current + 1} / {WIZARD_STEPS.length}
      </Typography>

      <Divider sx={{ mt: 5, mb: 4 }} />

      <Typography variant="h4" component="h4" sx={{ mb: 3 }}>
        {labels[step.labelKey]}
      </Typography>

      {isLast ? (
        <ReviewStep />
      ) : (
        <Typography color="text.secondary" sx={{ maxWidth: "60ch" }}>
          {labels.longSubmissionGuidance}
        </Typography>
      )}

      <Stack
        direction="row"
        useFlexGap
        spacing={2}
        data-testid="wizard-actions"
        sx={{ mt: 5, flexWrap: "wrap", alignItems: "center" }}
      >
        <Button disabled={current === 0} onClick={() => go(current - 1)}>
          {labels.actionBack}
        </Button>
        <Button>{labels.actionSaveDraft}</Button>
        {/*
         * The primary action becomes Save on the last step rather than a disabled
         * Next. A greyed-out Next on the final step tells the reader the flow is
         * broken rather than finished, and the design file's step 4 is headed
         * "Review and save" — the save IS the step.
         */}
        {isLast ? (
          <Button variant="contained">{labels.actionSave}</Button>
        ) : (
          <Button variant="contained" onClick={() => go(current + 1)}>
            {labels.actionNext}
          </Button>
        )}
      </Stack>
    </Paper>
  );
}
