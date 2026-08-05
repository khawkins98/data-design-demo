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
 */

/** Reinterprets a Carbon render-prop object as the component's own prop type. */
export function asProps<T>(value: object): T {
  return value as unknown as T;
}
