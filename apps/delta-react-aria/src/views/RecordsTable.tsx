/**
 * The records table used by both realistic views.
 *
 * Identical in both hosts — see `records-state.ts` for why that means two copies
 * rather than one import.
 *
 * Deliberately NOT the kitchen sink's table. That one demonstrates capability:
 * multi-select, column resizing, every fixture column. This one is modelled on
 * what DELTA's records screen actually shows — six columns, a status pill, and
 * row-action icon buttons — because the question here is layout, not inventory.
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

import { useMemo } from "react";
import type { ReactElement } from "react";
import {
  Button,
  Cell,
  Column,
  Row,
  Table,
  TableBody,
  TableHeader,
} from "react-aria-components";
import type { SortDescriptor } from "react-aria-components";

import type { LossRecord } from "@undrr-eval/fixtures";

import { useDemo } from "../demo-state.js";

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
    <div className="demo-tablewrap">
      <Table
        className="demo-table"
        aria-label={labels.navRecords}
        sortDescriptor={sort}
        onSortChange={onSortChange}
      >
        <TableHeader>
          <Column id="country" isRowHeader allowsSorting className="demo-table__column">
            {labels.colCountry}
          </Column>
          <Column id="hazardType" allowsSorting className="demo-table__column">
            {labels.colHazard}
          </Column>
          <Column id="eventDate" allowsSorting className="demo-table__column">
            {labels.colEventDate}
          </Column>
          <Column id="peopleAffected" allowsSorting className="demo-table__column">
            {labels.colPeopleAffected}
          </Column>
          <Column
            id="economicLossUsdMillions"
            allowsSorting
            className="demo-table__column"
          >
            {labels.colEconomicLoss}
          </Column>
          <Column id="verificationStatus" allowsSorting className="demo-table__column">
            {labels.colStatus}
          </Column>
          {showActions ? (
            <Column id="actions" className="demo-table__column demo-table__column--actions">
              {/* Icon-only column. The header still needs a name for screen
                  readers, and React Aria will not invent one. */}
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
                      <span aria-hidden="true">✎</span>
                    </Button>
                    <Button
                      className="demo-iconbutton demo-iconbutton--danger"
                      aria-label={`${labels.actionDelete}: ${record.id}`}
                      onPress={() => onDelete?.(record)}
                    >
                      <span aria-hidden="true">🗑</span>
                    </Button>
                  </div>
                </Cell>
              ) : null}
            </Row>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
