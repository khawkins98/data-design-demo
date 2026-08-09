/**
 * A cast for Carbon's DataTable render props, and why it has to exist.
 *
 * `DataTable`'s render-prop getters are typed as returning optional properties:
 *
 *   getSelectionProps(): { checked?: boolean; indeterminate?: boolean; ... }
 *   getHeaderProps():    { isSortable?: boolean; ... }
 *   getToolbarProps():   { size?: 'xs' | 'sm' | 'lg' }
 *
 * while the components those objects are spread into declare the same properties
 * as REQUIRED:
 *
 *   TableSelectAllProps { checked: boolean; ... }
 *   TableHeaderProps    { isSortable: boolean; ... }
 *   TableToolbarProps   { size: 'xs' | 'sm' | 'lg' }
 *
 * Under `exactOptionalPropertyTypes: true` — which this repository sets, and which
 * is the correct setting — `boolean | undefined` is not assignable to `boolean`,
 * so the canonical usage straight out of Carbon's own documentation does not
 * typecheck. Six errors, in the exact code the docs tell you to write.
 *
 * This is a defect in Carbon's published types, not in the pattern. The runtime
 * behaviour is correct: the components have `propTypes` defaults for every one of
 * these. So the cast is the honest fix — it asserts what Carbon's types should
 * have said — and it is recorded in evidence.json as an escape hatch rather than
 * hidden by relaxing the tsconfig.
 *
 * Reported here rather than worked around silently because it is the kind of
 * friction UNDRR would hit on day one.
 *
 * ONE MORE PIECE OF THE SAME API, previously missing from this inventory and from
 * every usage in both Carbon apps: `DataTable` and `TableHeader` BOTH accept a
 * `translateWithId(messageId, args)` hook, and it is the documented way to localise
 * the strings they generate themselves. Verified against the installed 1.113.0:
 *
 *   DataTable.js:55-72     `carbon.table.all.select` → "Select all rows"
 *                          `carbon.table.all.unselect` → "Unselect all rows"
 *                          `carbon.table.row.select` → "Select row"
 *                          `carbon.table.row.unselect` → "Unselect row"
 *                          plus the four expand/collapse ids
 *   TableHeader.js:49,186  `carbon.table.header.icon.description` →
 *                          "Click to sort rows by header in ascending order"
 *
 * Those strings are the accessible names of the select-all checkbox, every row
 * checkbox and every sortable header, and they are ENGLISH IN ALL FOUR LOCALES in
 * both apps because the hook is never passed. That is a genuine fixture gap, not a
 * Carbon one: `LabelSet` has no sort or selection vocabulary, and inventing four
 * locales' worth is out of bounds. It is recorded here so the next reader knows the
 * hook exists — the earlier version of this file inventoried the DataTable API in
 * detail and never mentioned it, while comments elsewhere credited
 * `translateWithId` to `Pagination`, which does not have it at all.
 *
 * The fixture keys this would need: `a11ySortAscending`, `a11ySortDescending`,
 * `a11ySortNone`, `a11ySelectRow`, `a11ySelectAllRows` and their unselect pairs.
 */

/** Reinterprets a Carbon render-prop object as the component's own prop type. */
export function asProps<T>(value: object): T {
  return value as unknown as T;
}
