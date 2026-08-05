/**
 * Section 4: modal, tooltip, popover and accordion.
 *
 * All four are native, and Carbon's set is unusually complete:
 *
 *   Modal      focus trap, focus restore, Escape, and a `launcherButtonRef` prop
 *              so restore-on-close is explicit rather than inferred. It also has
 *              `preventCloseOnClickOutside` and `selectorPrimaryFocus`, both of
 *              which the other candidates make you reach for a portal API to get.
 *   Tooltip    hover AND keyboard focus by default, with `enterDelayMs` /
 *              `leaveDelayMs`. Wraps a focusable child; Carbon throws if you give
 *              it a non-interactive one, which is a good failure.
 *   Toggletip  a click-triggered popover that dismisses on outside click and on
 *              Escape, with the ARIA already wired. This is the native answer to
 *              the `popover` requirement.
 *   Accordion  `AccordionItem` with correct `aria-expanded` / `aria-controls`.
 *
 * ON PORTALS, which docs/requirements.md warns about: Carbon barely portals.
 * `createPortal` appears in exactly ONE component in the whole package
 * (`Menu/Menu.js`); Modal, Tooltip, Toggletip and Popover all render in place in
 * the React tree, inside `.demo`, so the token scope reaches them by inheritance.
 * The one exception is flatpickr in SectionDates. See src/overlay-scope.ts.
 *
 * NOTE the raw `Popover` primitive is deliberately NOT used here. It is
 * unopinionated: you own `open`, outside-click dismissal and Escape. Using it
 * would have made `popover` a `composed` result for no benefit, since Toggletip
 * is the documented component for this behaviour.
 */

import { useRef, useState } from "react";
import type { ReactElement } from "react";
import {
  Accordion,
  AccordionItem,
  Button,
  Modal,
  Toggletip,
  ToggletipButton,
  ToggletipContent,
  Tooltip,
} from "@carbon/react";

import { useDemo } from "../demo-state.js";

export function SectionOverlays(): ReactElement {
  const { labels } = useDemo();
  const [modalOpen, setModalOpen] = useState(false);
  const launcherRef = useRef<HTMLButtonElement>(null);

  return (
    <section id="section-4" className="demo__section">
      <h3 className="demo__heading">4. Modal, tooltip, popover and accordion</h3>

      <div className="demo__row">
        <Button kind="primary" ref={launcherRef} onClick={() => setModalOpen(true)}>
          Open modal
        </Button>

        <Tooltip label={labels.longMethodologyNotice} align="bottom">
          {/* A raw `button` with Carbon's classes rather than `<Button>`:
              Carbon's Tooltip clones its child and needs a DOM element.

              NOTE the accessible-name consequence, which is a real finding.
              `label` makes Carbon set `aria-labelledby` on the trigger pointing
              at the tooltip, so the trigger's accessible name becomes the
              TOOLTIP TEXT and its own visible label is no longer announced. A
              `data-testid` is used in the e2e run for that reason. Carbon's
              `description` prop sets `aria-describedby` instead and preserves
              the name; which one is correct depends on whether the tooltip is
              the label or supplementary, and Carbon documents both. Worth a
              human review either way. */}
          <button
            className="cds--btn cds--btn--secondary"
            type="button"
            data-testid="tooltip-trigger"
          >
            Hover or focus for tooltip
          </button>
        </Tooltip>

        <Toggletip align="bottom">
          <ToggletipButton label="Open popover">
            <span>Open popover</span>
          </ToggletipButton>
          <ToggletipContent>
            <h4 className="demo__subheading">{labels.colStatus}</h4>
            <p>{labels.longRetentionNotice}</p>
          </ToggletipContent>
        </Toggletip>
      </div>

      <Modal
        open={modalOpen}
        modalLabel={labels.navVerification}
        modalHeading={labels.appTitle}
        primaryButtonText={labels.actionSave}
        secondaryButtonText={labels.actionCancel}
        launcherButtonRef={launcherRef}
        onRequestClose={() => setModalOpen(false)}
        onRequestSubmit={() => setModalOpen(false)}
      >
        <p>{labels.longVerificationBanner}</p>
      </Modal>

      <Accordion>
        {[
          { id: "methodology", title: labels.colDataSource, body: labels.longMethodologyNotice },
          { id: "retention", title: labels.colReviewNote, body: labels.longRetentionNotice },
          {
            id: "accessibility",
            title: labels.colNarrative,
            body: labels.longAccessibilityNotice,
          },
        ].map((item, index) => (
          <AccordionItem key={item.id} title={item.title} open={index === 0}>
            <p>{item.body}</p>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
