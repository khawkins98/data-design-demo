/**
 * Section 2: select, multiselect and searchable combobox at 8, 40 and 400 items.
 *
 * Carbon has three distinct components where MUI has two and React Aria has one:
 *
 *   Select      a real `<select>` element. Native keyboard behaviour, native
 *               mobile picker, and — the reason it matters here — the 400-option
 *               list costs 400 `<option>` nodes, which the browser handles, not
 *               React. No virtualisation needed because there is no custom
 *               listbox to virtualise.
 *   Dropdown    a custom listbox with Carbon's styling, for when the native
 *               control's appearance is unacceptable.
 *   ComboBox    type-to-filter over a custom listbox.
 *
 * That `Select` is genuinely native is a distinguishing property. MUI's `Select`
 * renders a div-and-popover and mounts 400 `MenuItem` components; Carbon's mounts
 * 400 `<option>`s inside a real `<select>`.
 *
 * MULTISELECT: `MultiSelect` is native and handles the selection, but it shows a
 * COUNT BADGE rather than chips — "3" with a clear-all button, not three
 * removable pills. The brief accepts "removable chips or equivalent", and the
 * badge is arguably the equivalent. The chips below it are composed from
 * `DismissibleTag`, which is Carbon's own component, wired to the same state.
 * So the requirement is `composed`: two Carbon components plus the state that
 * keeps them in step.
 */

import { useMemo, useState } from "react";
import type { ReactElement } from "react";
import { ComboBox, DismissibleTag, MultiSelect, Select, SelectItem } from "@carbon/react";

import { OPTIONS_LARGE, OPTIONS_MEDIUM, OPTIONS_SMALL } from "@undrr-eval/fixtures";
import type { SelectOption } from "@undrr-eval/fixtures";

import { useDemo } from "../demo-state.js";

function OptionSelect({
  id,
  label,
  options,
}: {
  readonly id: string;
  readonly label: string;
  readonly options: readonly SelectOption[];
}): ReactElement {
  const [value, setValue] = useState("");
  return (
    <Select
      id={id}
      labelText={label}
      value={value}
      onChange={(event) => setValue(event.target.value)}
      helperText={`${options.length} options`}
    >
      <SelectItem value="" text="" />
      {options.map((option) => (
        <SelectItem key={option.value} value={option.value} text={option.label} />
      ))}
    </Select>
  );
}

function OptionCombo({
  id,
  label,
  options,
}: {
  readonly id: string;
  readonly label: string;
  readonly options: readonly SelectOption[];
}): ReactElement {
  const items = useMemo(() => [...options], [options]);
  return (
    <ComboBox
      id={id}
      titleText={label}
      items={items}
      itemToString={(item) => item?.label ?? ""}
      placeholder={label}
      /* Carbon filters with a case-sensitive `startsWith` by default, which is
         wrong for a 400-item list of place names. `shouldFilterItem` is the
         documented hook; the predicate itself is ours. */
      shouldFilterItem={({ item, inputValue }) => {
        const query = (inputValue ?? "").trim().toLocaleLowerCase();
        if (!query) return true;
        return item.label.toLocaleLowerCase().includes(query);
      }}
      helperText={`${options.length} options, type to filter`}
      /* Required by the types even for an uncontrolled ComboBox. */
      onChange={() => undefined}
    />
  );
}

export function SectionSelection(): ReactElement {
  const { labels } = useDemo();

  const smallItems = useMemo(() => [...OPTIONS_SMALL], []);
  const [selected, setSelected] = useState<SelectOption[]>(() =>
    OPTIONS_SMALL.filter((_option, index) => index === 0 || index === 2),
  );

  return (
    <section id="section-2" className="demo__section">
      <h3 className="demo__heading">2. Select, multiselect and searchable combobox</h3>

      <div className="demo__grid">
        <OptionSelect id="sel-8" label={`${labels.fieldHazard} (8)`} options={OPTIONS_SMALL} />
        <OptionSelect
          id="sel-40"
          label={`${labels.fieldDataSource} (40)`}
          options={OPTIONS_MEDIUM}
        />
        <OptionSelect id="sel-400" label={`${labels.fieldCountry} (400)`} options={OPTIONS_LARGE} />
      </div>

      <div className="demo__grid">
        <OptionCombo id="combo-8" label={`${labels.actionFilter} (8)`} options={OPTIONS_SMALL} />
        <OptionCombo id="combo-40" label={`${labels.actionFilter} (40)`} options={OPTIONS_MEDIUM} />
        <OptionCombo
          id="combo-400"
          label={`${labels.actionFilter} (400)`}
          options={OPTIONS_LARGE}
        />
      </div>

      <div>
        <MultiSelect
          id="multi-hazard"
          titleText={`${labels.fieldHazard} (multiselect)`}
          label={labels.actionFilter}
          items={smallItems}
          itemToString={(item) => item?.label ?? ""}
          selectedItems={selected}
          onChange={({ selectedItems }) => setSelected([...(selectedItems ?? [])])}
        />

        {/* Composed chips: Carbon's MultiSelect shows a count, not pills. */}
        <div className="demo__row" style={{ marginBlockStart: "var(--undrr-space-2)" }}>
          {selected.map((option) => (
            <DismissibleTag
              key={option.value}
              type="blue"
              text={option.label}
              title={`${labels.actionClearFilters}: ${option.label}`}
              onClose={() =>
                setSelected((current) => current.filter((entry) => entry.value !== option.value))
              }
            />
          ))}
        </div>

        <p className="demo__note">
          Carbon&apos;s MultiSelect renders a selected-count badge rather than
          chips. The removable pills are DismissibleTag components wired to the
          same state — Carbon parts, our wiring.
        </p>
      </div>
    </section>
  );
}
