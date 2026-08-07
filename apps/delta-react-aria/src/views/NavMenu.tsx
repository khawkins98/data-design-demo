/**
 * DELTA's menu bar, React Aria.
 *
 * WHAT THE LIBRARY GIVES, AND HERE IT IS MOST OF THE HARD PART. `MenuTrigger` +
 * `Popover` + `Menu` + `MenuItem` carry the whole behavioural contract: the
 * trigger's `aria-haspopup` and `aria-expanded`, `role="menu"`/`menuitem`, focus
 * into the menu on open and back to the trigger on close, arrow-key roving with
 * wrap, Home/End, type-ahead, Escape, click-outside, and overlay positioning that
 * flips when the menu would leave the viewport. None of that is written here.
 * That is the same trade this pairing makes everywhere - behaviour arrives, looks
 * do not - but a menu is where the behaviour is worth the most, because the
 * keyboard contract is long and getting it wrong is invisible until someone
 * without a mouse arrives.
 *
 * RTL COMES FREE AND IT IS NOT NOTHING. `Popover` reads the locale from
 * `I18nProvider` and mirrors its own placement, so `placement="bottom start"`
 * resolves to the right edge in Arabic without a second code path. The physical
 * equivalents (`bottom left`) exist and are not used.
 *
 * WHAT IT COSTS: every pixel. There is no menu appearance at all - no panel, no
 * border, no shadow, no hover state, no separator rule, no disabled treatment -
 * so `views.css` carries it, in the same way this pairing pays for everything
 * else. The two-line item DELTA renders (bold label, muted description) is not a
 * component here either; it is a `MenuItem` containing two spans, which is
 * honestly the easy case, because `MenuItem` imposes no internal structure.
 *
 * ONE REAL LIMITATION, AND IT IS THE SAME ONE AS THE TOAST. `Menu` renders a flat
 * list; a separator is `<Separator>` inside the menu, which React Aria does ship,
 * but the DISABLED item is where the divergence shows: `isDisabled` on `MenuItem`
 * sets `aria-disabled` and keeps the item focusable, which is the APG-correct
 * behaviour for a menu and is NOT what a native `disabled` button does. Recorded
 * because it is the ONLY one of the five that does this - MUI, Mantine and Carbon
 * all set `tabindex="-1"`, and Mantine uses the native `disabled` attribute. *
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
import { Button, Menu, MenuItem, MenuTrigger, Popover } from "react-aria-components";

import { DeltaNavIcon } from "@undrr-eval/host-delta";
import type { DeltaMenu, DeltaMenuEntry } from "@undrr-eval/host-delta";

/** Shared by both menus, so the panel is identical whatever opened it. */
function MenuPanel({ items }: { readonly items: readonly DeltaMenuEntry[] }): ReactElement {
  return (
    <Popover className="demo-navmenu__popover" placement="bottom start" offset={4}>
      <Menu className="demo-navmenu__menu">
        {items.map((entry) => (
          <MenuItem
            key={entry.id}
            id={entry.id}
            className="demo-navmenu__item"
            isDisabled={entry.disabled === true}
          >
            {/*
              React Aria DOES ship `Separator`, and the rule here is drawn on the
              following item instead only because these items are built from a map
              and a mixed collection would need the items grouped by hand. Noted so
              the CSS is not read as a gap in the library: it is a choice, and the
              separator carries no semantics `Menu` does not already imply.
            */}
            <span
              className={`demo-navmenu__label${
                entry.separator === true ? " demo-navmenu__label--after-rule" : ""
              }`}
            >
              {entry.label}
            </span>
            {entry.description === undefined ? null : (
              <span className="demo-navmenu__description">{entry.description}</span>
            )}
          </MenuItem>
        ))}
      </Menu>
    </Popover>
  );
}

export function NavMenu({ menu }: { readonly menu: DeltaMenu }): ReactElement {
  return (
    <MenuTrigger>
      <Button
        className={`demo-navmenu__trigger${
          menu.current === true ? " demo-navmenu__trigger--current" : ""
        }`}
      >
        {/* The host's own icon, so the bar reads identically across all five. */}
        <DeltaNavIcon name={menu.icon} />
        {menu.label}
        <span aria-hidden="true" className="demo-navmenu__caret" />
      </Button>
      <MenuPanel items={menu.items} />
    </MenuTrigger>
  );
}

export function ProfileMenu({
  items,
}: {
  readonly items: readonly DeltaMenuEntry[];
}): ReactElement {
  return (
    <MenuTrigger>
      <Button className="demo-navmenu__avatar" aria-label="Account">
        KH
      </Button>
      <MenuPanel items={items} />
    </MenuTrigger>
  );
}
