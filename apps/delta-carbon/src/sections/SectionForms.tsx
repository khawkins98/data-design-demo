/**
 * Section 1: buttons, links, text inputs, validation states, disabled states.
 *
 * Carbon's form controls are the strongest part of this pairing. `TextInput`
 * bundles label, helper text, invalid state, invalid message, warning state and
 * warning message into one component, and — unusually — has a first-class
 * `warn`/`warnText` pair distinct from `invalid`/`invalidText`. Neither MUI nor
 * React Aria offers a warning tier without inventing one.
 *
 * A REAL TRAP FOUND HERE, and it cost a silently blank section before the
 * screenshots were read. Carbon's inputs run every validation prop through
 * `useNormalizedInputProps`, which computes:
 *
 *     invalid: !readOnly && !disabled && invalid
 *     warn:    !readOnly && !invalid && !disabled && warn
 *
 * So `readOnly` SUPPRESSES both `invalid` and `warn`, and it does so silently —
 * the prop is accepted, no warning is logged, and the field simply renders with
 * no error styling, no icon and no message. A read-only Carbon field cannot show
 * a validation error at all. The first version of this section used
 * `value` + `readOnly` to pin the fixture inputs, exactly as the MUI run does
 * with `slotProps={{ input: { readOnly: true } }}`, and every one of the four
 * validation states rendered blank. `defaultValue` is used instead.
 *
 * That is a defensible design decision by Carbon — a field the user cannot edit
 * arguably should not be blamed — but it is a behavioural difference from both
 * MUI and React Aria, and it is not called out in the prop documentation.
 *
 * `server-rejected` is still not a library concept. Carbon has `InlineNotification`
 * and `ActionableNotification` for form-level messaging, which is more than MUI's
 * `Alert` gives you semantically (Carbon sets `role="status"` / `role="alert"` and
 * a title/subtitle structure), but the wiring between "the server said no" and
 * "this field is invalid" is ours.
 */

import { useState } from "react";
import type { ReactElement } from "react";
import { Button, InlineNotification, Link, Select, SelectItem, TextInput } from "@carbon/react";

import { OPTIONS_SMALL, VALIDATION_CASES } from "@undrr-eval/fixtures";

import { useDemo } from "../demo-state.js";

