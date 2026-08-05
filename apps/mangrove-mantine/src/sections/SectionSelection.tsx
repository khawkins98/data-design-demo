/**
 * Section 2: select, multiselect and searchable combobox at 8, 40 and 400 items.
 *
 * Mantine's strongest section. `Select`, `MultiSelect` and `Autocomplete` are all
 * single components; `searchable` is a prop, and `MultiSelect` renders removable
 * `Pill`s with no composition at all. React Aria has no multiselect component
 * and needed ListBox + TagGroup wired together.
 *
 * The 400-option lists are NOT virtualised. Mantine's Combobox renders every
 * option; the documented route to virtualisation is to drop to the `Combobox`
 * primitive and supply your own virtualiser. Left unwrapped so the comparison
 * stays like-for-like, and recorded as a performance decision for a human.
 */

import { useState } from "react";
import type { ReactElement } from "react";
import { Autocomplete, MultiSelect, Select, Title } from "@mantine/core";

import { OPTIONS_LARGE, OPTIONS_MEDIUM, OPTIONS_SMALL } from "@undrr-eval/fixtures";
import type { SelectOption } from "@undrr-eval/fixtures";

import { useDemo } from "../demo-state.js";
import { OVERLAY_CLASS } from "../overlay-class.js";

/** Mantine accepts `{ value, label }` directly, so no mapping wrapper is needed. */
function toData(options: readonly SelectOption[]) {
  return options.map((option) => ({ value: option.value, label: option.label }));
}

/** Portalled dropdowns are outside `.demo`, so they carry the overlay class. */
const comboboxProps = { classNames: { dropdown: OVERLAY_CLASS } } as const;

export function SectionSelection(): ReactElement {
  const { labels } = useDemo();
  const [multi, setMulti] = useState<string[]>(["flood", "drought"]);

  return (
    <section id="section-2">
      <Title order={3} mb="md">
        2. Select, multiselect and searchable combobox
      </Title>

      <div className="demo-grid" style={{ marginBottom: "1rem" }}>
        <Select
          label={`${labels.fieldHazard} (8)`}
          data={toData(OPTIONS_SMALL)}
          comboboxProps={comboboxProps}
        />
        <Select
          label={`${labels.fieldDataSource} (40)`}
          data={toData(OPTIONS_MEDIUM)}
          comboboxProps={comboboxProps}
        />
        <Select
          label={`${labels.fieldCountry} (400)`}
          data={toData(OPTIONS_LARGE)}
          comboboxProps={comboboxProps}
        />
      </div>

      {/* combobox-searchable: `searchable` at all three sizes. */}
      <div className="demo-grid" style={{ marginBottom: "1rem" }}>
        <Select
          label={`${labels.actionFilter} (8, searchable)`}
          data={toData(OPTIONS_SMALL)}
          searchable
          clearable
          clearButtonProps={{ "aria-label": labels.actionClearFilters }}
          nothingFoundMessage={labels.stateEmpty}
          comboboxProps={comboboxProps}
        />
        <Select
          label={`${labels.actionFilter} (40, searchable)`}
          data={toData(OPTIONS_MEDIUM)}
          searchable
          clearable
          clearButtonProps={{ "aria-label": labels.actionClearFilters }}
          nothingFoundMessage={labels.stateEmpty}
          comboboxProps={comboboxProps}
        />
        <Autocomplete
          label={`${labels.actionFilter} (400, autocomplete)`}
          data={toData(OPTIONS_LARGE)}
          limit={100}
          comboboxProps={comboboxProps}
        />
      </div>

      {/* multiselect: removable pills come free. */}
      <MultiSelect
        label={`${labels.fieldHazard} (multiselect)`}
        data={toData(OPTIONS_SMALL)}
        value={multi}
        onChange={setMulti}
        searchable
        clearable
        nothingFoundMessage={labels.stateEmpty}
        comboboxProps={comboboxProps}
      />
    </section>
  );
}
