/**
 * Section 5: cards and left-hand navigation, styled to match the host.
 *
 * Carbon has real components for both, which is a difference from React Aria:
 *
 *   Tile      Carbon's card. `ClickableTile` and `ExpandableTile` add behaviour;
 *             the plain one is a styled container.
 *   SideNav   part of the UI Shell, with SideNavItems / SideNavLink / SideNavMenu.
 *
 * Both are native, and both are opinionated. `SideNav` is built for a full-height
 * application shell fixed to the viewport edge, and expects a `Header` above it;
 * used inline it needs `isFixedNav={false}` plus `expanded`, or it collapses to a
 * 3rem rail. The theme then has to unpick its `position: fixed`. That containment
 * work is recorded as CSS cost rather than as a missing component.
 */

import type { ReactElement } from "react";
import { SideNav, SideNavItems, SideNavLink, Tile } from "@carbon/react";

import { useDemo } from "../demo-state.js";

const CARDS = [
  { id: "monitor", titleKey: "navRecords", bodyKey: "longMethodologyNotice" },
  { id: "desinventar", titleKey: "navSubmissions", bodyKey: "longRetentionNotice" },
] as const;

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
    <section className="demo-section" id="section-5" aria-labelledby="s5">
      <h3 className="demo-section__title" id="s5">
        5. Cards and left-hand navigation
      </h3>

      <div className="demo-chrome">
        <div className="demo-sidenav-wrap">
          <SideNav
            aria-label={labels.navOverview}
            expanded
            isFixedNav={false}
            isChildOfHeader={false}
            className="demo-sidenav"
          >
            <SideNavItems>
              {navItems.map((item, index) => (
                <SideNavLink
                  key={item.id}
                  href="#section-5"
                  isActive={index === 1}
                  large
                >
                  {item.label}
                </SideNavLink>
              ))}
            </SideNavItems>
          </SideNav>
        </div>

        <div className="demo-cards">
          {CARDS.map((card) => (
            <Tile key={card.id} className="demo-card">
              <h4 className="demo-card__title">{labels[card.titleKey]}</h4>
              <p className="demo-card__description">{labels[card.bodyKey]}</p>
            </Tile>
          ))}
        </div>
      </div>
    </section>
  );
}
