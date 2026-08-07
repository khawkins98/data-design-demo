/**
 * Full-application view: React Aria carrying a whole DELTA records screen.
 *
 * `AppFrame` supplies the application toolbar (Tailwind utilities plus a real
 * `mg-button`), the sidebar navigation and a host strip below. Everything inside
 * the application region is React Aria: page header with summary text, a
 * COLLAPSIBLE filter card, a data table with row-action icon buttons and status
 * pills, pagination, and one modal flow — the delete confirmation.
 *
 * WHAT THIS VIEW ANSWERS THAT THE KITCHEN SINK DOES NOT: does React Aria carry
 * layout, or only controls? Honestly, only controls. Every component below is
 * React Aria; every piece of *layout* around them is ours. There is no page-header
 * component, no card, no filter bar, no toolbar, no pagination and no table
 * layout — see `views/views.css` for what that costs. That is a deliberate library
 * boundary (React Aria is behaviour and accessibility, not appearance), but on a
 * whole screen the boundary is where most of the work lands.
 *
 * THE MODAL FLOW IS THE PART REACT ARIA MAKES CHEAP. A row-triggered dialog is
 * not a `DialogTrigger` — the trigger is one of 10 buttons in a table and the
 * dialog must know which row it was opened for — so this uses a controlled
 * `ModalOverlay`. Focus containment, focus restoration back to the row's button,
 * scroll locking, Escape, `aria-modal` and `role="alertdialog"` all come from the
 * library. The only application code is which record is pending.
 *
 * THE KNOWN-ISSUES BOX goes through the frame's `notices` prop, not through
 * `children`. `AppFrame` renders it outside `data-candidate-root`, which is what
 * the kitchen sink achieves by putting it before the candidate wrapper: no
 * candidate stylesheet can restyle it, every demo's box reads identically, and it
 * is present in the `?candidate=off` baseline as well as the candidate render, so
 * it cannot itself register as a leakage difference. Passing it inside `children`
 * would break both properties and would also leave that subtree non-empty under
 * `?candidate=off`.
 *
 * `?candidate=off` renders the frame with an empty candidate subtree, exactly as
 * the kitchen sink does, because the leakage assertion loads this page twice.
 */

import { useMemo, useState } from "react";
import type { ReactElement } from "react";
import {
  Button,
  Dialog,
  Heading,
  I18nProvider,
  Modal,
  ModalOverlay,
  Radio,
  RadioGroup,
} from "react-aria-components";

import { LOCALES } from "@undrr-eval/fixtures";
import type { LocaleCode, LossRecord } from "@undrr-eval/fixtures";
import { AppFrame, ViewSwitcher } from "@undrr-eval/host-delta";
import { KnownIssues } from "@undrr-eval/known-issues";
import { viewLinks } from "@undrr-eval/test-harness/views";
import { TOKEN_SCOPE_CLASS } from "@undrr-eval/undrr-tokens";

import { DemoContext, labelsFor, useDemo } from "./demo-state.js";
import type { DemoContextValue } from "./demo-state.js";
import { MODAL_OVERLAY_CLASS } from "./overlay-class.js";
import { RecordsFilters } from "./views/RecordsFilters.js";
import { RecordsPagination } from "./views/RecordsPagination.js";
import { RecordsTable } from "./views/RecordsTable.js";
import { useOverlayDir, useRecordsView } from "./views/records-state.js";

const params = new URLSearchParams(window.location.search);

const candidateEnabled = params.get("candidate") !== "off";

/** Same control as the kitchen sink's section 8, so the three views switch alike. */
function LocaleSwitcher({
  locale,
  onChange,
}: {
  readonly locale: LocaleCode;
  readonly onChange: (next: LocaleCode) => void;
}): ReactElement {
  return (
    <RadioGroup
      className="demo-field demo-field--inline demo-locale"
      value={locale}
      onChange={(next) => onChange(next as LocaleCode)}
      aria-label="Locale"
      orientation="horizontal"
    >
      {LOCALES.map((entry) => (
        <Radio key={entry.code} value={entry.code} className="demo-locale__option">
          {entry.label}
        </Radio>
      ))}
    </RadioGroup>
  );
}

/**
 * Delete confirmation.
 *
 * Controlled rather than `DialogTrigger`-driven, because the trigger lives in a
 * table row and the dialog needs to know which record it was opened for. React
 * Aria restores focus to that row's button on close by itself.
 */
