/**
 * Section 2: select, multiselect and searchable combobox at 8, 40 and 400 items.
 *
 * MUI's `Autocomplete` is genuinely strong here: searchable, multiple-select
 * with removable chips, and virtualisation-free handling of 400 options via
 * `filterOptions` limiting. Multiselect is a prop, not a composition — the
 * opposite of React Aria, which has no multiselect component at all.
 */

import { useState } from "react";
import type { ReactElement } from "react";
import {
  Autocomplete,
  Box,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@mui/material";

import { OPTIONS_LARGE, OPTIONS_MEDIUM, OPTIONS_SMALL } from "@undrr-eval/fixtures";
import type { SelectOption } from "@undrr-eval/fixtures";

import { useDemo } from "../demo-state.js";

function OptionSelect({
  label,
  options,
  id,
}: {
  readonly label: string;
  readonly options: readonly SelectOption[];
  readonly id: string;
}): ReactElement {
  const [value, setValue] = useState("");
  return (
    <FormControl fullWidth>
      <InputLabel id={`${id}-label`}>{label}</InputLabel>
      <Select
        labelId={`${id}-label`}
        id={id}
        label={label}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        MenuProps={{ slotProps: { paper: { sx: { maxHeight: 320 } } } }}
      >
        {options.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

function OptionCombo({
  label,
  options,
}: {
  readonly label: string;
  readonly options: readonly SelectOption[];
}): ReactElement {
  return (
    <Autocomplete
      options={[...options]}
      getOptionLabel={(option) => option.label}
      isOptionEqualToValue={(a, b) => a.value === b.value}
      renderInput={(params) => <TextField {...params} label={label} />}
      // Caps rendered options so the 400-item list does not mount 400 nodes.
      // A documented prop, not a workaround.
      filterOptions={(opts, state) => {
        const query = state.inputValue.trim().toLocaleLowerCase();
        const matched = query
          ? opts.filter((o) => o.label.toLocaleLowerCase().includes(query))
          : opts;
        return matched.slice(0, 100);
      }}
    />
  );
}

export function SectionSelection(): ReactElement {
  const { labels } = useDemo();
  const [selected, setSelected] = useState<SelectOption[]>([
    OPTIONS_SMALL[0] as SelectOption,
    OPTIONS_SMALL[2] as SelectOption,
  ]);

  return (
    <Box component="section" id="section-2" sx={{ mb: 8 }}>
      <Typography variant="h3" component="h3" sx={{ mb: 3 }}>
        2. Select, multiselect and searchable combobox
      </Typography>

      <Box
        sx={{
          display: "grid",
          gap: 3,
          gridTemplateColumns: "repeat(auto-fit, minmax(15rem, 1fr))",
          mb: 3,
        }}
      >
        <OptionSelect id="sel-8" label={`${labels.fieldHazard} (8)`} options={OPTIONS_SMALL} />
        <OptionSelect
          id="sel-40"
          label={`${labels.fieldDataSource} (40)`}
          options={OPTIONS_MEDIUM}
        />
        <OptionSelect id="sel-400" label={`${labels.fieldCountry} (400)`} options={OPTIONS_LARGE} />
      </Box>

      <Box
        sx={{
          display: "grid",
          gap: 3,
          gridTemplateColumns: "repeat(auto-fit, minmax(15rem, 1fr))",
          mb: 3,
        }}
      >
        <OptionCombo label={`${labels.actionFilter} (8)`} options={OPTIONS_SMALL} />
        <OptionCombo label={`${labels.actionFilter} (40)`} options={OPTIONS_MEDIUM} />
        <OptionCombo label={`${labels.actionFilter} (400)`} options={OPTIONS_LARGE} />
      </Box>

      {/* Multiselect: `multiple` is a prop, and chips come for free. */}
      <Autocomplete
        multiple
        options={[...OPTIONS_SMALL]}
        value={selected}
        onChange={(_event, next) => setSelected([...next])}
        getOptionLabel={(option) => option.label}
        isOptionEqualToValue={(a, b) => a.value === b.value}
        renderValue={(value, getItemProps) =>
          value.map((option, index) => (
            <Chip label={option.label} {...getItemProps({ index })} key={option.value} />
          ))
        }
        renderInput={(params) => (
          <TextField {...params} label={`${labels.fieldHazard} (multiselect)`} />
        )}
      />
    </Box>
  );
}
