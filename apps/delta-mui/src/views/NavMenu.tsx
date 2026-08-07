/**
 * DELTA's menu bar, MUI Community.
 *
 * WHAT THE LIBRARY GIVES. `Menu` is `Popover` + `MenuList` + `MenuItem`, and it
 * arrives styled: panel, elevation, radius, hover and focus states, the ripple,
 * and a `Divider` that needs no rule of its own. Behaviour is complete too -
 * `aria-haspopup`/`aria-expanded` via `id`+`aria-controls`, `role="menu"`,
 * arrow-key roving, type-ahead, Escape, click-away, focus restored to the anchor.
 * Against the React Aria pairing, which writes ~40 CSS rules for the same bar,
 * this file writes none: everything below is either state or an `sx` nudge to
 * match DELTA's density.
 *
 * WHAT IT COSTS: THE MENU IS NOT A TRIGGER, IT IS A CONTROLLED POPOVER. MUI has
 * no `MenuTrigger`; you hold the anchor element in state yourself and wire
 * `onClick`, `onClose`, `open` and `anchorEl` by hand, once per menu. React Aria,
 * Mantine and Ant Design all wrap that up. It is about eight lines each time and
 * it is the same eight lines, which is the kind of cost that does not show up in
 * a component inventory but does show up across an estate.
 *
 * THE TWO-LINE ITEM NEEDS AN OPT-OUT. `MenuItem` lays its children out in a row
 * and expects `ListItemText`/`ListItemIcon`. DELTA's item is a bold label above
 * muted supporting text, so the item has to be told to stack -
 * `flexDirection: "column", alignItems: "flex-start"` - before its own children
 * behave. `ListItemText` with `secondary` would have been the native route and is
 * NOT used here, because it renders the secondary line through Typography with
 * its own colour and spacing scale, which fights the DELTA design file. Recorded
 * because "the library has a slot for it" and "the slot fits" are different
 * claims.
 *
 * RTL IS FREE HERE, BUT ONLY BECAUSE THE RTL PLUGIN IS WIRED. `anchorOrigin` and
 * `transformOrigin` take physical `left`/`right`, so the values below are
 * `direction`-aware rather than logical. See src/direction.tsx for why this
 * pairing needed a third setup step at all.
 */

import { useState } from "react";
import type { MouseEvent, ReactElement } from "react";
import { Avatar, Button, Divider, Menu, MenuItem, Typography, useTheme } from "@mui/material";

import { DeltaNavIcon } from "@undrr-eval/host-delta";
import type { DeltaMenu, DeltaMenuEntry } from "@undrr-eval/host-delta";

/** The controlled-anchor dance MUI requires, written once and reused twice. */
function useAnchor(): {
  anchorEl: HTMLElement | null;
  open: boolean;
  handleOpen: (event: MouseEvent<HTMLElement>) => void;
  handleClose: () => void;
} {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  return {
    anchorEl,
    open: anchorEl !== null,
    handleOpen: (event: MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget),
    handleClose: () => setAnchorEl(null),
  };
}

function MenuEntries({
  items,
  onClose,
}: {
  readonly items: readonly DeltaMenuEntry[];
  readonly onClose: () => void;
}): readonly ReactElement[] {
  /*
   * An array rather than a fragment, because `MenuList` reads its children to
   * build the roving tab index and a fragment hides them from it - the same
   * collection-flattening constraint every menu implementation in this
   * evaluation runs into, in a different shape.
   */
  return items.flatMap((entry) => {
    const item = (
      <MenuItem
        key={entry.id}
        onClick={onClose}
        disabled={entry.disabled === true}
        sx={{
          flexDirection: "column",
          alignItems: "flex-start",
          gap: 0.125,
          py: 1,
          minWidth: "16rem",
        }}
      >
        <Typography sx={{ fontWeight: 700, fontSize: "0.875rem", color: "#004F91" }}>
          {entry.label}
        </Typography>
        {entry.description === undefined ? null : (
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.75rem" }}>
            {entry.description}
          </Typography>
        )}
      </MenuItem>
    );
    /*
     * A real `Divider`, unlike the React Aria pairing which draws a border on the
     * following item. MUI's `MenuList` tolerates a non-`MenuItem` child and skips
     * it when moving focus, so the separator costs one component and no CSS.
     */
    return entry.separator === true
      ? [<Divider key={`${entry.id}-sep`} component="li" sx={{ my: 0.5 }} />, item]
      : [item];
  });
}

export function NavMenu({ menu }: { readonly menu: DeltaMenu }): ReactElement {
  const { anchorEl, open, handleOpen, handleClose } = useAnchor();
  const theme = useTheme();
  const side = theme.direction === "rtl" ? "right" : "left";

  return (
    <>
      <Button
        onClick={handleOpen}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={open ? `menu-${menu.id}` : undefined}
        startIcon={<DeltaNavIcon name={menu.icon} />}
        disableRipple
        sx={{
          px: 1.25,
          py: 1,
          gap: 0.75,
          minWidth: 0,
          fontSize: "0.75rem",
          fontWeight: 600,
          letterSpacing: "0.05em",
          borderRadius: 0,
          borderBottom: "2px solid",
          borderColor: menu.current === true ? "#004F91" : "transparent",
          color: menu.current === true ? "#004F91" : "#475569",
          "&:hover": { background: "none", color: "#004F91" },
        }}
      >
        {menu.label}
      </Button>
      <Menu
        id={`menu-${menu.id}`}
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: side }}
        transformOrigin={{ vertical: "top", horizontal: side }}
      >
        {MenuEntries({ items: menu.items, onClose: handleClose })}
      </Menu>
    </>
  );
}

export function ProfileMenu({
  items,
}: {
  readonly items: readonly DeltaMenuEntry[];
}): ReactElement {
  const { anchorEl, open, handleOpen, handleClose } = useAnchor();
  const theme = useTheme();
  const side = theme.direction === "rtl" ? "left" : "right";

  return (
    <>
      <Button
        onClick={handleOpen}
        aria-label="Account"
        aria-haspopup="true"
        aria-expanded={open}
        sx={{ minWidth: 0, p: 0, borderRadius: "50%" }}
      >
        {/* `Avatar` is the component DELTA uses here too, via PrimeReact's. */}
        <Avatar sx={{ width: 36, height: 36, fontSize: "0.75rem", fontWeight: 700 }}>KH</Avatar>
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: side }}
        transformOrigin={{ vertical: "top", horizontal: side }}
      >
        {MenuEntries({ items, onClose: handleClose })}
      </Menu>
    </>
  );
}
