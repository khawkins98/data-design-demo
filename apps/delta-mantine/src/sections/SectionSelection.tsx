/**
 * Section 2: select, multiselect and searchable combobox at 8, 40 and 400 items.
 *
 * Mantine is at its strongest here. `Select` takes `data` and a `searchable`
 * boolean; `MultiSelect` gives removable pills with no render prop; `Autocomplete`
 * is free-text with suggestions. Everything in this section is one component and
 * a prop.
 *
 * The one thing to know: at 400 options Mantine renders all 400 `Combobox.Option`
 * nodes. There is no virtualisation in `@mantine/core` — the documented answer is
 * `limit`, which caps how many are RENDERED but is applied after filtering, so
 * the full list is still walked on every keystroke. `limit` is set below; whether
 * that is acceptable at 400 is a performance judgement, not a capability gap.
 */

import { useState } from "react";
import type { ReactElement } from "react";
import { Autocomplete, Box, MultiSelect, Select, SimpleGrid, Title } from "@mantine/core";

import { OPTIONS_LARGE, OPTIONS_MEDIUM, OPTIONS_SMALL } from "@undrr-eval/fixtures";
import type { SelectOption } from "@undrr-eval/fixtures";

import { useDemo } from "../demo-state.js";
import { useComboboxPortalProps } from "../overlay-class.js";

/** Fixture options are readonly; Mantine's `data` prop wants a mutable array. */
function toData(options: readonly SelectOption[]) {
  return options.map((option) => ({ value: option.value, label: option.label }));
}

export function SectionSelection(): ReactElement {
  const { labels } = useDemo();
  const comboboxProps = useComboboxPortalProps();
  const [multi, setMulti] = useState<string[]>([
    OPTIONS_SMALL[0]?.value ?? "",
    OPTIONS_SMALL[2]?.value ?? "",
  ]);

  return (
    <Box component="section" id="section-2" mb="s16">
      <Title order={3} mb="md">
        2. Select, multiselect and searchable combobox
      </Title>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md" mb="md">
        <Select
          label={`${labels.fieldHazard} (8)`}
          data={toData(OPTIONS_SMALL)}
          placeholder={labels.actionFilter}
          comboboxProps={comboboxProps}
        />
        <Select
          label={`${labels.fieldDataSource} (40)`}
          data={toData(OPTIONS_MEDIUM)}
          placeholder={labels.actionFilter}
          comboboxProps={comboboxProps}
        />
        <Select
          label={`${labels.fieldCountry} (400)`}
          data={toData(OPTIONS_LARGE)}
          placeholder={labels.actionFilter}
          comboboxProps={comboboxProps}
        />
      </SimpleGrid>

      {/* Type-to-filter at all three sizes. `searchable` is the whole feature. */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md" mb="md">
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
        <Select
          label={`${labels.actionFilter} (400, searchable)`}
          data={toData(OPTIONS_LARGE)}
          searchable
          clearable
          limit={100}
          nothingFoundMessage={labels.stateEmpty}
          comboboxProps={comboboxProps}
        />
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
        {/* Removable pills with a clear-all, no render prop needed. */}
        <MultiSelect
          label={`${labels.fieldHazard} (multiselect)`}
          data={toData(OPTIONS_SMALL)}
          value={multi}
          onChange={setMulti}
          searchable
          clearable
          clearButtonProps={{ "aria-label": labels.actionClearFilters }}
          nothingFoundMessage={labels.stateEmpty}
          comboboxProps={comboboxProps}
        />

        {/* Free-text with suggestions, which Select cannot do. */}
        <Autocomplete
          label={`${labels.fieldCountry} (autocomplete, 400)`}
          data={toData(OPTIONS_LARGE)}
          limit={100}
          placeholder={labels.actionFilter}
          comboboxProps={comboboxProps}
        />
      </SimpleGrid>
    </Box>
  );
}
