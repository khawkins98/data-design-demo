/**
 * Section 4: modal, tooltip, popover and accordion.
 *
 * All four native, all four portalled. Mantine's `Modal` traps focus, restores
 * it on close and handles Escape by default (`trapFocus`, `returnFocus`,
 * `closeOnEscape` all default true); `Tooltip` is hover AND keyboard-focus
 * triggered without a prop; `Popover` dismisses on outside click; `Accordion`
 * ships the `region`/`aria-controls`/`aria-expanded` wiring and arrow-key
 * navigation, plus an `order` prop that wraps each control in a heading, which is
 * the thing most accordion implementations get wrong.
 *
 * Every one of them renders into a portal at `document.body`, i.e. outside both
 * `.demo` and `.undrr-tokens`, which is why they carry `OVERLAY_CLASS`. See
 * overlay-class.ts.
 */

import { useState } from "react";
import type { ReactElement } from "react";
import {
  Accordion,
  Button,
  Group,
  Modal,
  Popover,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";

import { useDemo } from "../demo-state.js";
import { OVERLAY_CLASS } from "../overlay-class.js";

export function SectionOverlays(): ReactElement {
  const { labels } = useDemo();
  const [modalOpen, setModalOpen] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>("methodology");

  const items = [
    { id: "methodology", title: labels.colDataSource, body: labels.longMethodologyNotice },
    { id: "retention", title: labels.colReviewNote, body: labels.longRetentionNotice },
    { id: "accessibility", title: labels.colNarrative, body: labels.longAccessibilityNotice },
  ];

  return (
    <section id="section-4">
      <Title order={3} mb="md">
        4. Modal, tooltip, popover and accordion
      </Title>

      <Group mb="md" wrap="wrap">
        <Button onClick={() => setModalOpen(true)}>Open modal</Button>

        <Tooltip label={labels.longMethodologyNotice} classNames={{ tooltip: OVERLAY_CLASS }}>
          <Button variant="default">Hover or focus for tooltip</Button>
        </Tooltip>

        <Popover
          opened={popoverOpen}
          onChange={setPopoverOpen}
          position="bottom-start"
          withArrow
          classNames={{ dropdown: OVERLAY_CLASS }}
        >
          <Popover.Target>
            <Button variant="default" onClick={() => setPopoverOpen((o) => !o)}>
              Open popover
            </Button>
          </Popover.Target>
          <Popover.Dropdown maw={360}>
            <Title order={4} mb="xs">
              {labels.colStatus}
            </Title>
            <Text size="sm">{labels.longRetentionNotice}</Text>
          </Popover.Dropdown>
        </Popover>
      </Group>

      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={labels.appTitle}
        classNames={{ content: OVERLAY_CLASS, header: OVERLAY_CLASS }}
      >
        <Text mb="md">{labels.longVerificationBanner}</Text>
        <Group>
          <Button onClick={() => setModalOpen(false)}>{labels.actionSave}</Button>
          <Button variant="default" onClick={() => setModalOpen(false)}>
            {labels.actionCancel}
          </Button>
        </Group>
      </Modal>

      {/* `order={4}` wraps each control in an h4, which WAI-ARIA asks for. */}
      <Accordion value={expanded} onChange={setExpanded} order={4} variant="contained">
        {items.map((item) => (
          <Accordion.Item key={item.id} value={item.id}>
            <Accordion.Control>{item.title}</Accordion.Control>
            <Accordion.Panel>
              <Text size="sm">{item.body}</Text>
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion>
    </section>
  );
}
