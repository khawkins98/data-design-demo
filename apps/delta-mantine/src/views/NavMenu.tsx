/**
 * DELTA's menu bar, Mantine.
 *
 * THE CHEAPEST OF THE FIVE, AND BY A MARGIN. `Menu` + `Menu.Target` +
 * `Menu.Dropdown` + `Menu.Item` is a trigger-and-panel pair: no controlled anchor
 * state as MUI needs, no hand-written CSS as React Aria needs. `Menu.Divider`
 * draws the separator and `disabled` is a prop. This file writes zero CSS rules.
 *
 * CORRECTION, KEPT ON THE RECORD BECAUSE THE MISTAKE IS INSTRUCTIVE. This comment
 * first claimed `Menu.Item` takes a `description` prop, making Mantine the only
 * candidate where DELTA's two-line item is natively supported. It does not:
 * `MenuItemProps` is `children`, `leftSection`, `rightSection`, `color` and
 * `disabled`. The prop was accepted silently and rendered nothing, and the demo
 * showed one-line items until the DOM was measured. NO CANDIDATE of the five has
 * a supporting-text slot for a menu item.
 *
 * RTL WORKS FROM `dir` ALONE. `MantineProvider` reads direction from the document
 * and `position="bottom-start"` is logical, so Arabic needs no second code path
 * and no plugin. Compare MUI, which needs physical `anchorOrigin` values chosen
 * from `theme.direction`, and an emotion plugin before its CSS mirrors at all.
 *
 * WHAT TO WATCH, AND THIS IS A SECOND CORRECTION. This comment claimed Mantine's
 * `disabled` sets `aria-disabled` and keeps the item focusable. MEASURED, it does
 * the opposite: `Menu.Item` renders a `<button>` with the NATIVE `disabled`
 * attribute and `tabindex="-1"`, and no `aria-disabled` at all. A natively
 * disabled button is removed from the accessibility tree's interactive surface -
 * a screen-reader user arrowing the menu never lands on it and is never told the
 * item exists. The APG asks for menu items to stay focusable so unavailability is
 * discoverable; React Aria is the only one of the five that does that here.
 *
 * The dropdown is portalled by default, so the usual portal caveat applies: it
 * inherits `dir` through Mantine's own context rather than through CSS. *
 * MEASURED ACROSS ALL FIVE, at 1440px, DATA menu trigger then the SETTINGS menu's
 * disabled "API keys" item:
 *
 *   library      aria-haspopup  aria-expanded  aria-controls  disabled item
 *   React Aria   true           toggles        yes            aria-disabled, no tabindex
 *   MUI          true           toggles        yes            aria-disabled, tabindex=-1
 *   Mantine      menu           toggles        yes            native disabled, tabindex=-1
 *   Carbon       true           toggles        yes            aria-disabled, tabindex=-1
 *   Ant Design   NONE           NONE           NONE           aria-disabled

 */

import type { ReactElement } from "react";
import { Avatar, Menu, UnstyledButton } from "@mantine/core";

import { DeltaCaret, DeltaNavIcon } from "@undrr-eval/host-delta";
import type { DeltaMenu, DeltaMenuEntry } from "@undrr-eval/host-delta";

function entries(items: readonly DeltaMenuEntry[]): readonly ReactElement[] {
  return items.flatMap((entry) => {
    const item = (
      <Menu.Item key={entry.id} disabled={entry.disabled === true}>
        {/*
          NO `description` SLOT, AND I CHECKED RATHER THAN ASSUMED. `MenuItemProps`
          is `children`, `leftSection`, `rightSection`, `color` and `disabled` -
          nothing for DELTA's supporting line. So it is nested children here, the
          same as MUI and Ant Design. Mantine's advantage over those two is that
          `Menu.Item` does not impose a row layout, so the second line needs no
          flex-direction override to sit beneath the first.
        */}
        <span style={{ display: "block", fontWeight: 700, color: "#004F91" }}>
          {entry.label}
        </span>
        {entry.description === undefined ? null : (
          <span
            style={{
              display: "block",
              marginBlockStart: "0.125rem",
              fontSize: "0.75rem",
              lineHeight: 1.3,
              opacity: 0.7,
            }}
          >
            {entry.description}
          </span>
        )}
      </Menu.Item>
    );
    return entry.separator === true
      ? [<Menu.Divider key={`${entry.id}-sep`} />, item]
      : [item];
  });
}

export function NavMenu({ menu }: { readonly menu: DeltaMenu }): ReactElement {
  return (
    <Menu position="bottom-start" offset={4} width={340} shadow="md">
      <Menu.Target>
        <UnstyledButton
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.375rem",
            padding: "0.5rem 0.625rem",
            borderBlockEnd: `2px solid ${menu.current === true ? "#004F91" : "transparent"}`,
            color: menu.current === true ? "#004F91" : "#475569",
            fontSize: "0.75rem",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          <DeltaNavIcon name={menu.icon} />
          {menu.label}
          {/* The host's caret, so all five bars read the same. */}
          <DeltaCaret />
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown>{entries(menu.items)}</Menu.Dropdown>
    </Menu>
  );
}

export function ProfileMenu({
  items,
}: {
  readonly items: readonly DeltaMenuEntry[];
}): ReactElement {
  return (
    <Menu position="bottom-end" offset={4} shadow="md">
      <Menu.Target>
        <UnstyledButton aria-label="Account">
          <Avatar radius="xl" size={36}>
            KH
          </Avatar>
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown>{entries(items)}</Menu.Dropdown>
    </Menu>
  );
}
