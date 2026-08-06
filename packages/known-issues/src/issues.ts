/**
 * Known integration issues, as data.
 *
 * The point of this registry is that a reader looking at one demo should not have
 * to open EVIDENCE.md to discover that the integration in front of them has a
 * known limitation. The kitchen-sink page looks fine in a screenshot; "MUI cannot
 * do RTL in the Community tier" and "antd loses every style conflict to Mangrove"
 * do not show up unless you are looking for them.
 *
 * Written as a registry rather than as prose in each app for two reasons. An issue
 * that affects both hosts is stated once, so the two demos cannot drift apart in
 * how they describe it. And the same data can drive the landing page and the
 * comparison without a second copy.
 *
 * EVERY entry here must be traceable. `evidence` points at the file that measured
 * it, and figures quoted in `detail` must match what that file records. Do not add
 * an issue that has only been reasoned about: this box is the most prominent text
 * on the page and it has to be the most reliable.
 */

export type IssueSeverity = "blocker" | "caveat" | "decision" | "info";

export interface IssueLink {
  readonly label: string;
  readonly href: string;
}

export interface KnownIssue {
  readonly id: string;
  readonly severity: IssueSeverity;
  /** Candidate ids this applies to, or "*" for every candidate. */
  readonly candidates: readonly string[];
  /** Host ids this applies to, or "*" for both. */
  readonly hosts: readonly string[];
  readonly title: string;
  /** One or two sentences. Specific and measured, not a warning label. */
  readonly detail: string;
  /** Whose problem it is, which is usually the first thing a reader wants. */
  readonly owner: "candidate" | "host" | "pairing" | "this evaluation";
  readonly links: readonly IssueLink[];
}

const REPO = "https://github.com/khawkins98/data-design-demo";
const BLOB = `${REPO}/blob/main`;

/** Severity order for display: worst first. */
export const SEVERITY_ORDER: readonly IssueSeverity[] = ["blocker", "decision", "caveat", "info"];

