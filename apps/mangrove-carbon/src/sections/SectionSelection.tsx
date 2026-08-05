/**
 * Section 2: select, multiselect and searchable combobox at 8, 40 and 400 items.
 *
 * Carbon has three separate single-selection components and the choice between
 * them matters:
 *
 *   Select     wraps a NATIVE <select>. Free virtualisation, free mobile UI,
 *              free type-ahead, but no custom option rendering.
 *   Dropdown   a listbox built on Downshift. Styled, no native fallback.
 *   ComboBox   Dropdown plus a text input that filters as you type.
 *
 * This section shows `Dropdown` at all three sizes, because that is the
 * like-for-like comparison with the other candidates' non-native selects. The
 * native `Select` appears in section 1 (disabled state) and inside Carbon's own
 * Pagination in section 6.
 *
 * None of the three virtualise: 400 items means 400 DOM nodes, the same result
 * the React Aria and MUI runs recorded.
 */

import { useState } from "react";
import type { ReactElement } from "react";
import { ComboBox, DismissibleTag, Dropdown, MultiSelect } from "@carbon/react";

import { OPTIONS_LARGE, OPTIONS_MEDIUM, OPTIONS_SMALL } from "@undrr-eval/fixtures";
import type { SelectOption } from "@undrr-eval/fixtures";

import { useDemo } from "../demo-state.js";

/** Carbon's list-box components want an item->string function, not a value key. */
const itemToString = (item: SelectOption | null): string => item?.label ?? "";

function OptionDropdown({
  id,
  label,
  options,
}: {
  readonly id: string;
  readonly label: string;
  readonly options: readonly SelectOption[];
}): ReactElement {
  return (
    <Dropdown<SelectOption>
      id={id}
      titleText={label}
      label="Select one"
      items={[...options]}
      itemToString={itemToString}
      {...(options[0] ? { initialSelectedItem: options[0] } : {})}
    />
  );
}

function OptionComboBox({
  id,
  label,
  options,
}: {
  readonly id: string;
  readonly label: string;
  readonly options: readonly SelectOption[];
}): ReactElement {
  return (
    /*
      No `shouldFilterItem` supplied: Carbon's default predicate is a
      case-insensitive substring match on `itemToString`, so type-to-filter works
      out of the box at all three sizes.
    */
    <ComboBox<SelectOption>
      id={id}
      titleText={label}
      placeholder="Type to filter"
      items={[...options]}
      itemToString={itemToString}
      onChange={() => undefined}
    />
  );
}

export function SectionSelection(): ReactElement {
  const { labels } = useDemo();
  const [selected, setSelected] = useState<readonly SelectOption[]>(() =>
    OPTIONS_SMALL.filter(
      (option) => option.value === "flood" || option.value === "drought",
    ),
  );

  return (
    <section className="demo-section" id="section-2" aria-labelledby="s2">
      <h3 className="demo-section__title" id="s2">
        2. Select, multiselect and searchable combobox
      </h3>

      <div className="demo-grid">
        <OptionDropdown
          id="select-small"
          label={`${labels.fieldHazard} (8)`}
          options={OPTIONS_SMALL}
        />
        <OptionDropdown
          id="select-medium"
          label={`${labels.fieldDataSource} (40)`}
          options={OPTIONS_MEDIUM}
        />
        <OptionDropdown
          id="select-large"
          label={`${labels.fieldCountry} (400)`}
          options={OPTIONS_LARGE}
        />
      </div>

      <div className="demo-grid">
        <OptionComboBox
          id="combobox-small"
          label={`${labels.actionFilter} (8)`}
          options={OPTIONS_SMALL}
        />
        <OptionComboBox
          id="combobox-medium"
          label={`${labels.actionFilter} (40)`}
          options={OPTIONS_MEDIUM}
        />
        <OptionComboBox
          id="combobox-large"
          label={`${labels.actionFilter} (400)`}
          options={OPTIONS_LARGE}
        />
      </div>

      {/*
        Multiselect is a single native component, which is a genuine difference
        from React Aria: checkboxes in the list, a count badge on the trigger and
        a clear-all control, all supplied. The removable chips the requirement
        mentions are NOT part of it — Carbon shows selections as a count, not as
        chips — so the DismissibleTag row below is ours. Hence `composed`.
      */}
      <div className="demo-field">
        <MultiSelect<SelectOption>
          id="multiselect"
          titleText={`${labels.fieldHazard} (multiselect)`}
          label="Select hazard types"
          items={[...OPTIONS_SMALL]}
          itemToString={itemToString}
          selectedItems={[...selected]}
          onChange={({ selectedItems }) => setSelected(selectedItems ?? [])}
        />

        <div className="demo-chips" role="group" aria-label="Selected hazard types">
          {selected.map((item) => (
            <DismissibleTag
              key={item.value}
              type="blue"
              text={item.label}
              title="Remove"
              className="demo-chip"
              onClose={() =>
                setSelected(selected.filter((entry) => entry.value !== item.value))
              }
            />
          ))}
        </div>
      </div>
    </section>
  );
}
