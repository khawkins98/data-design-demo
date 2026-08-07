/**
 * The records table used by both realistic views.
 *
 * Identical in both hosts — see `records-state.ts` for why that means two copies
 * rather than one import.
 *
 * Shows multi-select, column resizing, sorting, status badges, and row-action
 * buttons — the same React Aria table capabilities the kitchen sink demonstrates,
 * applied to a realistic screen layout with six data columns.
 *
 * TWO THINGS WORTH RECORDING.
 *
 * 1. Row actions inside a React Aria `Table` need no special handling. A
 *    `<Button>` inside a `<Cell>` keeps its own focus behaviour and the table's
 *    arrow-key navigation still reaches it, which is the part hand-rolled tables
 *    usually break. No `stopPropagation`, no `onRowAction` gymnastics.
 * 2. There is still no data layer. `sortDescriptor`/`onSortChange` are wiring
 *    only; the sort itself is in `demo-state.ts`. Same boundary the kitchen sink
 *    found, restated at screen scale.
 */

import { useMemo, useState } from "react";
import type { ReactElement } from "react";
import {
  Button,
  Cell,
  Checkbox,
  Column,
  ColumnResizer,
  ResizableTableContainer,
  Row,
  Table,
  TableBody,
  TableHeader,
} from "react-aria-components";
import type { Selection, SortDescriptor } from "react-aria-components";

import type { LossRecord } from "@undrr-eval/fixtures";

import { useDemo } from "../demo-state.js";

/**
 * Row-action glyphs as inline SVG, on the same Material path data every other
 * pairing uses.
 *
 * These were emoji until a review caught it. Emoji render as full-colour vendor
 * glyphs that ignore `currentColor` and every design token, so the danger
 * variant's colour change never reached the icon and the column looked unlike
 * the same column in the other four candidates.
 */
const ROW_ACTION_PATHS = {
  edit: "M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm17.71-10.21a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z",
  remove: "M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z",
} as const;

function RowActionIcon({ path }: { readonly path: string }): ReactElement {
  return (
    <svg
      className="demo-iconbutton__icon"
      viewBox="0 0 24 24"
      width="1.25em"
      height="1.25em"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d={path} />
    </svg>
  );
}

function SelectionCheckbox(): ReactElement {
  return (
    <Checkbox slot="selection" className="demo-checkbox">
      {({ isSelected, isIndeterminate }) => (
        <span
          className="demo-checkbox__box"
          aria-hidden="true"
          data-selected={isSelected || undefined}
          data-indeterminate={isIndeterminate || undefined}
        >
          {isIndeterminate ? "–" : isSelected ? "✓" : ""}
        </span>
      )}
    </Checkbox>
  );
}

function ColumnResizerControl(): ReactElement {
  return <ColumnResizer className="demo-table__resizer" />;
}

export function RecordsTable({
  rows,
  sort,
  onSortChange,
  onDelete,
}: {
  readonly rows: readonly LossRecord[];
  readonly sort: SortDescriptor;
  readonly onSortChange: (next: SortDescriptor) => void;
  /** Omitted by the island view, which has no row actions. */
  readonly onDelete?: (record: LossRecord) => void;
}): ReactElement {
  const { labels, bcp47 } = useDemo();
  const [selected, setSelected] = useState<Selection>(new Set());

  const numberFormat = useMemo(() => new Intl.NumberFormat(bcp47), [bcp47]);
  const decimalFormat = useMemo(
    () =>
      new Intl.NumberFormat(bcp47, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    [bcp47],
  );
  const dateFormat = useMemo(
    () => new Intl.DateTimeFormat(bcp47, { dateStyle: "medium", timeZone: "UTC" }),
    [bcp47],
  );

  const showActions = onDelete !== undefined;

  return (
    <ResizableTableContainer className="demo-tablewrap">
      <Table
        className="demo-table"
        aria-label={labels.navRecords}
        sortDescriptor={sort}
        onSortChange={onSortChange}
        selectionMode="multiple"
        selectedKeys={selected}
        onSelectionChange={setSelected}
      >
        <TableHeader>
          <Column className="demo-table__column demo-table__column--select">
            <SelectionCheckbox />
          </Column>
          <Column id="country" isRowHeader allowsSorting className="demo-table__column">
            <div className="demo-table__columnInner">
              <span>{labels.colCountry}</span>
              <ColumnResizerControl />
            </div>
          </Column>
          <Column id="hazardType" allowsSorting className="demo-table__column">
            <div className="demo-table__columnInner">
              <span>{labels.colHazard}</span>
              <ColumnResizerControl />
            </div>
          </Column>
          <Column id="eventDate" allowsSorting className="demo-table__column">
            <div className="demo-table__columnInner">
              <span>{labels.colEventDate}</span>
              <ColumnResizerControl />
            </div>
          </Column>
          <Column id="peopleAffected" allowsSorting className="demo-table__column">
            <div className="demo-table__columnInner">
              <span>{labels.colPeopleAffected}</span>
              <ColumnResizerControl />
            </div>
          </Column>
          <Column
            id="economicLossUsdMillions"
            allowsSorting
            className="demo-table__column"
          >
            <div className="demo-table__columnInner">
              <span>{labels.colEconomicLoss}</span>
              <ColumnResizerControl />
            </div>
          </Column>
          <Column id="verificationStatus" allowsSorting className="demo-table__column">
            <div className="demo-table__columnInner">
              <span>{labels.colStatus}</span>
              <ColumnResizerControl />
            </div>
          </Column>
          {showActions ? (
            <Column id="actions" className="demo-table__column demo-table__column--actions">
              <span className="demo-visually-hidden">{labels.actionFilter}</span>
            </Column>
          ) : null}
        </TableHeader>

        <TableBody
          items={rows}
          renderEmptyState={() => <span className="demo-empty">{labels.stateEmpty}</span>}
        >
          {(record: LossRecord) => (
            <Row id={record.id} className="demo-table__row">
              <Cell className="demo-table__cell demo-table__cell--select">
                <SelectionCheckbox />
              </Cell>
              <Cell className="demo-table__cell">{record.country}</Cell>
              <Cell className="demo-table__cell">{record.hazardType}</Cell>
              <Cell className="demo-table__cell">
                {dateFormat.format(new Date(`${record.eventDate}T00:00:00Z`))}
              </Cell>
              <Cell className="demo-table__cell demo-table__cell--num">
                {numberFormat.format(record.peopleAffected)}
              </Cell>
              <Cell className="demo-table__cell demo-table__cell--num">
                {decimalFormat.format(record.economicLossUsdMillions)}
              </Cell>
              <Cell className="demo-table__cell">
                <span className={`demo-badge demo-badge--${record.verificationStatus}`}>
                  {record.verificationStatus}
                </span>
              </Cell>
              {showActions ? (
                <Cell className="demo-table__cell demo-table__cell--actions">
                  <div className="demo-rowactions">
                    <Button
                      className="demo-iconbutton"
                      aria-label={`${labels.colReviewNote}: ${record.id}`}
                    >
                      <RowActionIcon path={ROW_ACTION_PATHS.edit} />
                    </Button>
                    <Button
                      className="demo-iconbutton demo-iconbutton--danger"
                      aria-label={`${labels.actionDelete}: ${record.id}`}
                      onPress={() => onDelete?.(record)}
                    >
                      <RowActionIcon path={ROW_ACTION_PATHS.remove} />
                    </Button>
                  </div>
                </Cell>
              ) : null}
            </Row>
          )}
        </TableBody>
      </Table>
    </ResizableTableContainer>
  );
}
