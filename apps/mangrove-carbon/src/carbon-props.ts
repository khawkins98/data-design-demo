/**
 * A cast for Carbon's DataTable render props, and why it has to exist.
 *
 * `DataTable`'s render-prop getters are typed as returning OPTIONAL properties:
 *
 *   getSelectionProps(): { checked?: boolean; indeterminate?: boolean; ... }
 *   getHeaderProps():    { isSortable?: boolean; ... }
 *   getToolbarProps():   { size?: 'xs' | 'sm' | undefined }
 *
 * while the components those objects are spread into declare the same properties
 * as REQUIRED (`checked: boolean`, `isSortable: boolean`, `size: 'xs' | 'sm' |
 * 'lg'`). Under `exactOptionalPropertyTypes: true`, which this repository sets and
 * which is the correct setting, `boolean | undefined` is not assignable to
 * `boolean` — so the canonical usage straight out of Carbon's own documentation
 * does not typecheck.
 *
 * The values are correct at runtime; this is Carbon's own two type declarations
 * disagreeing with each other. Casting at the spread is the only route that does
 * not involve loosening the workspace compiler settings.
 *
 * Extracted here when the realistic island layout needed the same cast that
 * `sections/SectionDataTable.tsx` already carried, so the two views share one
 * documented escape hatch rather than two copies of it. The delta-carbon app has
 * the same file for the same reason.
 *
 * ONE MORE PIECE OF THE SAME API, previously missing from this inventory and from
 * every usage in both Carbon apps: `DataTable` and `TableHeader` BOTH accept a
 * `translateWithId(messageId, args)` hook, and it is the documented way to localise
 * the strings they generate themselves. Verified against the installed 1.113.0:
 *
 *   DataTable.js:55-72     `carbon.table.all.select` → "Select all rows"
 *                          `carbon.table.row.select` → "Select row"
 *                          plus their unselect and expand/collapse pairs
 *   TableHeader.js:49,186  `carbon.table.header.icon.description` →
 *                          "Click to sort rows by header in ascending order"
 *
 * Those strings are the accessible names of the select-all checkbox, every row
 * checkbox and every sortable header, and they are ENGLISH IN ALL FOUR LOCALES in
 * both apps because the hook is never passed. That is a genuine fixture gap rather
 * than a Carbon one — `LabelSet` has no sort or selection vocabulary and inventing
 * four locales' worth is out of bounds — but it is recorded here because the earlier
 * version of this file inventoried the DataTable API in detail and never mentioned
 * the hook exists, while comments elsewhere credited `translateWithId` to
 * `Pagination`, which does not have it at all.
 */

import type { ComponentProps, ElementType } from "react";

/** Reinterprets a Carbon render-prop object as the component's own prop type. */
export function asProps<C extends ElementType>(props: object): ComponentProps<C> {
  return props as ComponentProps<C>;
}
