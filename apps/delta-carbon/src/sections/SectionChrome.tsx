/**
 * Section 5: cards and left-hand navigation, styled to match the host.
 *
 * `Tile` is Carbon's card and it is the easiest match in this pairing: Carbon's
 * tile is FLAT — a background and a hairline border, no elevation — which is
 * exactly what Delta's cards are. MUI needed `variant="outlined" elevation={0}`
 * to get there; Carbon starts there. `--cds-layer` and `--cds-border-tile` carry
 * the token values, so no override was needed beyond the corner radius, which
 * Carbon has no token for at all.
 *
 * `SideNav` is the awkward one. It is not a navigation *list* component: it is
 * application shell chrome, designed to sit fixed against the viewport edge
 * beneath a Carbon `Header`, with `position: fixed`, a 16rem inline size, a
 * z-index above the page, and expand/collapse behaviour driven by a header
 * hamburger it expects to exist. Dropping it into a page column needs its
 * positioning neutralised — five declarations in demo.css, recorded as an escape
 * hatch. That makes `left-nav` `composed` rather than `native`: the component is
 * Carbon's, but making it behave as an in-page element is not.
 *
 * The alternative Carbon offers is `contained-list` or a plain `<ul>` with
 * `cds--list__item`, neither of which gives the selected-state and hover
 * treatment a navigation column needs.
 */

import type { ReactElement } from "react";
import { SideNav, SideNavItems, SideNavLink, Tile } from "@carbon/react";

import { useDemo } from "../demo-state.js";

export function SectionChrome(): ReactElement {
  const { labels } = useDemo();

  const navItems = [
    { id: "overview", label: labels.navOverview },
    { id: "records", label: labels.navRecords },
    { id: "submissions", label: labels.navSubmissions },
    { id: "verification", label: labels.navVerification },
    { id: "settings", label: labels.navSettings },
  ];

  return (
    <section id="section-5" className="demo__section">
      <h3 className="demo__heading">5. Cards and left-hand navigation</h3>

      <div className="demo__split">
        <SideNav
          aria-label={labels.navOverview}
          expanded
          isPersistent
          isChildOfHeader={false}
          addFocusListeners={false}
          addMouseListeners={false}
        >
          <SideNavItems>
            {navItems.map((item) => (
              <SideNavLink
                key={item.id}
                href={`#section-5`}
                isActive={item.id === "records"}
                aria-current={item.id === "records" ? "page" : undefined}
              >
                {item.label}
              </SideNavLink>
            ))}
          </SideNavItems>
        </SideNav>

        <div className="demo__grid">
          {[
            { id: "monitor", title: labels.navRecords, body: labels.longMethodologyNotice },
            { id: "desinventar", title: labels.navSubmissions, body: labels.longRetentionNotice },
          ].map((card) => (
            <Tile key={card.id}>
              <h4 className="demo__subheading">{card.title}</h4>
              <p style={{ color: "var(--undrr-color-text-secondary)" }}>{card.body}</p>
            </Tile>
          ))}
        </div>
      </div>

      <p className="demo__note">
        Carbon&apos;s SideNav is fixed-position application shell chrome. Rendering
        it as an in-page navigation column needs its positioning neutralised; see
        the escape hatches in demo.css.
      </p>
    </section>
  );
}
