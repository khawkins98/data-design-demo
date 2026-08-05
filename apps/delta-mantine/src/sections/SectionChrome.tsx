/**
 * Section 5: cards and left-hand navigation, styled to match the host.
 *
 * Both native. `NavLink` is the more interesting of the two: it is purpose-built
 * for exactly this — an anchor with `active`, `label`, `description` and optional
 * nested children — where React Aria has no navigation component and MUI makes
 * you assemble List + ListItemButton + ListItemText.
 *
 * Matching Delta is a subtraction problem, as it was for MUI. Mantine's `Card`
 * ships with `shadow`, its own radius and its own padding; Delta's cards are flat
 * with a 1px border. `withBorder shadow="none"` gets there.
 */

import type { ReactElement } from "react";
import { Box, Card, NavLink, SimpleGrid, Text, Title } from "@mantine/core";

import { useDemo } from "../demo-state.js";

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
    <Box component="section" id="section-5" mb="s16">
      <Title order={3} mb="md">
        5. Cards and left-hand navigation
      </Title>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        <Box
          component="nav"
          aria-label={labels.navOverview}
          style={{
            border: "1px solid var(--mantine-color-default-border)",
            borderRadius: "var(--mantine-radius-md)",
            overflow: "hidden",
          }}
        >
          {navItems.map((item) => (
            <NavLink
              key={item.id}
              href={`#section-5`}
              label={item.label}
              active={item.id === "records"}
            />
          ))}
        </Box>

        <SimpleGrid cols={1} spacing="md">
          {[
            { id: "monitor", title: labels.navRecords, body: labels.longMethodologyNotice },
            { id: "desinventar", title: labels.navSubmissions, body: labels.longRetentionNotice },
          ].map((card) => (
            /* withBorder + shadow none: Delta's cards are flat, Mantine's are not. */
            <Card key={card.id} withBorder shadow="none" padding="md" radius="md">
              <Title order={4} mb="xs">
                {card.title}
              </Title>
              <Text size="sm" c="dimmed">
                {card.body}
              </Text>
            </Card>
          ))}
        </SimpleGrid>
      </SimpleGrid>
    </Box>
  );
}
