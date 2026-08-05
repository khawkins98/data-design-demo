/**
 * Section 9: host and candidate rendering of the same four things.
 *
 * Left column is plain Delta markup with Tailwind utilities; right is Mantine,
 * themed to the same tokens. The comparison to look at is the nav list: Delta's
 * is a bordered-start-edge anchor, and Mantine's `NavLink` active state is a
 * filled background, so the two do not converge without a Styles API override.
 * That override is deliberately NOT applied here — the point of this section is
 * to show the gap, not to hide it.
 */

import type { ReactElement } from "react";
import { Box, Button, Card, NavLink, SimpleGrid, Table, Text, Title } from "@mantine/core";

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
    <Box component="section" id="section-9" mb="s16">
      <Title order={3} mb="md">
        9. Host and candidate, side by side
      </Title>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        {/* Host column: plain markup with Delta's Tailwind utilities. */}
        <Box miw={0}>
          <Text size="xs" c="dimmed" tt="uppercase" fw="semibold" component="h4" mb="xs">
            Delta host
          </Text>

          <button
            type="button"
            className="inline-flex items-center justify-center rounded bg-sky-800 px-4 py-2 text-sm font-semibold text-white"
          >
            {labels.actionSave}
          </button>

          <table className="mt-3 w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-300">
                <th scope="col" className="py-2 pr-4 font-semibold">
                  {labels.colCountry}
                </th>
                <th scope="col" className="py-2 font-semibold">
                  {labels.colStatus}
                </th>
              </tr>
            </thead>
            <tbody>
              {SAMPLE.map((record) => (
                <tr key={record.id} className="border-b border-slate-200">
                  <th scope="row" className="py-2 pr-4 font-normal">
                    {record.country}
                  </th>
                  <td className="py-2">{record.verificationStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <article className="mt-3 rounded border border-slate-300 bg-white p-4">
            <div>
              <h5 className="font-semibold text-slate-900">{labels.navRecords}</h5>
              <p className="mt-1 text-sm text-slate-600">{labels.longMethodologyNotice}</p>
            </div>
          </article>

          <ul className="mt-3">
            {navItems.map((item) => (
              <li key={item.id} className="mt-1 first:mt-0">
                <a
                  href="#section-9"
                  className="block border-s-[3px] border-transparent px-3 py-2 text-sky-800 no-underline"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </Box>

        {/* Candidate column: Mantine, themed to the same tokens. */}
        <Box miw={0}>
          <Text size="xs" c="dimmed" tt="uppercase" fw="semibold" component="h4" mb="xs">
            Mantine, themed
          </Text>

          <Button variant="filled">{labels.actionSave}</Button>

          <Table mt="sm" aria-label={`${labels.navRecords} (candidate)`}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{labels.colCountry}</Table.Th>
                <Table.Th>{labels.colStatus}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {SAMPLE.map((record) => (
                <Table.Tr key={record.id}>
                  <Table.Th scope="row" fw="regular">
                    {record.country}
                  </Table.Th>
                  <Table.Td>{record.verificationStatus}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>

          <Card withBorder shadow="none" padding="md" radius="md" mt="sm">
            <Title order={5}>{labels.navRecords}</Title>
            <Text size="sm" c="dimmed" mt="xs">
              {labels.longMethodologyNotice}
            </Text>
          </Card>

          <Box component="nav" aria-label={`${labels.navOverview} (candidate)`} mt="sm">
            {navItems.map((item) => (
              <NavLink
                key={item.id}
                href="#section-9"
                label={item.label}
                active={item.id === "records"}
              />
            ))}
          </Box>
        </Box>
      </SimpleGrid>
    </Box>
  );
}
