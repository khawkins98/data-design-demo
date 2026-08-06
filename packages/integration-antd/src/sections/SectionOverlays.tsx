/**
 * Section 4: modal, tooltip, popover, accordion.
 *
 * All four are native and none needed composition. The interesting part of this
 * section is not the components, it is where they render.
 *
 * antd portals its overlays to `document.body`, like every other candidate here,
 * so the same trap applies: the UNDRR tokens are scoped to `.undrr-tokens` rather
 * than `:root` deliberately, to keep the leakage assertion honest, and CSS custom
 * properties do not reach a portal through React context. A `var(--undrr-*)` used
 * in a portalled overlay resolves to nothing.
 *
 * antd's answer is better than the class-juggling the React Aria and Mantine runs
 * needed: `ConfigProvider` takes `getPopupContainer`, so the overlays can be
 * mounted inside the candidate subtree instead of at the body. That is set once in
 * each app rather than per component - see each app's App.tsx - so there is
 * nothing to remember here and no per-overlay class to pass.
 *
 * The trade is recorded rather than presented as free: containing overlays inside
 * the subtree means they are subject to the subtree's `overflow` and stacking
 * context, which is why the container is the section wrapper rather than a
 * deeply nested element.
 */

import { useState } from "react";
import type { ReactElement } from "react";
import { Button, Collapse, Modal, Popover, Space, Tooltip, Typography } from "antd";

import { useDemo } from "../demo-state.js";

export function SectionOverlays(): ReactElement {
  const { labels } = useDemo();
  const [open, setOpen] = useState(false);

  return (
    <section id="section-4" style={{ marginBottom: "4rem" }}>
      <Typography.Title level={3} style={{ marginBottom: "1.5rem" }}>
        4. Modal, tooltip, popover and accordion
      </Typography.Title>

      <Space wrap style={{ marginBottom: "1.5rem" }}>
        <Button type="primary" onClick={() => setOpen(true)}>
          {labels.actionFilter}
        </Button>

        <Tooltip title={labels.longMethodologyNotice}>
          <Button>{labels.navVerification}</Button>
        </Tooltip>

        <Popover
          trigger="click"
          title={labels.navSubmissions}
          content={
            <Typography.Paragraph style={{ maxWidth: "32ch", marginBottom: 0 }}>
              {labels.longRetentionNotice}
            </Typography.Paragraph>
          }
        >
          <Button>{labels.navSettings}</Button>
        </Popover>
      </Space>

      <Modal
        open={open}
        title={labels.navSubmissions}
        onCancel={() => setOpen(false)}
        onOk={() => setOpen(false)}
        okText={labels.actionSave}
        cancelText={labels.actionCancel}
      >
        <Typography.Paragraph>{labels.longSubmissionGuidance}</Typography.Paragraph>
      </Modal>

      <Collapse
        accordion
        items={[
          {
            key: "methodology",
            label: labels.navOverview,
            children: <Typography.Paragraph>{labels.longMethodologyNotice}</Typography.Paragraph>,
          },
          {
            key: "retention",
            label: labels.navRecords,
            children: <Typography.Paragraph>{labels.longRetentionNotice}</Typography.Paragraph>,
          },
          {
            key: "accessibility",
            label: labels.navVerification,
            children: (
              <Typography.Paragraph>{labels.longAccessibilityNotice}</Typography.Paragraph>
            ),
          },
        ]}
      />
    </section>
  );
}
