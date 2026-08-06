/**
 * Section 9: host and candidate rendering of the same four things.
 *
 * Left column is plain Mangrove markup using Mangrove's own classes —
 * `mg-button mg-button-primary`, `mg-table mg-table--striped`, `mg-card` — so it
 * is styled by the design system itself rather than by an approximation. Right is
 * MUI, themed to the UNDRR tokens.
 *
 * The gap is wider here than in the delta-mui run. Mangrove is a strongly
 * opinionated visual system: square corners, heavy borders, Roboto, a specific
 * blue. The token palette MUI is themed to is neutral, so "themed to match the
 * host" is not reachable through the token mapping alone — matching Mangrove
 * would mean theming MUI against Mangrove's own values, which 1.8.1 does not
 * expose at runtime at all. That is the finding, and it is why this section is
 * worth screenshotting rather than describing.
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
        {/* Host column: plain markup with Mangrove's own classes. */}
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="caption"
            component="h4"
            sx={{ textTransform: "uppercase", letterSpacing: "0.06em" }}
            color="text.secondary"
          >
            Mangrove host
          </Typography>

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

          <ul style={{ marginTop: "0.75rem" }}>
            {navItems.map((item) => (
              <li key={item.id}>
                <a href="#section-9">{item.label}</a>
              </li>
            ))}
          </ul>
        </Box>

        {/* Candidate column: MUI, themed to the UNDRR tokens. */}
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
