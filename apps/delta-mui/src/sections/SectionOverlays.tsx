/**
 * Section 4: modal, tooltip, popover and accordion.
 *
 * All four are native and this is MUI's strongest section: Dialog, Tooltip,
 * Popover and Accordion are single components with the focus management,
 * positioning and ARIA already handled.
 *
 * Worth noting for the comparison: MUI renders overlays into a portal at
 * document.body by default, i.e. outside the candidate subtree. The leakage
 * assertion only inspects the host canaries so this does not trip it, but it
 * does mean overlay content escapes any containment scoped to the subtree —
 * which is why the theme pins MUI's z-index layers to the token scale.
 */

import { useState } from "react";
import type { ReactElement } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Popover,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";

import { useDemo } from "../demo-state.js";

export function SectionOverlays(): ReactElement {
  const { labels } = useDemo();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [expanded, setExpanded] = useState<string | false>("methodology");

  return (
    <Box component="section" id="section-4" sx={{ mb: 8 }}>
      <Typography variant="h3" component="h3" sx={{ mb: 3 }}>
        4. Modal, tooltip, popover and accordion
      </Typography>

      <Stack direction="row" spacing={2} useFlexGap sx={{ mb: 3, flexWrap: "wrap" }}>
        <Button variant="contained" onClick={() => setDialogOpen(true)}>
          Open modal
        </Button>

        {/* Tooltip is keyboard-focus triggered as well as hover by default. */}
        <Tooltip title={labels.longMethodologyNotice}>
          <Button variant="outlined">Hover or focus for tooltip</Button>
        </Tooltip>

        <Button variant="outlined" onClick={(event) => setAnchor(event.currentTarget)}>
          Open popover
        </Button>
      </Stack>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>{labels.appTitle}</DialogTitle>
        <DialogContent>
          <DialogContentText>{labels.longVerificationBanner}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => setDialogOpen(false)}>
            {labels.actionSave}
          </Button>
          <Button onClick={() => setDialogOpen(false)}>{labels.actionCancel}</Button>
        </DialogActions>
      </Dialog>

      <Popover
        open={anchor !== null}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <Box sx={{ p: 3, maxWidth: "22rem" }}>
          <Typography variant="h4" component="h4" sx={{ mb: 1 }}>
            {labels.colStatus}
          </Typography>
          <Typography variant="body2">{labels.longRetentionNotice}</Typography>
        </Box>
      </Popover>

      {[
        { id: "methodology", title: labels.colDataSource, body: labels.longMethodologyNotice },
        { id: "retention", title: labels.colReviewNote, body: labels.longRetentionNotice },
        { id: "accessibility", title: labels.colNarrative, body: labels.longAccessibilityNotice },
      ].map((item) => (
        <Accordion
          key={item.id}
          expanded={expanded === item.id}
          onChange={(_event, isExpanded) => setExpanded(isExpanded ? item.id : false)}
        >
          <AccordionSummary aria-controls={`${item.id}-panel`} id={`${item.id}-header`}>
            {item.title}
          </AccordionSummary>
          <AccordionDetails id={`${item.id}-panel`}>
            <Typography variant="body2">{item.body}</Typography>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
}
