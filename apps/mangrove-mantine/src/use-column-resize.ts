/**
 * Column resizing, written from scratch.
 *
 * `table-column-resize-or-reorder` is the requirement Mantine comes closest to
 * failing outright. There is no column sizing behaviour anywhere in
 * `@mantine/core` or `@mantine/hooks`: no resize, no reorder, no drag handles,
 * nothing on `Table.Th`. `Splitter` exists but resizes layout panes, not table
 * columns, and cannot be nested inside a `<tr>`.
 *
 * The Mantine ecosystem's usual answer is `mantine-datatable`, which is a
 * THIRD-PARTY package outside `@mantine/*`. Brief 1 forbids installing one to
 * fill a gap, so this is hand-written instead, and the status is `custom` rather
 * than `unsupported`: the requirement is reachable, it just costs this file.
 *
 * What it does, and what a native implementation would have given for free:
 *   - pointer drag on a handle in each header cell, with a minimum width
 *   - KEYBOARD resizing: the handle is a focusable `role="separator"` with
 *     `aria-valuenow`, adjustable with arrow keys and resettable with Home.
 *     Most hand-rolled resizers stop at the mouse; React Aria's
 *     `ResizableTableContainer` does not, so leaving it out would have made this
 *     comparison flattering rather than accurate.
 *   - pointer capture, so a drag that leaves the window still ends cleanly
 *
 * What it still does NOT do, and a native one would: announce the new width to
 * assistive technology as it changes, respect a max width derived from content,
 * or persist widths across a re-render of the column set.
 */

import { useCallback, useRef, useState } from "react";

/** Pixels below which a column cannot be dragged. */
const MIN_WIDTH = 72;

/** Keyboard step, and the larger step for PageUp/PageDown. */
const STEP = 16;
const BIG_STEP = 64;

export interface ColumnResize {
  /** Current width per column key, seeded from the defaults on first drag. */
  readonly widths: Readonly<Record<string, number>>;
  /** Key of the column being dragged, or null. */
  readonly resizing: string | null;
  /** Props to spread onto the handle inside a header cell. */
  readonly handleProps: (key: string, label: string) => Record<string, unknown>;
}

export function useColumnResize(
  defaults: Readonly<Record<string, number>>,
): ColumnResize {
  const [widths, setWidths] = useState<Record<string, number>>({ ...defaults });
  const [resizing, setResizing] = useState<string | null>(null);
  const dragStart = useRef<{ x: number; width: number } | null>(null);

  const setWidth = useCallback((key: string, next: number) => {
    setWidths((current) => ({ ...current, [key]: Math.max(MIN_WIDTH, Math.round(next)) }));
  }, []);

  const handleProps = useCallback(
    (key: string, label: string): Record<string, unknown> => ({
      className: "demo-resizer",
      role: "separator",
      tabIndex: 0,
      "aria-orientation": "vertical",
      "aria-label": `Resize column ${label}`,
      "aria-valuenow": widths[key] ?? defaults[key] ?? MIN_WIDTH,
      "aria-valuemin": MIN_WIDTH,
      "data-resizing": resizing === key,
      onPointerDown: (event: React.PointerEvent<HTMLElement>) => {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        dragStart.current = {
          x: event.clientX,
          width: widths[key] ?? defaults[key] ?? MIN_WIDTH,
        };
        setResizing(key);
      },
      onPointerMove: (event: React.PointerEvent<HTMLElement>) => {
        const start = dragStart.current;
        if (!start || resizing !== key) return;
        setWidth(key, start.width + (event.clientX - start.x));
      },
      onPointerUp: (event: React.PointerEvent<HTMLElement>) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
        dragStart.current = null;
        setResizing(null);
      },
      onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => {
        const width = widths[key] ?? defaults[key] ?? MIN_WIDTH;
        const deltas: Record<string, number> = {
          ArrowRight: STEP,
          ArrowLeft: -STEP,
          PageUp: BIG_STEP,
          PageDown: -BIG_STEP,
        };
        if (event.key === "Home") {
          event.preventDefault();
          setWidth(key, defaults[key] ?? MIN_WIDTH);
          return;
        }
        const delta = deltas[event.key];
        if (delta === undefined) return;
        event.preventDefault();
        setWidth(key, width + delta);
      },
    }),
    [defaults, resizing, setWidth, widths],
  );

  return { widths, resizing, handleProps };
}
