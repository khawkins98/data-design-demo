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
  { key: "axes", href: "./axes.html", label: "Decision axes" },
  { key: "comparison", href: "./comparison.html", label: "Requirement matrix" },
  { key: "issues", href: "./issues.html", label: "Findings" },
  { key: "architecture", href: "./architecture-options.html", label: "Architecture" },
];

/**
 * Page header + navigation bar.
 * Returns the decoration bar and mega-topbar nav (no UNDRR logo toolbar).
 */
export function siteNavHtml(currentKey) {
  const navItems = PAGES.map((p) => {
    const activeClass = p.key === currentKey ? " mg-mega-topbar__item--active" : "";
    return `<li class="mg-mega-topbar__item${activeClass}" role="none">
              <a class="mg-mega-topbar__item-link" href="${p.href}" role="menuitem">${p.label}</a>
            </li>`;
  }).join("\n          ");

  return `
    <header id="header" class="mg-page-header mg-page-header--default">
      <div class="mg-page-header__decoration" aria-hidden="true">
        <div></div><div></div><div></div><div></div>
      </div>
    </header>

    <nav class="mg-mega-wrapper" aria-label="Main Navigation">
      <ul class="mg-mega-topbar | mg-container mg-container-full-width"
          role="menubar" aria-label="Main navigation menu">
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
      .mg-docs-main { max-width:72ch; }
      .mg-docs-main h1 { font-size:1.75rem; margin:2rem 0 0.5rem; }
      .mg-docs-main h2 { margin-top:2.5rem; font-size:1.25rem; border-bottom:1px solid #d5d5d5; padding-bottom:0.25rem; }
      .mg-docs-main h3 { margin-top:2rem; font-size:1.05rem; }
      .mg-docs-main h4 { margin-top:1.5rem; font-size:1rem; }
`;