export function SectionForms(): ReactElement {
  const { labels } = useDemo();
  const [serverRejected, setServerRejected] = useState(false);

  const caseFor = (kind: string) => VALIDATION_CASES.find((entry) => entry.kind === kind);
  const required = caseFor("required-empty");
  const format = caseFor("format-invalid");
  const range = caseFor("out-of-range");
  const server = caseFor("server-rejected");

  return (
    <section id="section-1" className="demo__section">
      <h3 className="demo__heading">1. Buttons, links, inputs and validation</h3>

      <div className="demo__row">
        <Button kind="primary">{labels.actionSave}</Button>
        <Button kind="secondary">{labels.actionCancel}</Button>
        <Button kind="tertiary">{labels.actionFilter}</Button>
        <Button kind="danger">{labels.actionDelete}</Button>
        <Button kind="ghost">{labels.actionClearFilters}</Button>
        <Button kind="secondary" disabled>
          {labels.actionExport}
        </Button>
      </div>

      <p className="demo__prose">
        Long labels are fixture content and must render untouched:{" "}
        <Link href="#section-1" inline>
          {labels.longAccessibilityNotice}
        </Link>
      </p>

      <div className="demo__grid">
        <TextInput
          id="form-country"
          labelText={labels.fieldCountry}
          defaultValue="Bangladesh"
          helperText={labels.longSubmissionGuidance}
        />

        {/*
          required-empty.

          THE EXPLICIT `aria-describedby` IS THE FIX FOR A CARBON DEFECT, and its
          absence here was ours alone: `apps/mangrove-carbon/src/sections/
          SectionForms.tsx` has carried it since that section was written, against
          the same @carbon/react version, and this twin never got it.

          On an invalid field Carbon sets `aria-errormessage="<id>-error-msg"` and
          renders the message in a `.cds--form-requirement` with that id — but adds
          no `role="alert"`, no `aria-live` and no `aria-describedby`. axe's
          `aria-valid-attr-value` rule requires an `aria-errormessage` target to be
          reachable one of those three ways, so every invalid field reports a
          CRITICAL violation. Carbon exposes no prop for it; duplicating the
          reference through `aria-describedby` works only because `...rest` is
          spread last in Carbon's `sharedTextInputProps`, and only if you know the
          id is derived as `${id}-error-msg`. Both are internals.

          NOT applied to the `warn` field below: Carbon's own `warnProps` already
          sets `aria-describedby="<id>-warn-msg"` there, and passing ours would
          overwrite it through the same `...rest` spread.
        */}
        <TextInput
          id="form-required"
          aria-describedby="form-required-error-msg"
          labelText={labels.fieldDataSource}
          defaultValue=""
          invalid
          invalidText={required ? labels[required.messageKey] : ""}
        />

        {/* format-invalid */}
        <TextInput
          id="form-format"
          aria-describedby="form-format-error-msg"
          labelText={labels.fieldEventDate}
          defaultValue={format?.input ?? ""}
          invalid
          invalidText={format ? labels[format.messageKey] : ""}
        />

        {/* out-of-range. Rendered with Carbon's `warn` tier rather than `invalid`,
            because a value in the right shape but out of bounds is exactly the
            distinction Carbon's second tier exists for. Nothing forced this — it
            is a genuine affordance the other candidates do not have. */}
        <TextInput
          id="form-range"
          labelText={labels.colPeopleAffected}
          defaultValue={range?.input ?? ""}
          warn
          warnText={range ? labels[range.messageKey] : ""}
        />

        <TextInput
          id="form-disabled"
          labelText={labels.fieldNarrative}
          defaultValue="Sendai Framework Monitor"
          disabled
          helperText="Disabled state"
        />

        <Select
          id="form-disabled-select"
          labelText={labels.fieldHazard}
          disabled
          defaultValue={OPTIONS_SMALL[0]?.value ?? ""}
        >
          {OPTIONS_SMALL.map((option) => (
            <SelectItem key={option.value} value={option.value} text={option.label} />
          ))}
        </Select>
      </div>

      {/* server-rejected: no library channel, so this is our own state. */}
      <form
        id="server-form"
        onSubmit={(event) => {
          event.preventDefault();
          setServerRejected(true);
        }}
        style={{
          padding: "var(--undrr-space-4)",
          border: "1px solid var(--undrr-color-border)",
          borderRadius: "var(--undrr-radius-md)",
        }}
      >
        {/*
          Same fix, but CONDITIONAL: the `.cds--form-requirement` only exists while
          `invalid` is true, so an unconditional `aria-describedby` would point at an
          unmounted node — the same class of defect as a stale `aria-controls`.
        */}
        <TextInput
          id="form-server"
          {...(serverRejected ? { "aria-describedby": "form-server-error-msg" } : {})}
          labelText={labels.fieldDataSource}
          defaultValue={server?.input ?? ""}
          invalid={serverRejected}
          invalidText={serverRejected && server ? labels[server.messageKey] : ""}
        />

        <div className="demo__row" style={{ marginBlockStart: "var(--undrr-space-4)" }}>
          <Button type="submit" kind="primary">
            {labels.actionSave}
          </Button>
          <Button kind="secondary" type="button" onClick={() => setServerRejected(false)}>
            {labels.actionCancel}
          </Button>
        </div>

        {serverRejected ? (
          <InlineNotification
            kind="error"
            lowContrast
            title={labels.stateError}
            subtitle={server ? labels[server.messageKey] : ""}
            hideCloseButton
          />
        ) : null}
      </form>
    </section>
  );
}