function DeleteDialog({
  record,
  onCancel,
  onConfirm,
}: {
  readonly record: LossRecord | null;
  readonly onCancel: () => void;
  readonly onConfirm: (record: LossRecord) => void;
}): ReactElement {
  const { labels } = useDemo();
  /*
    The overlay is portalled to document.body, outside the frame's `dir` element,
    so CSS `direction` does not inherit into it and the dialog renders LTR in
    Arabic unless direction is re-applied by hand. `I18nProvider` does not cover
    this: it crosses the portal through React context, CSS inheritance does not
    cross the DOM boundary. Documented in views/records-state.ts (useOverlayDir)
    and asserted in e2e/app.spec.ts.
  */
  const dir = useOverlayDir();

  return (
    <ModalOverlay
      className={MODAL_OVERLAY_CLASS}
      dir={dir}
      isOpen={record !== null}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
      isDismissable
    >
      <Modal className="demo-modal">
        {/* `role="alertdialog"` is the right role for a destructive confirmation
            and React Aria takes it as a prop rather than needing hand-written
            aria-modal / aria-labelledby wiring. */}
        <Dialog className="demo-dialog" role="alertdialog">
          <Heading slot="title" className="demo-dialog__title">
            {labels.actionDelete}
          </Heading>
          <p className="demo-prose">{labels.longRetentionNotice}</p>
          {record !== null ? (
            <p className="demo-dialog__detail">
              {record.id} · {record.country} · {record.hazardType}
            </p>
          ) : null}
          <div className="demo-dialog__actions">
            <Button
              className="demo-button demo-button--danger"
              onPress={() => {
                if (record !== null) onConfirm(record);
              }}
            >
              {labels.actionDelete}
            </Button>
            <Button className="demo-button" onPress={onCancel}>
              {labels.actionCancel}
            </Button>
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}

/**
 * The application region.
 *
 * Separated from `AppView` so none of its hooks run in the `?candidate=off`
 * baseline, and because `useRecordsView` reads `DemoContext`.
 */
function RecordsScreen(): ReactElement {
  const { labels } = useDemo();
  const [deletedIds, setDeletedIds] = useState<ReadonlySet<string>>(() => new Set());
  const [pendingDelete, setPendingDelete] = useState<LossRecord | null>(null);
  const [lastAction, setLastAction] = useState<string | null>(null);

  const view = useRecordsView({ excludedIds: deletedIds });

  return (
    <>
      <header className="demo-pageheader">
        <div className="demo-pageheader__text">
          <h2 className="demo-pageheader__title">{labels.navRecords}</h2>
          <p className="demo-pageheader__summary">
            {view.matched} / {view.total} · {labels.longVerificationBanner}
          </p>
        </div>
        <div className="demo-pageheader__actions">
          <Button className="demo-button demo-button--primary">{labels.actionExport}</Button>
        </div>
      </header>

      <RecordsFilters view={view} collapsible />

      <RecordsTable
        rows={view.rows}
        sort={view.sort}
        onSortChange={view.setSort}
        onDelete={setPendingDelete}
      />

      <RecordsPagination view={view} id="app-page-size" />

      {/*
        Announced rather than rendered as a toast: React Aria's toast component
        is not in the free tier, so a live region is the honest equivalent.

        THE ELEMENT STAYS MOUNTED, THE STYLING DOES NOT. A live region has to be
        in the DOM before its content changes or the change is not announced, so
        conditionally rendering the whole `<p>` would trade a visual bug for a
        silent one. But `.demo-status--success` carries unconditional padding and
        a pale-green background, so with `{lastAction ?? ""}` inside it the first
        paint showed a 1008x16px empty green strip above the dialog — a status
        message reporting nothing. Dropping the classes while keeping the node
        leaves an empty `<p>` with no box, and the announcement path untouched.
      */}
      <p
        className={lastAction === null ? undefined : "demo-status demo-status--success"}
        role="status"
      >
        {lastAction}
      </p>

      <DeleteDialog
        record={pendingDelete}
        onCancel={() => setPendingDelete(null)}
        onConfirm={(record) => {
          setDeletedIds((current) => new Set(current).add(record.id));
          setLastAction(`${labels.actionDelete}: ${record.id}`);
          setPendingDelete(null);
        }}
      />
    </>
  );
}

export function AppView(): ReactElement {
  const [locale, setLocale] = useState<LocaleCode>("en");

  const demo: DemoContextValue = useMemo(() => {
    const meta = LOCALES.find((entry) => entry.code === locale);
    return {
      locale,
      labels: labelsFor(locale),
      bcp47: meta?.bcp47 ?? "en-GB",
      dir: meta?.dir ?? "ltr",
    };
  }, [locale]);

  return (
    <AppFrame
      title={demo.labels.appTitle}
      dir={demo.dir}
      pageHeader={
        /*
         * Host chrome, reaching the page through the frame's `pageHeader` slot rather
         * than `notices` - the known-issues box is a caveat about this page and
         * belongs with the content, the switcher is the way off it and belongs with
         * the frame - so it renders outside `data-candidate-root` in both states.
         * `application` is listed but `island` is not: the island view is
         * Mangrove-only, and a link to an `island.html` this app does not ship
         * would be a dead end — the exact problem the switcher exists to fix.
         */
        <ViewSwitcher
          views={viewLinks(["application", "inventory"], "application")}
          pairingName="Adobe React Aria on Delta"
          otherHost={{ label: "React Aria on Mangrove", href: "../mangrove-react-aria/" }}
        />
      }
      notices={<KnownIssues candidate="react-aria" host="delta" candidateName="Adobe React Aria" />}
    >
      {candidateEnabled ? (
        /**
         * `I18nProvider` carries locale and direction into every React Aria
         * component, including the portalled dialog. `dir` still goes to the
         * frame, whose toolbar and sidebar are not React Aria's to flip.
         */
        <I18nProvider locale={demo.bcp47}>
          <DemoContext.Provider value={demo}>
            <div
              className={`${TOKEN_SCOPE_CLASS} demo demo-view`}
              data-locale={locale}
              data-view="app"
            >
              <div className="demo-row">
                <LocaleSwitcher locale={locale} onChange={setLocale} />
              </div>
              <RecordsScreen />
            </div>
          </DemoContext.Provider>
        </I18nProvider>
      ) : null}
    </AppFrame>
  );
}
