/**
 * The filter controls above the records table.
 *
 * Identical in both hosts — see `records-state.ts` for why that means two copies
 * rather than one import.
 *
 * `collapsible` is the only difference between the two views' filters: the DELTA
 * application screen puts them in a collapsible card, the Mangrove island shows
 * them open, because an embedded region has no room to hide its own controls.
 * React Aria's `Disclosure` covers the collapse with no custom state, and it is
 * the same component the kitchen sink's accordion uses.
 *
 * WHAT REACT ARIA DOES NOT GIVE HERE. There is no "filter bar", no "facet" and
 * no empty-selection concept on `Select`, so the "any" entries below are a
 * sentinel key of ours (`ANY_KEY`) rather than a library affordance. Their
 * labels are also the one piece of English left in this subtree: `packages/
 * fixtures` has no label for "any hazard type", and the package is import-only,
 * so this is recorded as a fixtures gap rather than papered over with an
 * invented translation.
 */

import type { ReactElement } from "react";
import {
  Button,
  Disclosure,
  DisclosurePanel,
  Heading,
  Input,
  Label,
  ListBox,
  ListBoxItem,
  Popover,
  SearchField,
  Select,
  SelectValue,
} from "react-aria-components";

import type { SelectOption } from "@undrr-eval/fixtures";

import { useDemo } from "../demo-state.js";
import { POPOVER_CLASS } from "../overlay-class.js";
import { ANY_KEY, HAZARD_OPTIONS, STATUS_OPTIONS, useOverlayDir } from "./records-state.js";
import type { RecordsView } from "./records-state.js";

/** See the note above: no fixture label exists for these. */
const ANY_HAZARD = "Any hazard type";
const ANY_STATUS = "Any status";

function FacetSelect({
  label,
  anyLabel,
  options,
  value,
  onChange,
}: {
  readonly label: string;
  readonly anyLabel: string;
  readonly options: readonly SelectOption[];
  readonly value: string;
  readonly onChange: (next: string) => void;
}): ReactElement {
  // The listbox is portalled out of the frame's `dir` element. See useOverlayDir.
  const dir = useOverlayDir();

  return (
    <Select
      className="demo-field demo-field--inline"
      selectedKey={value}
      onSelectionChange={(key) => onChange(String(key))}
    >
      <Label className="demo-label">{label}</Label>
      <Button className="demo-select__trigger">
        <SelectValue className="demo-select__value" />
        <span aria-hidden="true">▾</span>
      </Button>
      <Popover className={POPOVER_CLASS} dir={dir}>
        <ListBox className="demo-listbox">
          <ListBoxItem id={ANY_KEY} textValue={anyLabel} className="demo-listbox__item">
            {anyLabel}
          </ListBoxItem>
          {options.map((option) => (
            <ListBoxItem
              key={option.value}
              id={option.value}
              textValue={option.label}
              className="demo-listbox__item"
            >
              {option.label}
            </ListBoxItem>
          ))}
        </ListBox>
      </Popover>
    </Select>
  );
}

function FilterFields({ view }: { readonly view: RecordsView }): ReactElement {
  const { labels } = useDemo();

  return (
    <>
      <div className="demo-filters__grid">
        <SearchField
          className="demo-field demo-field--inline"
          value={view.query}
          onChange={view.setQuery}
        >
          <Label className="demo-label">{labels.actionFilter}</Label>
          <Input className="demo-input" />
        </SearchField>

        <FacetSelect
          label={labels.fieldHazard}
          anyLabel={ANY_HAZARD}
          options={HAZARD_OPTIONS}
          value={view.hazard}
          onChange={view.setHazard}
        />

        <FacetSelect
          label={labels.colStatus}
          anyLabel={ANY_STATUS}
          options={STATUS_OPTIONS}
          value={view.status}
          onChange={view.setStatus}
        />
      </div>

      <div className="demo-filters__actions">
        <Button
          className="demo-button"
          isDisabled={!view.isFiltered}
          onPress={view.clearFilters}
        >
          {labels.actionClearFilters}
        </Button>
        <p className="demo-filters__count" role="status">
          {view.matched} / {view.total}
        </p>
      </div>
    </>
  );
}

export function RecordsFilters({
  view,
  collapsible = false,
}: {
  readonly view: RecordsView;
  readonly collapsible?: boolean;
}): ReactElement {
  const { labels } = useDemo();

  if (!collapsible) {
    return (
      <section className="demo-filters" aria-label={labels.actionFilter}>
        <FilterFields view={view} />
      </section>
    );
  }

  return (
    <Disclosure className="demo-filters demo-filters--collapsible" defaultExpanded>
      <Heading>
        <Button slot="trigger" className="demo-accordion__trigger">
          {labels.actionFilter}
        </Button>
      </Heading>
      <DisclosurePanel className="demo-filters__panel">
        <FilterFields view={view} />
      </DisclosurePanel>
    </Disclosure>
  );
}
