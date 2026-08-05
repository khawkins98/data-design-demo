/**
 * Section 2: select, multiselect and searchable combobox at 8, 40 and 400 items.
 *
 * The 400-item lists are the point of this section. React Aria's ListBox
 * virtualises only when wrapped in a Virtualizer; plain ListBox renders all 400
 * DOM nodes. Both are documented, and which one a library makes easy matters —
 * so this uses the plain form and the finding is recorded rather than hidden
 * behind an optimisation the other candidates may not have.
 */

import { useState } from "react";
import type { ReactElement } from "react";
import {
  Button,
  ComboBox,
  Input,
  Label,
  ListBox,
  ListBoxItem,
  Popover,
  Select,
  SelectValue,
  Tag,
  TagGroup,
  TagList,
} from "react-aria-components";
import type { Selection } from "react-aria-components";

import { OPTIONS_LARGE, OPTIONS_MEDIUM, OPTIONS_SMALL } from "@undrr-eval/fixtures";
import type { SelectOption } from "@undrr-eval/fixtures";

import { useDemo } from "../demo-state.js";
import { POPOVER_CLASS } from "../overlay-class.js";

function OptionSelect({
  label,
  options,
}: {
  readonly label: string;
  readonly options: readonly SelectOption[];
}): ReactElement {
  return (
    <Select className="demo-field">
      <Label className="demo-label">{label}</Label>
      <Button className="demo-select__trigger">
        <SelectValue className="demo-select__value" />
        <span aria-hidden="true">▾</span>
      </Button>
      <Popover className={POPOVER_CLASS}>
        <ListBox className="demo-listbox" items={options}>
          {(item) => (
            <ListBoxItem
              id={item.value}
              textValue={item.label}
              className="demo-listbox__item"
            >
              {item.label}
            </ListBoxItem>
          )}
        </ListBox>
      </Popover>
    </Select>
  );
}

function OptionComboBox({
  label,
  options,
}: {
  readonly label: string;
  readonly options: readonly SelectOption[];
}): ReactElement {
  return (
    <ComboBox className="demo-field" defaultItems={options} allowsEmptyCollection>
      <Label className="demo-label">{label}</Label>
      <div className="demo-combobox__control">
        <Input className="demo-input" />
        <Button className="demo-combobox__button" aria-label="Show suggestions">
          ▾
        </Button>
      </div>
      <Popover className={POPOVER_CLASS}>
        <ListBox className="demo-listbox">
          {(item: SelectOption) => (
            <ListBoxItem
              id={item.value}
              textValue={item.label}
              className="demo-listbox__item"
            >
              {item.label}
            </ListBoxItem>
          )}
        </ListBox>
      </Popover>
    </ComboBox>
  );
}

export function SectionSelection(): ReactElement {
  const { labels } = useDemo();
  const [selected, setSelected] = useState<Selection>(new Set(["flood", "drought"]));

  const selectedOptions = OPTIONS_SMALL.filter(
    (option) => selected !== "all" && selected.has(option.value),
  );

  return (
    <section className="demo-section" id="section-2" aria-labelledby="s2">
      <h3 className="demo-section__title" id="s2">
        2. Select, multiselect and searchable combobox
      </h3>

      <div className="demo-grid">
        <OptionSelect label={`${labels.fieldHazard} (8)`} options={OPTIONS_SMALL} />
        <OptionSelect label={`${labels.fieldDataSource} (40)`} options={OPTIONS_MEDIUM} />
        <OptionSelect label={`${labels.fieldCountry} (400)`} options={OPTIONS_LARGE} />
      </div>

      <div className="demo-grid">
        <OptionComboBox label={`${labels.actionFilter} (8)`} options={OPTIONS_SMALL} />
        <OptionComboBox label={`${labels.actionFilter} (40)`} options={OPTIONS_MEDIUM} />
        <OptionComboBox label={`${labels.actionFilter} (400)`} options={OPTIONS_LARGE} />
      </div>

      {/*
        Multiselect. React Aria has no single "multi select" component: the
        documented pattern is a ListBox with selectionMode="multiple" paired
        with a TagGroup for the removable chips. Composed, not native.
      */}
      <div className="demo-field">
        <Label className="demo-label" id="multiselect-label">
          {labels.fieldHazard} (multiselect)
        </Label>
        <ListBox
          className="demo-listbox demo-listbox--inline"
          aria-labelledby="multiselect-label"
          selectionMode="multiple"
          selectedKeys={selected}
          onSelectionChange={setSelected}
          items={OPTIONS_SMALL}
        >
          {(item) => (
            <ListBoxItem id={item.value} textValue={item.label} className="demo-listbox__item">
              {item.label}
            </ListBoxItem>
          )}
        </ListBox>

        <TagGroup
          className="demo-taggroup"
          aria-label="Selected hazard types"
          onRemove={(keys) => {
            const next = new Set(selected === "all" ? [] : selected);
            for (const key of keys) next.delete(key);
            setSelected(next);
          }}
        >
          <TagList className="demo-taglist" items={selectedOptions}>
            {(item) => (
              <Tag id={item.value} textValue={item.label} className="demo-tag">
                {item.label}
                <Button slot="remove" className="demo-tag__remove" aria-label="Remove">
                  ×
                </Button>
              </Tag>
            )}
          </TagList>
        </TagGroup>
      </div>
    </section>
  );
}
