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
 */

import type { ComponentProps, ElementType } from "react";

/** Reinterprets a Carbon render-prop object as the component's own prop type. */
export function asProps<C extends ElementType>(props: object): ComponentProps<C> {
  return props as ComponentProps<C>;
}
