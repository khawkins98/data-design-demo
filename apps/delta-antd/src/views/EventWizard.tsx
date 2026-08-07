/**
 * The add-disaster-event wizard, Ant Design.
 *
 * WHY THIS COMPONENT EXISTS AT ALL. PrimeReact — the incumbent this evaluation is
 * replacing — ships `Stepper`, and DELTA's own add-event screen uses one, so a step
 * indicator is not a flourish on this estate: it is existing functionality that has
 * to survive the migration. The React Aria pilot
 * (`apps/delta-react-aria/src/views/EventWizard.tsx`) had to build the whole thing —
 * markup, states, connector line, completed check, responsive collapse. antd ships
 * `Steps`, so the comparison here is not "can it" but "what is left over".
 *
 * WHAT ANTD GAVE AWAY, measured against the pilot's 235 lines of component plus
 * ~200 lines of `views.css`:
 *
 *   - the marker circles, the number-to-check swap on `status: "finish"`, and the
 *     connector rails between them. The rails use `insetInlineStart`, so Arabic
 *     mirrors with no RTL code of ours (asserted in `app.spec.ts`).
 *   - `titlePlacement="vertical"` puts the marker above the label, which is the
 *     arrangement the design file shows; the pilot wrote that as flexbox.
 *   - `responsive` (default on) flips the whole stepper to a vertical orientation
 *     below antd's `xs` breakpoint — 390px, i.e. the `mobile` Playwright project.
 *     The pilot has no equivalent and squeezes four columns into 390px.
 *   - `ellipsis` is off by default, so titles wrap rather than clip. German's
 *     "Zusätzliche Einzelheiten" is why that matters, and it is measured rather
 *     than assumed.
 *   - `disabled` per item removes the click handler, the `role="button"` and the
 *     tab stop, so steps ahead of the furthest reached are genuinely inert.
 *
 * WHAT ANTD DID NOT GIVE, and this is the part worth recording:
 *
 *   1. NOTHING IN THE ACCESSIBILITY TREE MARKS THE CURRENT STEP. `@rc-component/steps`
 *      puts `ant-steps-item-active` / `ant-steps-item-process` on the current item
 *      and stops there — no `aria-current`, no `aria-selected`, no `aria-disabled`
 *      on the inert ones. A screen-reader user gets four identical buttons. The fix
 *      is one attribute per item, and it only works because `Step.js` spreads its
 *      leftover item props onto the DOM node; antd's own `StepItem` TYPE does not
 *      declare ARIA props, so `AriaStepItem` below widens it. An escape hatch that
 *      exists by accident of implementation rather than by design.
 *   2. THE STEPS ROOT IS A PLAIN `<div>` with no role and no accessible-name prop,
 *      so the labelled landmark (`<nav aria-label>`) is ours. Passing `aria-label`
 *      to `Steps` directly would land it on a generic div, where AT ignores it and
 *      axe flags `aria-prohibited-attr`.
 *   3. NO LIVE REGION. A mouse user sees the marker move; a screen-reader user is
 *      told nothing about progress. The `role="status"` paragraph is ours, as is
 *      the one `.demo-visually-hidden` rule in `demo.css` that hides it — antd
 *      ships no visually-hidden helper.
 *   4. `items[].description` IS DEPRECATED IN ANTD 6.5.3 in favour of
 *      `items[].content` (`antd/es/steps/index.js` warns on it). The optionality
 *      sublabel therefore goes through `content`. Worth knowing for anyone porting
 *      a v5 stepper: the prop the docs and every tutorial name still works, and
 *      prints a console deprecation on every render in dev.
 *
 * NO CASCADE CONFLICT WAS FOUND. The stepper renders correctly inside the frame's
 * Tailwind page under `StyleProvider layer`; the rails, the circles and the check
 * icon all survive. The recorded antd/Mangrove blocker (Mangrove's stylesheet
 * defeating antd `Select`) has no counterpart here, and this component uses no
 * Select.
 */

