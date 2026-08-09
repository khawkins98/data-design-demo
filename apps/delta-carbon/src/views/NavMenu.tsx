/**
 * DELTA's menu bar, IBM Carbon.
 *
 * `MenuButton` + `MenuItem` IS THE MODERN API, and it is a genuine
 * trigger-and-panel pair: no controlled anchor state, keyboard and roles handled,
 * `MenuItemDivider` for the separator, `disabled` as a prop. On the API surface
 * this sits between Mantine (cheapest) and MUI (controlled anchor by hand).
 *
 * THE COST IS THE ONE CARBON CHARGES EVERYWHERE: THE LOOK IS IBM'S. `MenuButton`
 * renders a Carbon button with Carbon's own height, type ramp, border radius of
 * zero and IBM Plex - a bar item that does not look like the DELTA design file
 * and cannot be made to without reaching past the theming API into `.cds--`
 * internals, which this file does not do. The trigger below is deliberately left
 * Carbon-shaped, so the screenshots show the real trade rather than a disguise.
 * That is the same finding as the token audit and the progress indicator, in a
 * third place.
 *
 * DELTA'S TWO-LINE ITEM DOES NOT FIT AT ALL, and this is the sharpest result of
 * the five. `MenuItem` takes `label` as a STRING, not a node - it renders it into
 * its own `.cds--menu-item__label` and there is no children slot. So the
 * supporting line is passed to `shortcut`, the only other text slot Carbon
 * offers, which is intended for keyboard hints and is right-aligned and muted.
 * That is visibly not what DELTA shows. The alternative is `OverflowMenuItem`
 * with `itemText` - also a string. Recorded plainly: of the five candidates,
 * Carbon is the only one where DELTA's existing menu item cannot be reproduced.
 */

import type { ReactElement } from "react";
import { MenuButton, MenuItem, MenuItemDivider } from "@carbon/react";

import type { DeltaMenu, DeltaMenuEntry } from "@undrr-eval/host-delta";

function entries(items: readonly DeltaMenuEntry[]): readonly ReactElement[] {
  return items.flatMap((entry) => {
    const item = (
      <MenuItem
        key={entry.id}
        label={entry.label}
        disabled={entry.disabled === true}
        /*
         * `shortcut` is a keyboard-hint slot, used here because it is the only
         * second text slot `MenuItem` has. It renders muted and at the inline end
         * rather than beneath the label. See the file header - this is the
         * finding, not a workaround being passed off as a fit.
         */
        {...(entry.description === undefined ? {} : { shortcut: entry.description })}
      />
    );
    return entry.separator === true
      ? [<MenuItemDivider key={`${entry.id}-sep`} />, item]
      : [item];
  });
}

export function NavMenu({ menu }: { readonly menu: DeltaMenu }): ReactElement {
  return (
    <MenuButton label={menu.label.toUpperCase()} kind="ghost" size="sm" menuAlignment="bottom-start">
      {entries(menu.items)}
    </MenuButton>
  );
}

export function ProfileMenu({
  items,
}: {
  readonly items: readonly DeltaMenuEntry[];
}): ReactElement {
  /*
   * No `Avatar` in Carbon - it has no avatar component at all - so the trigger is
   * a labelled `MenuButton` rather than the initials circle the design file shows.
   * One more place where the DELTA chrome cannot be reproduced from the library.
   */
  return (
    <MenuButton label="KH" kind="ghost" size="sm" menuAlignment="bottom-end">
      {entries(items)}
    </MenuButton>
  );
}
