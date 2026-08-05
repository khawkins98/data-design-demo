/**
 * Section 5: cards and left-hand navigation, styled to match the host.
 *
 * Both native: `Card` and `NavLink` exist, which is more than React Aria offers
 * (no card component, no nav component). The work is matching Mangrove rather
 * than building the components.
 *
 * Where the match is imperfect, and this is a real limit of theming Mantine
 * against Mangrove 1.8.1: Mangrove's `mg-card` is a flat white panel with a
 * hairline border and square corners, and its nav links use a 3px inline-start
 * accent bar. Mantine's Card is `radius`/`shadow`-driven and its NavLink marks
 * the active item with a tinted background. `withBorder radius="xs" shadow="none"`
 * gets the card close; the nav bar treatment is NOT reachable through NavLink's
 * props or CSS variables (`--nl-color`, `--nl-bg`, `--nl-hover` only), so it is
 * left as Mantine's tinted-background convention rather than faked with a
 * ::before. The mismatch is visible in the section 9 screenshots on purpose.
 */

import type { ReactElement } from "react";
import { Card, NavLink, Paper, SimpleGrid, Text, Title } from "@mantine/core";

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
    <section id="section-5">
      <Title order={3} mb="md">
        5. Cards and left-hand navigation
      </Title>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        <Paper component="nav" withBorder radius="xs" aria-label={labels.navOverview}>
          {navItems.map((item) => (
            <NavLink
              key={item.id}
              href={`#section-5`}
              label={item.label}
              active={item.id === "records"}
            />
          ))}
        </Paper>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          {[
            { id: "monitor", title: labels.navRecords, body: labels.longMethodologyNotice },
            { id: "desinventar", title: labels.navSubmissions, body: labels.longRetentionNotice },
          ].map((card) => (
            <Card key={card.id} withBorder radius="xs" shadow="none" padding="md">
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
    </section>
  );
}
