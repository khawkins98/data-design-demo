/**
 * Shared navigation bar for documentation pages.
 * Each page passes its own key so the current page is highlighted.
 */

const PAGES = [
  { key: "scores", href: "./", label: "Ranking" },
  { key: "axes", href: "./axes.html", label: "Decision axes" },
  { key: "comparison", href: "./comparison.html", label: "Requirement matrix" },
  { key: "issues", href: "./issues.html", label: "Findings" },
  { key: "architecture", href: "./architecture-options.html", label: "Architecture" },
];

export function siteNavHtml(currentKey) {
  const items = PAGES.map((p) => {
    if (p.key === currentKey) {
      return `<span class="site-nav__current">${p.label}</span>`;
    }
    return `<a href="${p.href}">${p.label}</a>`;
  }).join("");
  return `<nav class="site-nav">${items}</nav>`;
}

export const siteNavCss = `
      .site-nav { display:flex; flex-wrap:wrap; gap:0; border-bottom:1px solid var(--border); margin:0 0 1.5rem; font-size:0.8125rem; }
      .site-nav a, .site-nav__current { padding:0.5rem 0.75rem; text-decoration:none; color:var(--muted); white-space:nowrap; }
      .site-nav a:hover { color:var(--text); background:var(--surface); }
      .site-nav__current { font-weight:700; color:var(--text); border-bottom:2px solid var(--accent); }`;
