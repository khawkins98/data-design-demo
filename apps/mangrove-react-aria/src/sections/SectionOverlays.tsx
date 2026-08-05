/**
 * Section 4: modal, tooltip, popover and accordion.
 *
 * All four are native React Aria components. `Disclosure` and `DisclosurePanel`
 * arrived in the free tier and cover the accordion; `DisclosureGroup` gives the
 * single-expand behaviour without custom state.
 *
 * TooltipTrigger is keyboard-focus triggered by default, which is the part
 * hand-rolled tooltips usually get wrong.
 */

import type { ReactElement } from "react";
import {
  Button,
  Dialog,
  DialogTrigger,
  Disclosure,
  DisclosureGroup,
  DisclosurePanel,
  Heading,
  Modal,
  ModalOverlay,
  OverlayArrow,
  Popover,
  Tooltip,
  TooltipTrigger,
} from "react-aria-components";

import { useDemo } from "../demo-state.js";

export function SectionOverlays(): ReactElement {
  const { labels } = useDemo();

  return (
    <section className="demo-section" id="section-4" aria-labelledby="s4">
      <h3 className="demo-section__title" id="s4">
        4. Modal, tooltip, popover and accordion
      </h3>

      <div className="demo-row">
        <DialogTrigger>
          <Button className="demo-button demo-button--primary">Open modal</Button>
          <ModalOverlay className="demo-modal__overlay" isDismissable>
            <Modal className="demo-modal">
              <Dialog className="demo-dialog">
                {({ close }) => (
                  <>
                    <Heading slot="title" className="demo-dialog__title">
                      {labels.appTitle}
                    </Heading>
                    <p className="demo-prose">{labels.longVerificationBanner}</p>
                    <div className="demo-row">
                      <Button className="demo-button demo-button--primary" onPress={close}>
                        {labels.actionSave}
                      </Button>
                      <Button className="demo-button" onPress={close}>
                        {labels.actionCancel}
                      </Button>
                    </div>
                  </>
                )}
              </Dialog>
            </Modal>
          </ModalOverlay>
        </DialogTrigger>

        <TooltipTrigger delay={200}>
          <Button className="demo-button">Hover or focus for tooltip</Button>
          <Tooltip className="demo-tooltip">
            <OverlayArrow className="demo-tooltip__arrow">
              <svg width={8} height={8} viewBox="0 0 8 8" aria-hidden="true">
                <path d="M0 0 L4 4 L8 0" />
              </svg>
            </OverlayArrow>
            {labels.longMethodologyNotice}
          </Tooltip>
        </TooltipTrigger>

        <DialogTrigger>
          <Button className="demo-button">Open popover</Button>
          <Popover className="demo-popover demo-popover--padded">
            <OverlayArrow className="demo-popover__arrow">
              <svg width={12} height={12} viewBox="0 0 12 12" aria-hidden="true">
                <path d="M0 0 L6 6 L12 0" />
              </svg>
            </OverlayArrow>
            <Dialog className="demo-dialog">
              <Heading slot="title" className="demo-dialog__title">
                {labels.colStatus}
              </Heading>
              <p className="demo-prose">{labels.longRetentionNotice}</p>
            </Dialog>
          </Popover>
        </DialogTrigger>
      </div>

      <DisclosureGroup className="demo-accordion" allowsMultipleExpanded={false}>
        <Disclosure id="methodology" className="demo-accordion__item">
          <Heading>
            <Button slot="trigger" className="demo-accordion__trigger">
              {labels.colDataSource}
            </Button>
          </Heading>
          <DisclosurePanel className="demo-accordion__panel">
            <p className="demo-prose">{labels.longMethodologyNotice}</p>
          </DisclosurePanel>
        </Disclosure>

        <Disclosure id="retention" className="demo-accordion__item">
          <Heading>
            <Button slot="trigger" className="demo-accordion__trigger">
              {labels.colReviewNote}
            </Button>
          </Heading>
          <DisclosurePanel className="demo-accordion__panel">
            <p className="demo-prose">{labels.longRetentionNotice}</p>
          </DisclosurePanel>
        </Disclosure>

        <Disclosure id="accessibility" className="demo-accordion__item">
          <Heading>
            <Button slot="trigger" className="demo-accordion__trigger">
              {labels.colNarrative}
            </Button>
          </Heading>
          <DisclosurePanel className="demo-accordion__panel">
            <p className="demo-prose">{labels.longAccessibilityNotice}</p>
          </DisclosurePanel>
        </Disclosure>
      </DisclosureGroup>
    </section>
  );
}
