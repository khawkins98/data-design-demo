/**
 * Section 9: host and candidate rendering of the same four things.
 *
 * Left column is plain Delta markup using Tailwind utilities; right is MUI,
 * themed. The gap here is more visible than in the Mangrove run, because MUI
 * brings its own opinions on elevation, radius and density that the token
 * mapping only partly overrides.
 */

import type { ReactElement } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  List,
  ListItemButton,
  ListItemText,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

import { LOSS_RECORDS } from "@undrr-eval/fixtures";

import { useDemo } from "@undrr-eval/integration-mui";

const SAMPLE = LOSS_RECORDS.slice(0, 3);

export function SectionSideBySide(): ReactElement {
  const { labels } = useDemo();

  const navItems = [
    { id: "overview", label: labels.navOverview },
    { id: "records", label: labels.navRecords },
    { id: "submissions", label: labels.navSubmissions },
  ];

  return (
    <Box component="section" id="section-9" sx={{ mb: 8 }}>
      <Typography variant="h3" component="h3" sx={{ mb: 3 }}>
        9. Host and candidate, side by side
      </Typography>

      <Box
        sx={{
          display: "grid",
          gap: 4,
          gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
        }}
      >
        {/* Host column: plain markup with Delta's Tailwind utilities. */}
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="caption"
            component="h4"
            sx={{ textTransform: "uppercase", letterSpacing: "0.06em" }}
            color="text.secondary"
          >
            Delta host
          </Typography>

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

        {/* Candidate column: MUI, themed to the same tokens. */}
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="caption"
            component="h4"
            sx={{ textTransform: "uppercase", letterSpacing: "0.06em" }}
            color="text.secondary"
          >
            MUI, themed
          </Typography>

          <Button variant="contained">{labels.actionSave}</Button>

          <TableContainer sx={{ mt: 1.5 }}>
            <Table size="small" aria-label={`${labels.navRecords} (candidate)`}>
              <TableHead>
                <TableRow>
                  <TableCell>{labels.colCountry}</TableCell>
                  <TableCell>{labels.colStatus}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {SAMPLE.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell component="th" scope="row">
                      {record.country}
                    </TableCell>
                    <TableCell>{record.verificationStatus}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Card variant="outlined" elevation={0} sx={{ mt: 1.5 }}>
            <CardContent>
              <Typography variant="h5" component="h5">
                {labels.navRecords}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {labels.longMethodologyNotice}
              </Typography>
            </CardContent>
          </Card>

          <List component="nav" aria-label={`${labels.navOverview} (candidate)`} sx={{ mt: 1.5 }}>
            {navItems.map((item) => (
              <ListItemButton key={item.id} selected={item.id === "records"}>
                <ListItemText primary={item.label} />
              </ListItemButton>
            ))}
          </List>
        </Box>
      </Box>
    </Box>
  );
}
