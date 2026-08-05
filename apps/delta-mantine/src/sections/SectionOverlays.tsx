/**
 * Section 4: modal, tooltip, popover and accordion.
 *
 * All four native, all four portalled. `portalProps` carries the token scope
 * class onto each portal container — see src/overlay-class.ts for why that is
 * needed even though Mantine's own theming survives portalling.
 *
 * Two Mantine-specific notes:
 *
 * - `Tooltip` is hover-only by default. Keyboard focus is `events={{ focus: true }}`,
 *   which is opt-in, so a developer following the quickstart ships a tooltip no
 *   keyboard user can reach. Worth flagging: the default is the inaccessible one.
 * - `Modal` traps focus and restores it on close without configuration, and
 *   `closeOnEscape` defaults to true.
 */

import { useState } from "react";
import type { ReactElement } from "react";
import {
  Accordion,
  Box,
  Button,
  Group,
  Modal,
  Popover,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";

import { useDemo } from "../demo-state.js";
import { usePortalProps } from "../overlay-class.js";

export function SectionOverlays(): ReactElement {
  const { labels } = useDemo();
  const portalProps = usePortalProps();
  const [modalOpen, modal] = useDisclosure(false);
  const [popoverOpen, popover] = useDisclosure(false);
  const [expanded, setExpanded] = useState<string | null>("methodology");

  const items = [
    { id: "methodology", title: labels.colDataSource, body: labels.longMethodologyNotice },
    { id: "retention", title: labels.colReviewNote, body: labels.longRetentionNotice },
    { id: "accessibility", title: labels.colNarrative, body: labels.longAccessibilityNotice },
  ];

  return (
    <Box component="section" id="section-4" mb="s16">
      <Title order={3} mb="md">
        4. Modal, tooltip, popover and accordion
      </Title>

      <Group gap="sm" mb="md" wrap="wrap">
        <Button variant="filled" onClick={modal.open}>
          Open modal
        </Button>

        {/* focus: true is NOT the default. Without it this is mouse-only. */}
        <Tooltip
          label={labels.longMethodologyNotice}
          events={{ hover: true, focus: true, touch: true }}
          multiline
          w={320}
          portalProps={portalProps}
        >
          <Button variant="outline">Hover or focus for tooltip</Button>
        </Tooltip>

        <Popover
          opened={popoverOpen}
          onChange={popover.toggle}
          position="bottom-start"
          withArrow
          shadow="md"
          portalProps={portalProps}
        >
          <Popover.Target>
            <Button variant="outline" onClick={popover.toggle}>
              Open popover
            </Button>
          </Popover.Target>
          <Popover.Dropdown maw="22rem" className="demo-popover">
            <Title order={4} mb="xs">
              {labels.colStatus}
            </Title>
            <Text size="sm">{labels.longRetentionNotice}</Text>
          </Popover.Dropdown>
        </Popover>
      </Group>

      <Modal
        opened={modalOpen}
        onClose={modal.close}
        title={labels.appTitle}
        portalProps={portalProps}
      >
        <Text mb="md">{labels.longVerificationBanner}</Text>
        <Group gap="sm">
          <Button variant="filled" onClick={modal.close}>
            {labels.actionSave}
          </Button>
          <Button variant="subtle" onClick={modal.close}>
            {labels.actionCancel}
          </Button>
        </Group>
      </Modal>

      <Accordion value={expanded} onChange={setExpanded} variant="separated">
        {items.map((item) => (
          <Accordion.Item key={item.id} value={item.id}>
            <Accordion.Control>{item.title}</Accordion.Control>
            <Accordion.Panel>
              <Text size="sm">{item.body}</Text>
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion>
    </Box>
  );
}