import { cloneElement, isValidElement, useState } from "react";
import type { ReactElement } from "react";
import { Button, Card, Descriptions, Space, Steps, Typography } from "antd";
import type { StepsProps } from "antd";

import { REVIEW_GROUPS, WIZARD_STEPS } from "@undrr-eval/fixtures";
import { useDemo } from "@undrr-eval/integration-antd";

/**
 * antd's `StepItem` widened with the two ARIA attributes the component does not
 * emit for itself.
 *
 * `@rc-component/steps`'s `Step.js` destructures the props it knows and spreads
 * `...restItemProps` onto the item element, so anything extra reaches the DOM. The
 * TYPE stops at antd's documented fields, which is why this exists. Declared as an
 * intersection rather than applied with `as`, so the rest of the object is still
 * type-checked against antd's own shape.
 */
type AriaStepItem = NonNullable<StepsProps["items"]>[number] & {
  readonly role?: "button";
  readonly "aria-current"?: "step";
  readonly "aria-disabled"?: boolean;
};

/**
 * The review step's label/value cards, from the design file's "Review and save".
 *
 * `Descriptions` DOES fit this grid, with one caveat that is a finding rather than
 * a blocker: it renders a real `<table>` — `layout="vertical"` puts the labels in a
 * `<tr>` of `<th>` and the values in the `<tr>` beneath — for what is a description
 * list. The pilot uses `<dl>/<dt>/<dd>`, which is the semantically exact markup.
 * What `Descriptions` buys in exchange is the responsive `column` map and the
 * label/value alignment, both of which are hand-written CSS grid in the pilot.
 * Every table locator in `app.spec.ts` is already scoped to `tr[data-row-key]` or
 * `.ant-table`, so the extra tables do not disturb the records-table assertions —
 * checked, not assumed.
 */
function ReviewStep(): ReactElement {
  const { labels } = useDemo();
  return (
    <Space direction="vertical" size="middle" style={{ display: "flex" }}>
      {REVIEW_GROUPS.map((group) => (
        <Card
          className="demo-review__card"
          key={group.id}
          size="small"
          title={
            <Typography.Title level={4} style={{ margin: 0, fontSize: "1rem" }}>
              {labels[group.titleKey]}
            </Typography.Title>
          }
        >
          <Descriptions
            layout="vertical"
            colon={false}
            size="small"
            /* Responsive without a media query of ours: six fields sit in three
               columns on desktop and one on a 390px phone. */
            column={{ xs: 1, sm: 2, md: 3 }}
            items={group.rows.map((row) => ({
              key: row.labelKey,
              label: labels[row.labelKey],
              /* The em dashes are the fixture's, and load-bearing: this step
                 renders a part-completed submission, so how each library draws an
                 empty value is most of what the screen is being asked. */
              children: row.valueKey ? labels[row.valueKey] : row.value,
            }))}
          />
        </Card>
      ))}
    </Space>
  );
}

