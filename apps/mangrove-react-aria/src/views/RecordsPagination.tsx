/**
 * Pagination for both realistic views.
 *
 * Identical in both hosts — see `records-state.ts` for why that means two copies
 * rather than one import.
 *
 * REACT ARIA SHIPS NO PAGINATION COMPONENT, so all of this is ours: the
 * `<nav aria-label>`, the range readout and its live region, the disabled edges, and
 * the rows-per-page control. The kitchen sink recorded the same gap; a realistic
 * screen makes it more expensive, because a records table needs the page range
 * ("11-20 of 250") rather than just next/previous.
 *
 * The rows-per-page control is a native `<select>` on purpose. React Aria's
 * `Select` portals its listbox, and a portalled overlay on these hosts needs the
 * token-scope workaround in `overlay-class.ts`; the filter facets already
 * demonstrate that, and a third portal here would add cost without adding
 * evidence.
 */

import type { ReactElement } from "react";
import { Button } from "react-aria-components";

import { useDemo } from "../demo-state.js";
import { PAGE_SIZES, useSettled } from "./records-state.js";
import type { RecordsView } from "./records-state.js";

export function RecordsPagination({
  view,
  id,
}: {
  readonly view: RecordsView;
  /** Distinct id so the rows-per-page label is unique on the page. */
  readonly id: string;
}): ReactElement {
  const { labels } = useDemo();

  const range =
    view.matched === 0
      ? labels.stateEmpty
      : `${view.firstRow}–${view.lastRow} / ${view.matched}`;

  /* THE SCREEN'S ONE LIVE REGION. It reports the range AND the filtered total, so
     it subsumes what the filter card's own `role="status"` used to duplicate on
     every keystroke — see useSettled in records-state.ts for the full note. */
  const announced = useSettled(range);

  return (
    <nav className="demo-pagination demo-pagination--split" aria-label="Pagination">
      <div className="demo-pagination__group">
        <label className="demo-label" htmlFor={id}>
          Rows per page
        </label>
        <select
          id={id}
          className="demo-input demo-input--compact"
          value={view.pageSize}
          onChange={(event) => view.setPageSize(Number(event.target.value))}
        >
          {PAGE_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>

      <div className="demo-pagination__group">
        {/* Visible copy: updates on every keystroke, and hidden from the
            accessibility tree so it does not duplicate the live region below. */}
        <span className="demo-pagination__status" aria-hidden="true">
          {range}
        </span>
        <span className="demo-visually-hidden" role="status">
          {announced}
        </span>
        <Button
          className="demo-button"
          isDisabled={view.page === 0}
          onPress={() => view.setPage(view.page - 1)}
        >
          Previous
        </Button>
        <Button
          className="demo-button"
          isDisabled={view.page >= view.pageCount - 1}
          onPress={() => view.setPage(view.page + 1)}
        >
          Next
        </Button>
      </div>
    </nav>
  );
}
