/**
 * Section 9: host and candidate rendering of the same four things.
 *
 * Left column is plain Mangrove markup with Mangrove's own class names, exactly
 * as the host shell writes its canaries. Right column is Mantine, themed to the
 * UNDRR tokens.
 *
 * The two columns are NOT expected to match, and the gaps are the point:
 *   - Mangrove buttons are square, uppercase-ish condensed, 1px bordered, and
 *     use its blue; Mantine's are token-accent with a 4px radius.
 *   - Mangrove tables draw a full grey rule under every row from `body tr`;
 *     Mantine's row borders come from its own class and use the token border.
 *   - Mangrove cards are flat; Mantine's Card had to be pushed to
 *     `radius="xs" shadow="none"` to get close.
 *   - Mangrove nav links use a 3px inline-start accent bar. Mantine's NavLink
 *     marks the active item with a tinted background and exposes only
 *     `--nl-color`/`--nl-bg`/`--nl-hover`, so the bar is not reachable. This is
 *     the clearest single case of "themeable, but not to the host's shape".
 */

import type { ReactElement } from "react";
import {
  Button,
  Card,
  NavLink,
  Paper,
  Table,
  Text,
  Title,
} from "@mantine/core";

import { LOSS_RECORDS } from "@undrr-eval/fixtures";

import { useDemo } from "../demo-state.js";

const SAMPLE = LOSS_RECORDS.slice(0, 3);

export function SectionSideBySide(): ReactElement {
  const { labels } = useDemo();

  const navItems = [
    { id: "overview", label: labels.navOverview },
    { id: "records", label: labels.navRecords },
    { id: "submissions", label: labels.navSubmissions },
  ];

  return (
    <section id="section-9">
      <Title order={3} mb="md">
        9. Host and candidate, side by side
      </Title>

      <div className="demo-side-by-side">
        {/* Host column: Mangrove's own classes, no Mantine. */}
        <div>
          <Text size="xs" c="dimmed" tt="uppercase" mb="xs">
            Mangrove host
          </Text>

          <button type="button" className="mg-button mg-button-primary">
            {labels.actionSave}
          </button>

          <table className="mg-table mg-table--striped" style={{ marginTop: "0.75rem" }}>
            <thead>
              <tr>
                <th scope="col">{labels.colCountry}</th>
                <th scope="col">{labels.colStatus}</th>
              </tr>
            </thead>
            <tbody>
              {SAMPLE.map((record) => (
                <tr key={record.id}>
                  <th scope="row">{record.country}</th>
                  <td>{record.verificationStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <article className="mg-card" style={{ marginTop: "0.75rem" }}>
            <div className="mg-card__content">
              <h5 className="mg-card__title">{labels.navRecords}</h5>
              <p className="mg-card__description">{labels.longMethodologyNotice}</p>
            </div>
          </article>

          <ul className="mg-host__nav-list" style={{ marginTop: "0.75rem" }}>
            {navItems.map((item) => (
              <li key={item.id} className="mg-host__nav-item">
                <a className="mg-host__nav-link" href="#section-9">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Candidate column: Mantine, themed to the same tokens. */}
        <div>
          <Text size="xs" c="dimmed" tt="uppercase" mb="xs">
            Mantine, themed
          </Text>

          <Button>{labels.actionSave}</Button>

          <Table mt="sm" withTableBorder aria-label={`${labels.navRecords} (candidate)`}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{labels.colCountry}</Table.Th>
                <Table.Th>{labels.colStatus}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {SAMPLE.map((record) => (
                <Table.Tr key={record.id}>
                  <Table.Th scope="row">{record.country}</Table.Th>
                  <Table.Td>{record.verificationStatus}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>

          <Card withBorder radius="xs" shadow="none" padding="md" mt="sm">
            <Title order={5}>{labels.navRecords}</Title>
            <Text size="sm" c="dimmed" mt="xs">
              {labels.longMethodologyNotice}
            </Text>
          </Card>

          <Paper
            component="nav"
            withBorder
            radius="xs"
            mt="sm"
            aria-label={`${labels.navOverview} (candidate)`}
          >
            {navItems.map((item) => (
              <NavLink
                key={item.id}
                href="#section-9"
                label={item.label}
                active={item.id === "records"}
              />
            ))}
          </Paper>
        </div>
      </div>
    </section>
  );
}
