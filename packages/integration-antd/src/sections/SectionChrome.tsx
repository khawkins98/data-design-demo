/**
 * Section 5: cards and left-hand navigation, styled to match the host.
 *
 * Both native: `Card` and `Menu` with `mode="inline"`. antd's Card is the closest
 * of the four candidates to what both hosts already draw - square-ish, bordered,
 * flat - so `variant="outlined"` gets most of the way without overriding
 * defaults. Contrast MUI's Card, which ships elevation and a radius that had to
 * be removed on both hosts.
 *
 * `Menu` is the one place antd's opinion is expensive: it is built for
 * application navigation and brings its own active-item highlight, inline
 * indent scale and hover transition. Those are theme tokens rather than CSS
 * overrides, so they are reachable, but there are more of them than a plain list
 * would need. That cost is in `theme.ts` under `components.Menu`, not here.
 */

import type { ReactElement } from "react";
import { Card, Flex, Menu, Typography } from "antd";

import { useDemo } from "../demo-state.js";

export function SectionChrome(): ReactElement {
  const { labels } = useDemo();

  const navItems = [
    { key: "overview", label: labels.navOverview },
    { key: "records", label: labels.navRecords },
    { key: "submissions", label: labels.navSubmissions },
    { key: "verification", label: labels.navVerification },
    { key: "settings", label: labels.navSettings },
  ];

  return (
    <section id="section-5" style={{ marginBottom: "4rem" }}>
      <Typography.Title level={3} style={{ marginBottom: "1.5rem" }}>
        5. Cards and left-hand navigation
      </Typography.Title>

      <Flex gap="large" wrap align="flex-start">
        <nav aria-label={labels.navOverview} style={{ minWidth: "14rem", flex: "0 0 auto" }}>
          <Menu
            mode="inline"
            defaultSelectedKeys={["records"]}
            items={navItems}
            style={{ borderInlineEnd: 0 }}
          />
        </nav>

        <Flex
          gap="middle"
          wrap
          style={{ flex: "1 1 22rem", minWidth: 0 }}
          aria-label={labels.navRecords}
        >
          <Card
            variant="outlined"
            title={labels.navSubmissions}
            style={{ flex: "1 1 16rem", minWidth: 0 }}
          >
            <Typography.Paragraph style={{ marginBottom: 0 }}>
              {labels.longSubmissionGuidance}
            </Typography.Paragraph>
          </Card>

          <Card
            variant="outlined"
            title={labels.navVerification}
            style={{ flex: "1 1 16rem", minWidth: 0 }}
          >
            <Typography.Paragraph style={{ marginBottom: 0 }}>
              {labels.longVerificationBanner}
            </Typography.Paragraph>
          </Card>
        </Flex>
      </Flex>
    </section>
  );
}
