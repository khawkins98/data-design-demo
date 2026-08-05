/**
 * Scaffold preview.
 *
 * Not one of the eight demos and not a candidate implementation. It exists so
 * the scaffold can be inspected and exercised before any Brief 1 run starts:
 * both host shells, the fixtures, the tokens, and — importantly — the
 * `?candidate=on|off` contract the leakage assertion depends on.
 *
 * The "candidate" subtree here is deliberately plain HTML with no component
 * library, so a leakage failure in this app means the harness itself is wrong.
 * That makes it the control the eight real runs are measured against.
 */

import { StrictMode, useState } from "react";
import type { ReactElement } from "react";
import { createRoot } from "react-dom/client";

import { HostShell as DeltaShell } from "@undrr-eval/host-delta";
import { HostShell as MangroveShell } from "@undrr-eval/host-mangrove";
import {
  LABELS,
  LOCALES,
  LOSS_RECORDS,
  OPTIONS_LARGE,
  OPTIONS_MEDIUM,
  OPTIONS_SMALL,
  TODAY_ISO,
  VALIDATION_CASES,
} from "@undrr-eval/fixtures";
import type { LocaleCode } from "@undrr-eval/fixtures";
import { TOKEN_COUNT, TOKEN_SCOPE_CLASS } from "@undrr-eval/undrr-tokens";

import "@undrr-eval/undrr-tokens/tokens.css";
import "./preview.css";

const params = new URLSearchParams(window.location.search);

/** Which host to render. The eight real apps each pick one at build time. */
const host = params.get("host") === "delta" ? "delta" : "mangrove";

/**
 * Loads only the selected host's stylesheet.
 *
 * Statically importing both was wrong and actively misleading: Mangrove's
 * global `a {}` rule won over Tailwind's `underline` utility, so the Delta host
 * rendered with Mangrove's link colour and no underline. Each real demo loads
 * exactly one host, and the preview has to match or it is not a valid control.
 *
 * Done inside an async function rather than with top-level await, which the
 * default browser build target does not support.
 */
async function loadHostStyles(): Promise<void> {
  if (host === "delta") {
    await import("@undrr-eval/host-delta/host.css");
    return;
  }
  await import("@undrr/undrr-mangrove/css/style.css");
  await import("@undrr-eval/host-mangrove/host.css");
}

/**
 * The leakage contract. When off, the host renders with an empty candidate
 * subtree, giving the harness its baseline.
 */
const candidateEnabled = params.get("candidate") !== "off";

/** Renders the fixture data with no component library involved. */
function PreviewContent({ locale }: { readonly locale: LocaleCode }): ReactElement {
  const labels = LABELS[locale];
  const rows = LOSS_RECORDS.slice(0, 8);

  return (
    <div className={TOKEN_SCOPE_CLASS}>
      <h2 className="preview__heading">Scaffold preview</h2>
      <p className="preview__note">
        This subtree stands in for a candidate library. It uses no component
        library at all, so the leakage assertion must pass here. If it fails,
        the harness is wrong, not the candidate.
      </p>

      <dl className="preview__stats">
        <div>
          <dt>Fixture rows</dt>
          <dd>{LOSS_RECORDS.length}</dd>
        </div>
        <div>
          <dt>Tokens</dt>
          <dd>{TOKEN_COUNT}</dd>
        </div>
        <div>
          <dt>Option lists</dt>
          <dd>
            {OPTIONS_SMALL.length} / {OPTIONS_MEDIUM.length} / {OPTIONS_LARGE.length}
          </dd>
        </div>
        <div>
          <dt>Fixed today</dt>
          <dd>{TODAY_ISO.slice(0, 10)}</dd>
        </div>
      </dl>

      <h3 className="preview__subheading">Long labels ({locale})</h3>
      <ul className="preview__labels">
        <li>{labels.longVerificationBanner}</li>
        <li>{labels.longMethodologyNotice}</li>
        <li>{labels.longRetentionNotice}</li>
      </ul>

      <h3 className="preview__subheading">Validation cases</h3>
      <ul className="preview__labels">
        {VALIDATION_CASES.map((testCase) => (
          <li key={testCase.kind}>
            <code>{testCase.kind}</code> on <code>{testCase.field}</code>:{" "}
            {labels[testCase.messageKey]}
          </li>
        ))}
      </ul>

      <h3 className="preview__subheading">
        {labels.colCountry} / {labels.colHazard} / {labels.colStatus}
      </h3>
      <table className="preview__table">
        <thead>
          <tr>
            <th scope="col">{labels.colCountry}</th>
            <th scope="col">{labels.colHazard}</th>
            <th scope="col">{labels.colEventDate}</th>
            <th scope="col">{labels.colPeopleAffected}</th>
            <th scope="col">{labels.colEconomicLoss}</th>
            <th scope="col">{labels.colStatus}</th>
            <th scope="col">{labels.colReviewNote}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.country}</td>
              <td>{row.hazardType}</td>
              <td>{row.eventDate}</td>
              <td className="preview__num">{row.peopleAffected.toLocaleString("en-GB")}</td>
              <td className="preview__num">{row.economicLossUsdMillions.toFixed(2)}</td>
              <td>{row.verificationStatus}</td>
              <td>{row.reviewNote ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function App(): ReactElement {
  const [locale, setLocale] = useState<LocaleCode>("en");
  const meta = LOCALES.find((l) => l.code === locale);
  const dir = meta?.dir ?? "ltr";
  const Shell = host === "delta" ? DeltaShell : MangroveShell;

  return (
    <>
      <div className="preview__toolbar" dir="ltr">
        <span className="preview__toolbar-label">Scaffold preview</span>

        <span className="preview__toolbar-group">
          host:
          <a href="?host=mangrove" aria-current={host === "mangrove" ? "true" : undefined}>
            mangrove
          </a>
          <a href="?host=delta" aria-current={host === "delta" ? "true" : undefined}>
            delta
          </a>
        </span>

        <span className="preview__toolbar-group">
          candidate:
          <a
            href={`?host=${host}&candidate=on`}
            aria-current={candidateEnabled ? "true" : undefined}
          >
            on
          </a>
          <a
            href={`?host=${host}&candidate=off`}
            aria-current={!candidateEnabled ? "true" : undefined}
          >
            off
          </a>
        </span>

        <span className="preview__toolbar-group">
          locale:
          {LOCALES.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => setLocale(l.code)}
              aria-current={l.code === locale ? "true" : undefined}
            >
              {l.code}
            </button>
          ))}
        </span>
      </div>

      <Shell title={LABELS[locale].appTitle} dir={dir}>
        {candidateEnabled ? <PreviewContent locale={locale} /> : null}
      </Shell>
    </>
  );
}

async function bootstrap(): Promise<void> {
  // Styles first, so the leakage snapshot never races a stylesheet still
  // arriving after the canaries have rendered.
  await loadHostStyles();

  const container = document.getElementById("root");
  if (!container) throw new Error("No #root element in index.html");

  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void bootstrap();
