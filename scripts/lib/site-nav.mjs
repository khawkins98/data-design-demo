/**
 * Shared Mangrove-styled shell for documentation pages.
 *
 * Uses the Mangrove decoration bar and mega-topbar navigation from the
 * IslandFrame the demo apps use, adapted for the static doc pages. The
 * toolbar with UNDRR logo is omitted — this is an evaluation deliverable,
 * not a UNDRR-branded product. The full Mangrove stylesheet is loaded
 * separately — this module only emits the HTML and a small supplement for
 * doc-page-specific layout.
 */

const PAGES = [
  { key: "scores", href: "./", label: "Ranking" },
  { key: "architecture", href: "./architecture-options.html", label: "Architecture" },
  { key: "prototypes", href: "./prototypes.html", label: "Prototypes" },
  { key: "axes", href: "./axes.html", label: "Evidence axes" },
  { key: "issues", href: "./issues.html", label: "Technical findings" },
  { key: "comparison", href: "./comparison.html", label: "Requirement audit" },
];

/**
 * Page header + navigation bar.
 * Returns the decoration bar and mega-topbar nav (no UNDRR logo toolbar).
 */
export function siteNavHtml(currentKey) {
  const navItems = PAGES.map((p) => {
    const activeClass = p.key === currentKey ? " mg-mega-topbar__item--active" : "";
    const current = p.key === currentKey ? ' aria-current="page"' : "";
    return `<li class="mg-mega-topbar__item${activeClass}">
              <a class="mg-mega-topbar__item-link" href="${p.href}"${current}>${p.label}</a>
            </li>`;
  }).join("\n          ");

  return `
    <a class="skip-link" href="#main">Skip to main content</a>
    <header id="header" class="mg-page-header mg-page-header--default">
      <div class="mg-page-header__decoration" aria-hidden="true">
        <div></div><div></div><div></div><div></div>
      </div>
    </header>

    <nav class="mg-mega-wrapper" aria-label="Main Navigation">
      <ul class="mg-mega-topbar | mg-container mg-container-full-width">
          ${navItems}
      </ul>
    </nav>`;
}

/**
 * Supplementary CSS for doc pages.
 * Mangrove's style.css handles the header, topbar, typography, and containers.
 * This adds just the doc-specific overrides.
 */
export const siteNavCss = `
      .skip-link { position:absolute; z-index:100; inset-block-start:0.5rem; inset-inline-start:0.5rem;
        padding:0.5rem 0.75rem; background:#fff; color:#004f91; transform:translateY(-150%); }
      .skip-link:focus { transform:translateY(0); }
      .mg-docs-main { max-width:72ch; }
      .mg-docs-main h1 { font-size:1.75rem; margin:2rem 0 0.5rem; }
      .mg-docs-main h2 { margin-top:2.5rem; font-size:1.25rem; border-bottom:1px solid #d5d5d5; padding-bottom:0.25rem; }
      .mg-docs-main h3 { margin-top:2rem; font-size:1.05rem; }
      .mg-docs-main h4 { margin-top:1.5rem; font-size:1rem; }
      .audience-banner {
        margin:1rem 0 1.5rem; padding:0.75rem 1rem; border-inline-start:3px solid #64748b;
        background:#f3f6f8; color:#334155; font-size:0.875rem;
      }
      .audience-tag {
        display:inline-flex; align-items:center; min-height:1.35rem; margin-inline-end:0.45rem;
        padding:0.05rem 0.45rem; border:1px solid #94a3b8; border-radius:999px;
        color:#475569; background:#f8fafc; font-size:0.6875rem; font-weight:700;
        letter-spacing:0.045em; text-transform:uppercase; vertical-align:middle;
      }
      details.technical-detail {
        margin:1rem 0; border:1px solid #cbd5e1; border-radius:6px; background:#f8fafc;
      }
      details.technical-detail > summary {
        padding:0.7rem 0.85rem; cursor:pointer; color:#334155; font-weight:600;
      }
      .technical-detail__body { padding:0 0.9rem 0.9rem; border-top:1px solid #e2e8f0; }
      .technical-detail__body > :first-child { margin-top:0.9rem; }
      @media print {
        .skip-link, .mg-page-header, .mg-mega-wrapper { display:none !important; }
        details.technical-detail > summary { display:list-item; break-after:avoid; }
        details.technical-detail:not([open]) > *:not(summary) { display:block; }
        details.technical-detail { break-inside:auto; }
        .technical-detail__body > :first-child { break-before:avoid; }
        @page { margin:1.5cm; }
      }
`;
