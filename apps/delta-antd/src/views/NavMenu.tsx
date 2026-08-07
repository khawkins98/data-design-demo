/**
 * DELTA's menu bar, Ant Design.
 *
 * `Dropdown` TAKES THE MENU AS DATA, WHICH IS THE INTERESTING DIFFERENCE. Every
 * other candidate here composes a menu from components; antd's `Dropdown` takes
 * `menu={{ items }}` - an array of plain objects with `key`, `label`, `disabled`
 * and `{ type: "divider" }`. This model file maps onto it almost one-to-one, which
 * makes it the cheapest mapping of the five, and it is the same shape DELTA's
 * PrimeReact `Menubar` already uses. A migration from PrimeReact would move this
 * data across nearly unchanged.
 *
 * WHAT THE DATA API COSTS. `label` accepts a ReactNode, so DELTA's two-line item
 * is possible - but as arbitrary markup inside a cell antd sizes for one line, so
 * the item's height and vertical rhythm become ours. There is no `description`
 * prop as Mantine has, and no documented slot: the second line here is a `<div>`
 * with a hand-set size and colour. It works and it is not supported.
 *
 * THE TRIGGER TELLS A SCREEN READER NOTHING, AND THIS IS THE FINDING. Measured on
 * the built page: antd's `Dropdown` puts NO `aria-haspopup`, NO `aria-expanded`
 * and NO `aria-controls` on its trigger, before opening or after. The other four
 * candidates all set haspopup and toggle expanded. So a screen-reader user is told
 * "DATA, button" - not that it opens a menu, and not that the menu is now open -
 * and the four top-level items of DELTA's navigation become four buttons that
 * appear to do nothing. This is the same species as the antd stepper finding: the
 * visual affordance is complete and the accessible one is absent.
 *
 * It is escapable in per-site code - the trigger is our `Button`, so the
 * attributes can be written by hand and wired to `onOpenChange` - which is why it
 * is a caveat rather than a blocker. It is NOT escapable by configuration, and
 * every trigger on every site pays for it.
 *
 * The disabled item is handled correctly by comparison: `aria-disabled`, which is
 * what the APG asks for. *
 * MEASURED ACROSS ALL FIVE, at 1440px, DATA menu trigger then the SETTINGS menu's
 * disabled "API keys" item:
 *
 *   library      aria-haspopup  aria-expanded  aria-controls  disabled item
 *   React Aria   true           toggles        yes            aria-disabled, no tabindex
 *   MUI          true           toggles        yes            aria-disabled, tabindex=-1
 *   Mantine      menu           toggles        yes            native disabled, tabindex=-1
 *   Carbon       true           toggles        yes            aria-disabled, tabindex=-1
 *   Ant Design   NONE           NONE           NONE           aria-disabled

 *
 * RTL comes from the `ConfigProvider` direction the app already sets, and the
 * dropdown's own placement mirrors with it.
 */

import type { ReactElement } from "react";
import { Avatar, Button, Dropdown } from "antd";
import type { MenuProps } from "antd";

import { DeltaNavIcon } from "@undrr-eval/host-delta";
import type { DeltaMenu, DeltaMenuEntry } from "@undrr-eval/host-delta";

type AntItems = NonNullable<MenuProps["items"]>;

/*
 * Returns a non-optional array: with `exactOptionalPropertyTypes`, antd's own
 * `items` type is `ItemType[] | undefined`, and handing that straight to
 * `menu={{ items }}` is rejected. A small friction of a data-shaped API meeting
 * a strict tsconfig, and worth a line rather than a cast.
 */
function toItems(entries: readonly DeltaMenuEntry[]): AntItems {
  return entries.flatMap((entry) => {
    const item = {
      key: entry.id,
      disabled: entry.disabled === true,
      label: (
        <span style={{ display: "block", paddingBlock: "0.25rem" }}>
          <span style={{ display: "block", fontWeight: 700, color: "#004F91" }}>
            {entry.label}
          </span>
          {entry.description === undefined ? null : (
            /*
              No `description` slot exists, so this is arbitrary markup in a cell
              antd sized for one line. Line height is set by hand for that reason.
            */
            <span
              style={{
                display: "block",
                marginBlockStart: "0.125rem",
                fontSize: "0.75rem",
                lineHeight: 1.3,
                color: "rgba(0,0,0,0.45)",
              }}
            >
              {entry.description}
            </span>
          )}
        </span>
      ),
    };
    return entry.separator === true
      ? [{ type: "divider" as const, key: `${entry.id}-sep` }, item]
      : [item];
  });
}

export function NavMenu({ menu }: { readonly menu: DeltaMenu }): ReactElement {
  return (
    <Dropdown menu={{ items: toItems(menu.items) }} trigger={["click"]} overlayStyle={{ minWidth: "16rem" }}>
      <Button
        type="text"
        icon={<DeltaNavIcon name={menu.icon} />}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.375rem",
          height: "auto",
          padding: "0.5rem 0.625rem",
          borderRadius: 0,
          borderBlockEnd: `2px solid ${menu.current === true ? "#004F91" : "transparent"}`,
          color: menu.current === true ? "#004F91" : "#475569",
          fontSize: "0.75rem",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {menu.label}
      </Button>
    </Dropdown>
  );
}

export function ProfileMenu({
  items,
}: {
  readonly items: readonly DeltaMenuEntry[];
}): ReactElement {
  return (
    <Dropdown menu={{ items: toItems(items) }} trigger={["click"]} placement="bottomRight">
      <Button type="text" aria-label="Account" style={{ height: "auto", padding: 0, borderRadius: "50%" }}>
        <Avatar size={36}>KH</Avatar>
      </Button>
    </Dropdown>
  );
}
