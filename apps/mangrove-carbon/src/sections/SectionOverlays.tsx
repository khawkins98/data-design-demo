/**
 * Section 4: modal, tooltip, popover and accordion.
 *
 * All four are native Carbon components, and none of them portal. `Modal`,
 * `Tooltip`, `Popover` and `Accordion` all render in place in the React tree —
 * verified by grepping the installed package for `createPortal`, which appears
 * in none of them.
 *
 * That is the reason this pairing sidesteps the class-scoped-token trap in
 * docs/requirements.md entirely, and it is worth recording as an architectural
 * difference rather than luck. Carbon has a second layer of protection too:
 * every colour in its stylesheet is written `var(--cds-x, #literal)`, so even an
 * overlay outside the token scope falls back to the White theme value instead of
 * computing to `rgba(0,0,0,0)`. React Aria had neither property and rendered
 * transparent popovers.
 *
 * `Modal` renders in place but is fixed-positioned and full-viewport, so it still
 * needs a z-index above the host chrome; that comes from the token scale in
 * theme.css.
 */

import { useRef, useState } from "react";
import type { ReactElement } from "react";
import {
  Accordion,
  AccordionItem,
  Button,
  Modal,
  Popover,
  PopoverContent,
  Tooltip,
} from "@carbon/react";

import { useDemo } from "../demo-state.js";

export function SectionOverlays(): ReactElement {
  const { labels } = useDemo();
  const [modalOpen, setModalOpen] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);

  /**
   * Carbon restores focus to this element on close if you hand it the ref.
   * Without `launcherButtonRef` focus lands on <body>, so the restore half of
   * the requirement is opt-in rather than automatic.
   */
  const modalTrigger = useRef<HTMLButtonElement>(null);
  const popoverRoot = useRef<HTMLDivElement>(null);

  return (
    <section className="demo-section" id="section-4" aria-labelledby="s4">
      <h3 className="demo-section__title" id="s4">
        4. Modal, tooltip, popover and accordion
      </h3>

      <div className="demo-row">
        <Button ref={modalTrigger} kind="primary" onClick={() => setModalOpen(true)}>
          Open modal
        </Button>

        {/*
          Carbon's Tooltip wraps its trigger rather than being a sibling, and is
          hover AND keyboard-focus triggered with no extra props. `description`
          gives an aria-describedby tooltip; `label` gives an aria-labelledby one.
        */}
        <Tooltip
          align="bottom"
          enterDelayMs={100}
          description={labels.longMethodologyNotice}
          className="demo-tooltip"
        >
          <Button kind="tertiary">Hover or focus for tooltip</Button>
        </Tooltip>

        {/*
          Popover is a lower-level primitive than the rest: it renders and
          positions, and outside-click dismissal is the consumer's job. Carbon's
          own docs show exactly this pattern, so it is composed rather than
          custom, but it is a real difference from React Aria's DialogTrigger.
        */}
        <div ref={popoverRoot} className="demo-popover-root">
          <Popover
            open={popoverOpen}
            isTabTip
            align="bottom-start"
            onRequestClose={() => setPopoverOpen(false)}
            className="demo-popover"
          >
            <Button
              kind="tertiary"
              aria-expanded={popoverOpen}
              onClick={() => setPopoverOpen((open) => !open)}
            >
              Open popover
            </Button>
            <PopoverContent className="demo-popover__content">
              <h4 className="demo-popover__title">{labels.colStatus}</h4>
              <p className="demo-prose">{labels.longRetentionNotice}</p>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <Modal
        open={modalOpen}
        modalHeading={labels.appTitle}
        modalLabel={labels.navRecords}
        primaryButtonText={labels.actionSave}
        secondaryButtonText={labels.actionCancel}
        launcherButtonRef={modalTrigger}
        onRequestClose={() => setModalOpen(false)}
        onRequestSubmit={() => setModalOpen(false)}
        onSecondarySubmit={() => setModalOpen(false)}
      >
        <p className="demo-prose">{labels.longVerificationBanner}</p>
      </Modal>

      {/*
        Accordion is fully native: correct aria-expanded, aria-controls, heading
        structure and arrow-key navigation between headers. Carbon allows several
        panels open at once and offers no single-expand mode, which is the one
        gap against React Aria's DisclosureGroup.
      */}
      <Accordion className="demo-accordion">
        <AccordionItem title={labels.colDataSource}>
          <p className="demo-prose">{labels.longMethodologyNotice}</p>
        </AccordionItem>
        <AccordionItem title={labels.colReviewNote}>
          <p className="demo-prose">{labels.longRetentionNotice}</p>
        </AccordionItem>
        <AccordionItem title={labels.colNarrative}>
          <p className="demo-prose">{labels.longAccessibilityNotice}</p>
        </AccordionItem>
      </Accordion>
    </section>
  );
}
