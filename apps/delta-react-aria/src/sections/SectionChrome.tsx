/**
 * Section 5: cards and left-hand navigation, styled to match the host.
 *
 * React Aria has no card component, which is correct — a card is a styling
 * concern, not a behavioural one. So the cards here are plain markup carrying
 * Delta's own Tailwind utility strings, reused verbatim from
 * `packages/host-delta/src/HostShell.tsx`. The result is pixel-identical to the
 * host's canary cards for zero lines of CSS.
 *
 * That only works because those exact utilities already exist in the compiled
 * host stylesheet. `host-delta.src.css` scopes Tailwind to
 * `@source "./HostShell.tsx"`, so a utility the host does not itself use emits
 * no CSS and fails silently. See DELTA_CARD_CLASS in demo-state.ts.
 *
 * The navigation is a React Aria `ListBox` with `selectionMode="single"`, which
 * gives roving tabindex and type-ahead that a plain `<ul>` of links does not.
 * That is a genuine behavioural gain, so it is worth the component — but it
 * cannot borrow the host's utilities, because the visual states it needs
 * (`data-selected`, `data-focus-visible`) are attributes on library-rendered
 * elements rather than classes we control. It is therefore themed with tokens
 * in theme.css, shaped to match Delta's left border accent.
 */

import type { ReactElement } from "react";
import { Label, ListBox, ListBoxItem } from "react-aria-components";

import {
  DELTA_CARD_BODY_CLASS,
  DELTA_CARD_CLASS,
  DELTA_CARD_TITLE_CLASS,
  useDemo,
} from "../demo-state.js";

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
            /* Delta's own card utilities: styling borrowed, no component needed. */
            <article key={card.id} className={DELTA_CARD_CLASS}>
              <div>
                <h4 className={DELTA_CARD_TITLE_CLASS}>{labels[card.titleKey]}</h4>
                <p className={DELTA_CARD_BODY_CLASS}>{labels[card.bodyKey]}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
