/**
 * Section 1: buttons, links, text inputs, validation states, disabled states.
 *
 * React Aria's validation story is built on the native Constraint Validation
 * API: `isInvalid` plus `<FieldError>` renders the message and wires
 * aria-describedby and aria-invalid automatically. The server-rejected case is
 * the interesting one, because it has no client-side trigger — it is driven by
 * `validationErrors` on a Form, which is the documented route for errors that
 * only the server knows about.
 *
 * On this host Tailwind Preflight is the thing to watch. `button` loses its
 * border, padding, background and radius; `a` loses its colour and underline;
 * `p` loses its margins. Every one of those has to be restated in theme.css
 * before the section looks like anything. None of it is a React Aria concern —
 * the components render the classes we hand them — but it is the reason this
 * demo's stylesheet is larger than its Mangrove twin's.
 */

import { useState } from "react";
import type { ReactElement } from "react";
import {
  Button,
  FieldError,
  Form,
  Input,
  Label,
  Link,
  Text,
  TextField,
} from "react-aria-components";

import { VALIDATION_CASES } from "@undrr-eval/fixtures";

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

      <div className="demo-row">
        <Button className="demo-button demo-button--primary">{labels.actionSave}</Button>
        <Button className="demo-button">{labels.actionCancel}</Button>
        <Button className="demo-button demo-button--danger">{labels.actionDelete}</Button>
        <Button className="demo-button" isDisabled>
          {labels.actionExport}
        </Button>
      </div>

      {/*
        The link needs an explicit colour and underline in theme.css: Preflight
        resets `a { color: inherit; text-decoration: inherit }`, so an unstyled
        Link renders as body text. Delta's own canary link carries Tailwind
        utilities to undo the same reset, so this is host-consistent rather than
        a candidate deficiency.
      */}
      <p className="demo-prose">
        Long labels are fixture content and must render untouched:{" "}
        <Link className="demo-link" href="#section-1">
          {labels.longAccessibilityNotice}
        </Link>
      </p>

      <div className="demo-grid">
        {/* Valid baseline, with hint text. */}
        <TextField className="demo-field">
          <Label className="demo-label">{labels.fieldCountry}</Label>
          <Input className="demo-input" defaultValue="Bangladesh" />
          <Text slot="description" className="demo-hint">
            {labels.longSubmissionGuidance}
          </Text>
        </TextField>

        {/* required-empty */}
        <TextField className="demo-field" isRequired isInvalid value="">
          <Label className="demo-label">{labels.fieldDataSource}</Label>
          <Input className="demo-input" readOnly />
          <FieldError className="demo-error">
            {required ? labels[required.messageKey] : ""}
          </FieldError>
        </TextField>

        {/* format-invalid */}
        <TextField className="demo-field" isInvalid value={format?.input ?? ""}>
          <Label className="demo-label">{labels.fieldEventDate}</Label>
          <Input className="demo-input" readOnly />
          <FieldError className="demo-error">
            {format ? labels[format.messageKey] : ""}
          </FieldError>
        </TextField>

        {/* out-of-range */}
        <TextField className="demo-field" isInvalid value={range?.input ?? ""}>
          <Label className="demo-label">{labels.colPeopleAffected}</Label>
          <Input className="demo-input" readOnly inputMode="numeric" />
          <FieldError className="demo-error">
            {range ? labels[range.messageKey] : ""}
          </FieldError>
        </TextField>

        {/* Disabled */}
        <TextField className="demo-field" isDisabled value="Sendai Framework Monitor">
          <Label className="demo-label">{labels.fieldNarrative}</Label>
          <Input className="demo-input" />
          <Text slot="description" className="demo-hint">
            Disabled state
          </Text>
        </TextField>
      </div>

      {/*
        server-rejected. Form-level `validationErrors` is React Aria's documented
        channel for errors the client cannot detect, and it routes the message to
        the named field's FieldError without any custom wiring.
      */}
      <Form
        className="demo-form"
        validationErrors={
          serverRejected && server ? { dataSource: labels[server.messageKey] } : {}
        }
        onSubmit={(event) => {
          event.preventDefault();
          setServerRejected(true);
        }}
      >
        <TextField className="demo-field" name="dataSource">
          <Label className="demo-label">{labels.fieldDataSource}</Label>
          <Input className="demo-input" defaultValue={server?.input ?? ""} />
          <FieldError className="demo-error" />
        </TextField>
        <div className="demo-row">
          <Button type="submit" className="demo-button demo-button--primary">
            {labels.actionSave}
          </Button>
          <Button className="demo-button" onPress={() => setServerRejected(false)}>
            {labels.actionCancel}
          </Button>
        </div>
        {serverRejected ? (
          <p className="demo-status demo-status--error" role="status">
            {server ? labels[server.messageKey] : ""}
          </p>
        ) : null}
      </Form>
    </section>
  );
}
