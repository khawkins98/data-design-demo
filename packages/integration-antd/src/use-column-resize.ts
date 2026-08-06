/**
 * Column resizing for antd's Table, which does not have any.
 *
 * antd 6.5.3 ships no column sizing of any kind: there is no `resizable` on
 * `ColumnType`, and nothing in the underlying `@rc-component/table` provides it -
 * the `resize` matches in that package are `ResizeObserver` for sticky headers
 * and cell measurement, not column sizing. antd's own documentation reaches for
 * `react-resizable` for this, and `docs/requirements.md` forbids substituting a
 * third-party package for a missing capability. So this is ours, and the
 * requirement scores `custom`.
 *
 * That puts antd alongside Mantine, which had the same gap, and against React
 * Aria, where `ResizableTableContainer` and `ColumnResizer` are native.
 *
 * Keyboard support is included deliberately rather than as a nicety. A
 * pointer-only resize handle is a WCAG 2.1.1 failure, and React Aria's native
 * implementation is keyboard-operable, so a mouse-only version here would make
 * the comparison flattering rather than fair.
 */

import { useCallback, useRef, useState } from "react";

/** Resize state keyed by antd column `key`. */
export type ColumnWidths = Readonly<Record<string, number>>;

const MIN_WIDTH = 80;
const MAX_WIDTH = 640;
/** One arrow press. Matches the step React Aria's ColumnResizer uses. */
const KEYBOARD_STEP = 16;

const clamp = (value: number): number => Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, value));

export interface ColumnResize {
  readonly widths: ColumnWidths;
  /** Pointer-drag handler for a resize grip. */
  readonly onPointerDown: (key: string, startWidth: number) => (event: React.PointerEvent) => void;
  /** Keyboard handler for the same grip, so resizing is not pointer-only. */
  readonly onKeyDown: (key: string, currentWidth: number) => (event: React.KeyboardEvent) => void;
  readonly widthOf: (key: string, fallback: number) => number;
}

export function useColumnResize(initial: ColumnWidths = {}): ColumnResize {
  const [widths, setWidths] = useState<ColumnWidths>(initial);
  // Held in a ref so the move handler does not re-subscribe on every frame.
  const drag = useRef<{ key: string; startX: number; startWidth: number } | null>(null);

  const widthOf = useCallback(
    (key: string, fallback: number): number => widths[key] ?? fallback,
    [widths],
  );

  const onPointerDown = useCallback(
    (key: string, startWidth: number) => (event: React.PointerEvent) => {
      // Left button only, and never let the click reach the header's sort toggle.
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();

      drag.current = { key, startX: event.clientX, startWidth };
      const target = event.currentTarget as HTMLElement;
      target.setPointerCapture(event.pointerId);

      const move = (moveEvent: PointerEvent) => {
        const state = drag.current;
        if (!state) return;
        // In RTL the pointer moves the other way relative to the column edge.
        const dir = getComputedStyle(target).direction === "rtl" ? -1 : 1;
        const next = clamp(state.startWidth + dir * (moveEvent.clientX - state.startX));
        setWidths((current) => ({ ...current, [state.key]: next }));
      };
      const up = () => {
        drag.current = null;
        target.releasePointerCapture(event.pointerId);
        target.removeEventListener("pointermove", move);
        target.removeEventListener("pointerup", up);
      };
      target.addEventListener("pointermove", move);
      target.addEventListener("pointerup", up);
    },
    [],
  );

  const onKeyDown = useCallback(
    (key: string, currentWidth: number) => (event: React.KeyboardEvent) => {
      const delta =
        event.key === "ArrowRight" ? KEYBOARD_STEP : event.key === "ArrowLeft" ? -KEYBOARD_STEP : 0;
      if (delta === 0) return;
      event.preventDefault();
      event.stopPropagation();
      setWidths((current) => ({ ...current, [key]: clamp(currentWidth + delta) }));
    },
    [],
  );

  return { widths, onPointerDown, onKeyDown, widthOf };
}
