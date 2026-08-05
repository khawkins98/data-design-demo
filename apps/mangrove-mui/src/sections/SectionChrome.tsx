/**
 * Section 5: cards and left-hand navigation, styled to match the host.
 *
 * Both are native: MUI has `Card` and `List`/`ListItemButton`, so no composition
 * is needed. Matching the *host* is where the work is, and it is harder against
 * Mangrove than against Delta. Mangrove's `mg-card` is square-cornered with a
 * flat white surface and its own internal padding scale, while MUI's Card ships
 * elevation, a radius from `shape.borderRadius` and CardContent padding. Going
 * `variant="outlined"` and `elevation={0}` removes the shadow, but the radius and
 * type scale still come from the UNDRR tokens rather than from Mangrove — and
 * Mangrove 1.8.1 exposes no runtime tokens to point MUI at. See EVIDENCE.md.
 */

import type { ReactElement } from "react";
import {
  Box,
  Card,
  CardContent,
  List,
  ListItemButton,
  ListItemText,
  Typography,
} from "@mui/material";

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
    <Box component="section" id="section-5" sx={{ mb: 8 }}>
      <Typography variant="h3" component="h3" sx={{ mb: 3 }}>
        5. Cards and left-hand navigation
      </Typography>

      <Box
        sx={{
          display: "grid",
          gap: 4,
          gridTemplateColumns: { xs: "1fr", md: "minmax(12rem, 16rem) minmax(0, 1fr)" },
          alignItems: "start",
        }}
      >
        <List
          component="nav"
          aria-label={labels.navOverview}
          sx={{ border: 1, borderColor: "divider", borderRadius: 1, py: 0 }}
        >
          {navItems.map((item) => (
            <ListItemButton key={item.id} selected={item.id === "records"}>
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </List>

        <Box
          sx={{
            display: "grid",
            gap: 3,
            gridTemplateColumns: "repeat(auto-fit, minmax(14rem, 1fr))",
          }}
        >
          {[
            { id: "monitor", title: labels.navRecords, body: labels.longMethodologyNotice },
            { id: "desinventar", title: labels.navSubmissions, body: labels.longRetentionNotice },
          ].map((card) => (
            /* elevation 0 + a border: Mangrove's cards are flat, MUI's are not. */
            <Card key={card.id} variant="outlined" elevation={0}>
              <CardContent>
                <Typography variant="h4" component="h4" sx={{ mb: 1 }}>
                  {card.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {card.body}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