export function EventWizard(): ReactElement {
  const { labels } = useDemo();
  const [current, setCurrent] = useState(0);
  /*
   * Steps ahead of this are unreachable. Tracked separately from `current` so that
   * stepping back does not re-lock the steps you already completed — which is how
   * DELTA's own wizard behaves, and the reason the design file shows steps 1-3
   * checked while step 4 is active. antd's `Steps` has no notion of "furthest
   * reached": `current` alone would mark step 1 `wait` again as soon as you went
   * back to it. Same two pieces of state as the React Aria pilot.
   */
  const [furthest, setFurthest] = useState(0);

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

  const items: AriaStepItem[] = WIZARD_STEPS.map((entry, index) => {
    const locked = index > furthest;
    return {
      key: entry.id,
      title: labels[entry.labelKey],
      /* `content`, not the deprecated `description`: see the header note. */
      content: labels[entry.optionalityKey],
      /* antd derives `finish`/`process`/`wait` from `current` alone, which would
         un-complete a step you stepped back to. `status` is set explicitly from
         `furthest` so a revisited step still reads as complete. */
      status: index === current ? "process" : index <= furthest ? "finish" : "wait",
      disabled: locked,
      ...(index === current ? { "aria-current": "step" as const } : {}),
      /*
       * MEASURED: a `disabled` antd step gets NO role and NO aria-disabled — only
       * `.ant-steps-item-disabled`. `ariaSnapshot()` on the first draft read
       *
       *   - button "1 Event basics Required"
       *   - text: 2 Linked events Optional 3 Additional details Optional ...
       *
       * i.e. three of the four steps collapsed into one run of unstructured text: a
       * screen-reader user could not tell there were steps ahead, let alone how
       * many. `role="button"` reinstates them as items and makes `aria-disabled`
       * legal (it is not a global attribute, so on a roleless div it is both
       * ignored and invalid). No `tabIndex`, so they stay out of the tab order —
       * readable but unreachable, which is the state the flow actually means. antd
       * supplies neither half of this.
       */
      ...(locked ? { role: "button" as const, "aria-disabled": true } : {}),
    };
  });

  return (
    <Card
      className="demo-wizard"
      style={{ marginTop: "1.5rem" }}
      title={
        <Typography.Title level={3} style={{ margin: 0, fontSize: "1.125rem" }}>
          {labels.wizardTitle}
        </Typography.Title>
      }
    >
      {/*
        * The landmark is ours: antd's Steps root is a bare `div`. `nav` rather than
        * `role="group"` so the indicator is reachable from a screen reader's
        * landmark list, which is how a keyboard user gets back to it from the panel.
        */}
      <nav aria-label={labels.wizardProgressLabel}>
        <Steps
          items={items}
          current={current}
          onChange={go}
          /* Marker above label, as the design file has it. One prop; the pilot
             writes this as `flex-direction: column` plus a re-positioned rail. */
          titlePlacement="vertical"
          /*
           * THE MARKER IS HIDDEN FROM ASSISTIVE TECH, and it took a measurement to
           * find out that it needed to be. antd draws a completed step with
           * `CheckOutlined`, which ships `role="img" aria-label="check"`, so
           * `ariaSnapshot()` on step 2 read
           *
           *   - button "check Event basics Required"
           *
           * — the tick announced as the word "check" in front of the step name, in
           * English, in all four locales. The number has the same problem more
           * quietly: "1 Event basics" says the position twice. Both are decoration
           * beside a button whose text already names the step, so the whole marker
           * is `aria-hidden`, which is what the pilot does with its own `✓`.
           * Completion is carried by `aria-current` / `aria-disabled` instead.
           *
           * `StepIcon` only forwards `aria-*` and `data-*` (`pickAttrs(rest, false)`),
           * so cloning the node antd hands us is the whole fix — but antd has no prop
           * for it, and `iconRender` exists for custom ICONS, not for labelling.
           */
          iconRender={(oriNode) =>
            isValidElement<{ "aria-hidden"?: boolean }>(oriNode)
              ? cloneElement(oriNode, { "aria-hidden": true })
              : oriNode
          }
        />
      </nav>

      {/*
        * Progress, announced. antd has no live region here, and `aria-current` alone
        * is only discoverable by navigating back to the indicator.
        */}
      <p className="demo-visually-hidden" role="status">
        {labels[step.labelKey]} — {current + 1} / {WIZARD_STEPS.length}
      </p>

      <div className="demo-wizard__panel" style={{ marginTop: "1.5rem" }}>
        <Typography.Title level={4} style={{ fontSize: "1rem" }}>
          {labels[step.labelKey]}
        </Typography.Title>
        {isLast ? (
          <ReviewStep />
        ) : (
          <Typography.Paragraph type="secondary" style={{ maxWidth: "60ch" }}>
            {labels.longSubmissionGuidance}
          </Typography.Paragraph>
        )}
      </div>

      <Space className="demo-wizard__actions" wrap style={{ marginTop: "1.5rem" }}>
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
          <Button type="primary">{labels.actionSave}</Button>
        ) : (
          <Button type="primary" onClick={() => go(current + 1)}>
            {labels.actionNext}
          </Button>
        )}
      </Space>
    </Card>
  );
}