export const KNOWN_ISSUES: readonly KnownIssue[] = Object.freeze([
  /* ---------------------------------------------------------------- MUI --- */
  {
    id: "mui-rtl-unfixable",
    severity: "blocker",
    candidates: ["mui"],
    hosts: ["*"],
    owner: "candidate",
    title: "RTL is not achievable in the MUI Community tier",
    detail:
      "MUI positions its outlined floating label with a physical `left` that theme direction does not flip. Measured in Arabic: the label sits 870px from the field it names, at all three viewports. The documented fix is stylis-plugin-rtl, a package outside the candidate's own ecosystem, which this evaluation's rules forbid. Arabic is one of UNDRR's four locales, so this is not cosmetic.",
    links: [
      { label: "measurement", href: `${BLOB}/apps/mangrove-mui/test-results/rtl-label-offset.json` },
      { label: "evidence", href: `${BLOB}/apps/mangrove-mui/EVIDENCE.md` },
    ],
  },
  {
    id: "mui-build-time-theme",
    severity: "caveat",
    candidates: ["mui"],
    hosts: ["*"],
    owner: "candidate",
    title: "A design-token change requires rebuilding every site",
    detail:
      "MUI's createTheme() reads the token module and emits its own values, so token values live inside each site's JavaScript bundle. Zero `var(--undrr-*)` references survive into the shipped CSS. Changing a Mangrove colour means recompiling and redeploying every consuming site, where a custom-property consumer would pick it up from a stylesheet swap.",
    links: [{ label: "axis A5", href: "../axes.html" }],
  },

  /* ---------------------------------------------------------------- antd -- */
  {
    id: "antd-layer-loses-to-mangrove",
    severity: "decision",
    candidates: ["antd"],
    hosts: ["mangrove"],
    owner: "pairing",
    title: "Mangrove overrides Ant Design entirely, because Mangrove has no cascade layers",
    detail:
      "Ant Design's CSS is wrapped in a CSS @layer, and unlayered CSS beats layered CSS regardless of specificity. Mangrove 1.8.1 declares zero @layer at-rules, so its element rules win outright: the inputs on this page render with Mangrove's 2px #1a1a1a border, 46px height, square corners and Roboto, measured byte-identical to a bare Mangrove input. The controlHeight and borderRadius design tokens do not reach them. This cost zero lines of repair CSS, where the MUI pairing needed 27 lines to prevent it. Whether that is desirable is UNDRR's decision, and it is reversible per site by dropping the layer setting. If Mangrove adopts cascade layers, the behaviour inverts and Ant Design starts winning instead.",
    links: [
      { label: "evidence", href: `${BLOB}/apps/mangrove-antd/EVIDENCE.md` },
      { label: "compare against the Delta host", href: "../delta-antd/" },
      { label: "Mangrove tracker", href: `${REPO}/issues/4` },
    ],
  },
  {
    id: "antd-measure-row-aria",
    severity: "caveat",
    candidates: ["antd"],
    hosts: ["*"],
    owner: "candidate",
    title: "The data table has an upstream accessibility defect",
    detail:
      "rc-table renders a hidden measure row with aria-hidden=\"true\" whenever horizontal scrolling is enabled, and row selection places a focusable checkbox inside it. That is an aria-hidden-focus violation and it is not reachable through Ant Design's public API without giving up either row selection or horizontal scrolling. Both are ordinary requirements for a UNDRR table.",
    links: [{ label: "axe result", href: `${BLOB}/apps/delta-antd/test-results/axe-06-data-table.json` }],
  },
  {
    id: "antd-seeds-lack-contrast",
    severity: "caveat",
    candidates: ["antd"],
    hosts: ["*"],
    owner: "candidate",
    title: "Ant Design's derived greys do not inherit the palette's contrast",
    detail:
      "Ant Design computes its secondary, description, placeholder and label colours from one base colour by lowering opacity. That produced four axe colour-contrast failures from a palette whose own secondary text passes at 7.3:1, and colorTextSecondary is not settable by name at all. The reachable tokens were pinned back by hand, but any component whose colour is not set explicitly needs auditing rather than trusting.",
    links: [{ label: "evidence", href: `${BLOB}/apps/delta-antd/EVIDENCE.md` }],
  },
  {
    id: "antd-build-time-theme",
    severity: "caveat",
    candidates: ["antd"],
    hosts: ["*"],
    owner: "candidate",
    title: "A design-token change requires rebuilding every site",
    detail:
      "The theme is a JavaScript object resolved when the bundle is built. Ant Design does have a CSS-variable mode that would make token changes live, but it emits its own custom properties at :root level, which puts the candidate's palette in the same global scope as the host and defeats containment. It was deliberately left off.",
    links: [{ label: "axis A5", href: "../axes.html" }],
  },

  /* -------------------------------------------------------------- Carbon -- */
  {
    id: "carbon-unreachable-tokens",
    severity: "blocker",
    candidates: ["carbon"],
    hosts: ["*"],
    owner: "candidate",
    title: "Carbon cannot express about 30% of the UNDRR design tokens",
    detail:
      "21 to 22 of the 71 UNDRR tokens have no Carbon token to attach to. That is a ceiling rather than a cost: no amount of effort closes the gap, because there is no hook. Every other candidate reaches all 71.",
    links: [{ label: "axis A5", href: "../axes.html" }],
  },
  {
    id: "carbon-off-route-overrides",
    severity: "caveat",
    candidates: ["carbon"],
    hosts: ["*"],
    owner: "candidate",
    title: "Matching the host needed 15 to 16 overrides outside Carbon's supported theming route",
    detail:
      "Carbon documents `--cds-*` custom properties as the way to theme it, and documents its `cds--` class names as an internal BEM convention whose prefix consumers may reconfigure. Getting this page to match the host still needed 15 to 16 selectors reaching those class names. They are stable in practice, but each is a place the supported route did not reach, and that count multiplies across sites.",
    links: [{ label: "axis A2", href: "../axes.html" }],
  },
  {
    id: "carbon-global-stylesheet",
    severity: "caveat",
    candidates: ["carbon"],
    hosts: ["*"],
    owner: "candidate",
    title: "Carbon's documented stylesheet cannot be loaded as documented",
    detail:
      "The prebuilt stylesheet opens with a global reset over 46 bare element selectors including *, html, body, h1-h6, a, table and button. Measured, it changes 79 computed properties across all 14 host canary elements. This demo imports only the component partials instead, which is a deviation from Carbon's documented setup.",
    links: [{ label: "evidence", href: `${BLOB}/apps/delta-carbon/EVIDENCE.md` }],
  },
  {
    id: "carbon-telemetry",
    severity: "decision",
    candidates: ["carbon"],
    hosts: ["*"],
    owner: "candidate",
    title: "Carbon sends usage telemetry to IBM on install",
    detail:
      "Telemetry was found in 21 Carbon and IBM Plex packages, enabled by default. This is a procurement and data-governance question for UNDRR rather than a technical one, and it does not appear in any feature comparison.",
    links: [{ label: "decisions issue", href: `${REPO}/issues/8` }],
  },
  {
    id: "carbon-leakage-failure",
    severity: "blocker",
    candidates: ["carbon"],
    hosts: ["mangrove"],
    owner: "pairing",
    title: "This pairing fails the style-containment assertion",
    detail:
      "Carbon restyles the host outside its own subtree here: the leakage assertion records differences across the host's canary elements after the candidate mounts. It is the only failing containment result in the evaluation, and it is reported rather than worked around because an honest failure is a result.",
    links: [{ label: "leakage result", href: `${BLOB}/apps/mangrove-carbon/test-results/leakage.json` }],
  },

  /* ---------------------------------------------------------- React Aria -- */
  {
    id: "react-aria-css-cost",
    severity: "caveat",
    candidates: ["react-aria"],
    hosts: ["*"],
    owner: "candidate",
    title: "React Aria is unstyled, so this page carries 121 to 133 CSS rules",
    detail:
      "React Aria ships behaviour and accessibility, not appearance. Every visual decision on this page is a stylesheet this repository owns. The upside is that none of those rules reach an undocumented class name: they target published data-* state attributes, so they survive DOM restructuring in a way class-based overrides do not.",
    links: [{ label: "axis A2", href: "../axes.html" }],
  },
  {
    id: "react-aria-no-multiselect",
    severity: "caveat",
    candidates: ["react-aria"],
    hosts: ["*"],
    owner: "candidate",
    title: "Several controls had to be composed rather than dropped in",
    detail:
      "There is no multiselect component, no Card, and the table's select-all checkbox had to be built by hand with an explicit selection slot. An earlier version of this evaluation recorded select-all as a native feature while rendering zero checkboxes; that error was caught by cross-checking against the other host and is recorded rather than quietly fixed.",
    links: [{ label: "evidence", href: `${BLOB}/apps/mangrove-react-aria/EVIDENCE.md` }],
  },
  {
    id: "react-aria-hidden-bug",
    severity: "caveat",
    candidates: ["react-aria"],
    hosts: ["mangrove"],
    owner: "host",
    title: "A Mangrove specificity bug makes hidden inputs visible in this pairing",
    detail:
      "Mangrove styles bare inputs by type at a specificity that beats the `[hidden]` attribute, so React Aria's hidden helper inputs render as visible form fields. This was originally misrecorded here as a React Aria defect that could not be fixed through its public API. It is Mangrove's, and scoping the fix took the critical axe count from 1 to 0. The same bug is inert against MUI, Mantine and Carbon by accident of how each renders.",
    links: [{ label: "Mangrove tracker", href: `${REPO}/issues/4` }],
  },

  /* ------------------------------------------------------------- Mantine -- */
  {
    id: "mantine-no-column-sizing",
    severity: "caveat",
    candidates: ["mantine", "antd"],
    hosts: ["*"],
    owner: "candidate",
    title: "Column resizing does not exist in the library and is implemented here",
    detail:
      "Neither Mantine nor Ant Design provides column resizing or reordering of any kind, and both point at third-party packages that this evaluation's rules forbid substituting. The behaviour on this page is code this repository owns and would have to maintain, including keyboard operation, which a pointer-only implementation would fail WCAG 2.1.1 without.",
    links: [{ label: "the requirement", href: "../requirements.md" }],
  },
  {
    id: "mantine-build-time-theme",
    severity: "caveat",
    candidates: ["mantine"],
    hosts: ["*"],
    owner: "candidate",
    title: "A design-token change mostly requires rebuilding every site",
    detail:
      "Mantine's createTheme() bakes token values into each bundle: only 6 `var(--undrr-*)` references survive into the shipped CSS. A Mangrove colour change means recompiling every consuming site rather than swapping a stylesheet.",
    links: [{ label: "axis A5", href: "../axes.html" }],
  },

  /* ---------------------------------------------- host-wide, any candidate -- */
  {
    id: "mangrove-no-runtime-tokens",
    severity: "info",
    candidates: ["*"],
    hosts: ["mangrove"],
    owner: "host",
    title: "Mangrove 1.8.1 exposes no design tokens at runtime",
    detail:
      "The published stylesheet declares zero CSS custom properties, so the candidate on this page is themed to a neutral UNDRR token set rather than to Mangrove's own palette. Matching Mangrove exactly is not reachable through any candidate's theming API until Mangrove ships custom properties. The forthcoming 2.0 work is expected to change this.",
    links: [
      { label: "host derivation", href: "../host-derivation.md" },
      { label: "Mangrove tracker", href: `${REPO}/issues/4` },
    ],
  },
  {
    id: "mangrove-inline-links",
    severity: "info",
    candidates: ["*"],
    hosts: ["mangrove"],
    owner: "host",
    title: "Mangrove's inline link styling fails WCAG 1.4.1",
    detail:
      "Mangrove's base rule distinguishes inline links from surrounding body text by colour alone. Any axe run against the whole page on this host reports it. It is a host finding, present regardless of which candidate is mounted, and it is not counted against the candidate.",
    links: [{ label: "Mangrove tracker", href: `${REPO}/issues/4` }],
  },
  {
    id: "harness-static-css-limitation",
    severity: "info",
    candidates: ["*"],
    hosts: ["*"],
    owner: "this evaluation",
    title: "The containment check cannot see statically imported stylesheets",
    detail:
      "The leakage assertion compares computed styles before and after the candidate subtree mounts, so it detects runtime-injected CSS but is blind to a stylesheet imported at build time. Where a pairing's CSS is scoped by construction that is verified by reading the stylesheet, not by measurement, and the distinction is recorded.",
    links: [{ label: "the harness", href: `${BLOB}/packages/test-harness/src/leakage.ts` }],
  },
]);

/** Does this issue apply to the given pairing? */
function applies(issue: KnownIssue, candidate: string, host: string): boolean {
  const candidateMatch = issue.candidates.includes("*") || issue.candidates.includes(candidate);
  const hostMatch = issue.hosts.includes("*") || issue.hosts.includes(host);
  return candidateMatch && hostMatch;
}

/**
 * Issues for one pairing, worst first.
 *
 * Pure, so it is unit-tested rather than trusted: a box that silently shows the
 * wrong pairing's issues would be worse than no box.
 */
export function issuesFor(candidate: string, host: string): readonly KnownIssue[] {
  return KNOWN_ISSUES.filter((issue) => applies(issue, candidate, host)).sort(
    (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity),
  );
}
