/**
 * Section 2: select, multiselect and searchable combobox at 8, 40 and 400 items.
 *
 * antd collapses all three requirements onto one component. `Select` takes
 * `showSearch` for the combobox and `mode="multiple"` for multiselect, both as
 * props, and ships `virtual` list rendering ON BY DEFAULT - so the 400-option
 * case needs no `filterOptions` limiting of the kind the MUI run had to add, and
 * no virtualisation library of the kind React Aria needed.
 *
 * `optionFilterProp="label"` is required and easy to miss: antd filters on
 * `value` by default, so a searchable select over these fixtures would silently
 * match nothing useful, because the fixture values are slugs and the labels are
 * the translated text. Recorded as a trap rather than fixed silently.
 */

import { useState } from "react";
import type { ReactElement } from "react";
import { Form, Select, Typography } from "antd";

import { OPTIONS_LARGE, OPTIONS_MEDIUM, OPTIONS_SMALL } from "@undrr-eval/fixtures";
import type { SelectOption } from "@undrr-eval/fixtures";

import { useDemo } from "../demo-state.js";

/** antd wants `{ value, label }`, which is the fixture shape already. */
const toOptions = (options: readonly SelectOption[]) =>
  options.map((o) => ({ value: o.value, label: o.label }));

function OptionSelect({
  label,
  options,
  id,
}: {
  readonly label: string;
  readonly options: readonly SelectOption[];
  readonly id: string;
}): ReactElement {
  const [value, setValue] = useState<string | undefined>(undefined);
  return (
    <Form.Item label={label} htmlFor={id}>
      <Select
        id={id}
        value={value}
        onChange={setValue}
        options={toOptions(options)}
        listHeight={320}
        style={{ width: "100%" }}
      />
    </Form.Item>
  );
}

function OptionCombo({
  label,
  options,
  id,
}: {
  readonly label: string;
  readonly options: readonly SelectOption[];
  readonly id: string;
}): ReactElement {
  const [value, setValue] = useState<string | undefined>(undefined);
  return (
    <Form.Item label={label} htmlFor={id}>
      <Select
        id={id}
        showSearch
        // Without this antd filters on `value`, i.e. the slug, not the label.
        optionFilterProp="label"
        value={value}
        onChange={setValue}
        options={toOptions(options)}
        listHeight={320}
        style={{ width: "100%" }}
      />
    </Form.Item>
  );
}

function OptionMulti({
  label,
  options,
  id,
}: {
  readonly label: string;
  readonly options: readonly SelectOption[];
  readonly id: string;
}): ReactElement {
  const [value, setValue] = useState<string[]>([]);
  return (
    <Form.Item label={label} htmlFor={id}>
      <Select
        id={id}
        mode="multiple"
        showSearch
        optionFilterProp="label"
        value={value}
        onChange={setValue}
        options={toOptions(options)}
        listHeight={320}
        style={{ width: "100%" }}
      />
    </Form.Item>
  );
}

export function SectionSelection(): ReactElement {
  const { labels } = useDemo();

  return (
    <section id="section-2" style={{ marginBottom: "4rem" }}>
      <Typography.Title level={3} style={{ marginBottom: "1.5rem" }}>
        2. Selects, multiselect and searchable combobox
      </Typography.Title>

      <Form
        layout="vertical"
        style={{
          display: "grid",
          gap: "0.5rem 1.5rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(15rem, 1fr))",
        }}
      >
        <OptionSelect id="select-small" label={`${labels.fieldHazard} (8)`} options={OPTIONS_SMALL} />
        <OptionSelect
          id="select-medium"
          label={`${labels.fieldCountry} (40)`}
          options={OPTIONS_MEDIUM}
        />
        <OptionSelect
          id="select-large"
          label={`${labels.fieldDataSource} (400)`}
          options={OPTIONS_LARGE}
        />
        <OptionCombo
          id="combobox-searchable"
          label={`${labels.fieldCountry} (search, 400)`}
          options={OPTIONS_LARGE}
        />
        <OptionMulti
          id="multiselect"
          label={`${labels.fieldHazard} (multiple)`}
          options={OPTIONS_MEDIUM}
        />
      </Form>
    </section>
  );
}
