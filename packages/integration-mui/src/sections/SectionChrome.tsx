/**
 * Section 5: cards and left-hand navigation, styled to match the host.
 *
 * Both are native: MUI has `Card` (unlike React Aria) and `List`/`ListItemButton`
 * for navigation. The interesting difference is that matching the *host* is
 * harder here — MUI's Card has its own elevation, radius and padding opinions,
 * so aligning it with Delta's flat bordered cards means overriding defaults
 * rather than starting from nothing.
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
            /* elevation 0 + a border: Delta's cards are flat, MUI's are not. */
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
