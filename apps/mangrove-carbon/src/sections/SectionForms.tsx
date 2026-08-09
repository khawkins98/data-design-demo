/**
 * Section 1: buttons, links, text inputs, validation states, disabled states.
 *
 * Carbon's form fields carry their own validation UI: `invalid` + `invalidText`
 * renders the message, sets `aria-invalid` and wires `aria-describedby`, and
 * there is a separate `warn` + `warnText` pair for the softer case. That covers
 * three of the four VALIDATION_CASES with no wiring at all.
 *
 * `server-rejected` is the interesting one, because it has no client trigger.
 * Carbon has no form-level error channel — no `<Form validationErrors>`, no
 * field registry — so the message has to be lifted into application state and
 * passed back down as `invalid`/`invalidText`, plus an `InlineNotification` for
 * the form-level summary. That is composed, not native.
 */

import { useState } from "react";
import type { ReactElement } from "react";
import {
  Button,
  Form,
  InlineNotification,
  Link,
  Select,
  SelectItem,
  Stack,
  TextInput,
} from "@carbon/react";

import { OPTIONS_SMALL, VALIDATION_CASES } from "@undrr-eval/fixtures";

import { useDemo } from "../demo-state.js";

export function SectionForms(): ReactElement {
  const { labels } = useDemo();
  const [serverRejected, setServerRejected] = useState(false);

  const required = VALIDATION_CASES.find((c) => c.kind === "required-empty");
  const format = VALIDATION_CASES.find((c) => c.kind === "format-invalid");
  const range = VALIDATION_CASES.find((c) => c.kind === "out-of-range");
  const server = VALIDATION_CASES.find((c) => c.kind === "server-rejected");

  return (
    <section className="demo-section" id="section-1" aria-labelledby="s1">
      <h3 className="demo-section__title" id="s1">
        1. Buttons, links, inputs and validation
      </h3>

      {/* Carbon's button variants are a `kind` prop, not a class: primary,
          secondary, tertiary, ghost, danger. Disabled is a boolean. */}
      <div className="demo-row">
        <Button kind="primary">{labels.actionSave}</Button>
        <Button kind="secondary">{labels.actionCancel}</Button>
        <Button kind="danger">{labels.actionDelete}</Button>
        <Button kind="tertiary" disabled>
          {labels.actionExport}
        </Button>
      </div>

      <p className="demo-prose">
        Long labels are fixture content and must render untouched:{" "}
        <Link href="#section-1">{labels.longAccessibilityNotice}</Link>. Carbon
        underlines inline links on hover and focus only, the same WCAG 1.4.1 gap
        the Mangrove host has; the theme adds a permanent underline inside{" "}
        <code>.demo</code>.
      </p>

      <div className="demo-grid">
        {/* Valid baseline, with hint text. */}
        <TextInput
          id="forms-country"
          labelText={labels.fieldCountry}
          defaultValue="Bangladesh"
          helperText={labels.longSubmissionGuidance}
        />

        {/*
          required-empty.

          NOT `readOnly`. Carbon's `useNormalizedInputProps` computes
          `invalid: !readOnly && !disabled && invalid`, so marking a field
          read-only SILENTLY DISCARDS the invalid state — no red outline, no
          warning icon, no `.cds--form-requirement` message, no `aria-invalid`.
          The first version of this section used `value` + `readOnly` to pin the
          fixture inputs and rendered four fields that looked perfectly valid.
          Nothing warns you; the prop is simply ignored. Found by looking at a
          screenshot. Fields are `defaultValue` instead.

          The explicit `aria-describedby` is a second Carbon defect, also found by
          measurement rather than reading. On an invalid field Carbon sets
          `aria-errormessage="<id>-error-msg"` and renders the message in a
          `.cds--form-requirement` with that id — but it adds no `role="alert"`,
          no `aria-live`, and no `aria-describedby`. axe's `aria-valid-attr-value`
          rule requires an `aria-errormessage` target to be reachable one of those
          ways, so all three invalid fields reported a CRITICAL violation. Carbon
          exposes no prop for it; the fix is to duplicate the reference through
          `aria-describedby`, which works only because `...rest` is spread last in
          Carbon's `sharedTextInputProps`, and only if you know that the id is
          derived as `${id}-error-msg`. Both are internals.
        */}
        <TextInput
          id="forms-required"
          aria-describedby="forms-required-error-msg"
          labelText={labels.fieldDataSource}
          defaultValue=""
          invalid
          invalidText={required ? labels[required.messageKey] : ""}
        />

        {/* format-invalid */}
        <TextInput
          id="forms-format"
          aria-describedby="forms-format-error-msg"
          labelText={labels.fieldEventDate}
          defaultValue={format?.input ?? ""}
          invalid
          invalidText={format ? labels[format.messageKey] : ""}
        />

        {/* out-of-range */}
        <TextInput
          id="forms-range"
          aria-describedby="forms-range-error-msg"
          labelText={labels.colPeopleAffected}
          defaultValue={range?.input ?? ""}
          invalid
          invalidText={range ? labels[range.messageKey] : ""}
        />

        {/* Disabled input, disabled select. The disabled button is above. */}
        <TextInput
          id="forms-disabled"
          labelText={labels.fieldNarrative}
          defaultValue="Sendai Framework Monitor"
          helperText="Disabled state"
          disabled
        />

        <Select
          id="forms-disabled-select"
          labelText={labels.fieldHazard}
          helperText="Disabled state"
          defaultValue="flood"
          disabled
        >
          {OPTIONS_SMALL.map((option) => (
            <SelectItem key={option.value} value={option.value} text={option.label} />
          ))}
        </Select>
      </div>

      {/*
        server-rejected. Carbon's `Form` is a thin <form> wrapper with no
        validation state of its own, so the round trip is application code: hold
        the rejection in useState, feed it back as `invalid`/`invalidText`, and
        render the summary as an InlineNotification. Composed.
      */}
      <Form
        className="demo-form"
        onSubmit={(event) => {
          event.preventDefault();
          setServerRejected(true);
        }}
      >
        <Stack gap={5}>
          {/*
            Same `aria-describedby` fix as the three fields above, but CONDITIONAL:
            the `.cds--form-requirement` only exists while `invalid` is true, so an
            unconditional reference would point at an unmounted node.
          */}
          <TextInput
            id="forms-server"
            {...(serverRejected ? { "aria-describedby": "forms-server-error-msg" } : {})}
            name="dataSource"
            labelText={labels.fieldDataSource}
            defaultValue={server?.input ?? ""}
            invalid={serverRejected}
            invalidText={server ? labels[server.messageKey] : ""}
          />

          {serverRejected ? (
            <InlineNotification
              kind="error"
              lowContrast
              title={labels.stateError}
              subtitle={server ? labels[server.messageKey] : ""}
              onCloseButtonClick={() => setServerRejected(false)}
            />
          ) : null}

          <div className="demo-row">
            <Button type="submit" kind="primary">
              {labels.actionSave}
            </Button>
            <Button kind="secondary" onClick={() => setServerRejected(false)}>
              {labels.actionCancel}
            </Button>
          </div>
        </Stack>
      </Form>
    </section>
  );
}
