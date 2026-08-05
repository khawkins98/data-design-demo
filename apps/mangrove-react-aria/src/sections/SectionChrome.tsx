/**
 * Section 5: cards and left-hand navigation, styled to match the host.
 *
 * React Aria has no card component, which is correct — a card is a styling
 * concern, not a behavioural one. So the cards here are plain markup borrowing
 * Mangrove's own `mg-card` classes, and the implementation cost is CSS rather
 * than components.
 *
 * The navigation is a React Aria `ListBox` with `selectionMode="single"`,
 * which gives roving tabindex and type-ahead that a plain `<ul>` of links does
 * not. That is a genuine behavioural gain, so it is worth the component.
 */

import type { ReactElement } from "react";
import { Label, ListBox, ListBoxItem } from "react-aria-components";

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
        <div className="demo-field">
          <Label className="demo-label" id="candidate-nav-label">
            {labels.navOverview}
          </Label>
          <ListBox
            className="demo-nav"
            aria-labelledby="candidate-nav-label"
            selectionMode="single"
            defaultSelectedKeys={["records"]}
            items={navItems}
          >
            {(item) => (
              <ListBoxItem id={item.id} textValue={item.label} className="demo-nav__item">
                {item.label}
              </ListBoxItem>
            )}
          </ListBox>
        </div>

        <div className="demo-cards">
          {CARDS.map((card) => (
            /* Mangrove's own card classes: styling borrowed, no component needed. */
            <article key={card.id} className="mg-card demo-card">
              <div className="mg-card__content">
                <h4 className="mg-card__title">{labels[card.titleKey]}</h4>
                <p className="mg-card__description">{labels[card.bodyKey]}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
