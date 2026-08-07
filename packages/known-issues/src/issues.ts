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
  /**
   * Who owns the defect. This field decides whether a finding may affect a
   * candidate's score, so it is the most consequential field in the registry.
   *
   * - `candidate`  a property of the library UNDRR would adopt. Counts.
   * - `pairing`    an interaction between a candidate and a host. Counts.
   * - `third party` a dependency the candidate pulls in, not the candidate's own
   *   code. Counts at a discount: it indicts a choice, not the library.
   * - `host`       Delta's or Mangrove's own behaviour. Does NOT count against a
   *   candidate; it is the same for all five.
   * - `our implementation` a bug or omission in THIS repository's demo code.
   *   Must NOT count. Scoring a library down for a caret we forgot to draw ranks
   *   our mistakes rather than the libraries, and the first such finding - React
   *   Aria's missing sort indicator - was caught only because a reviewer clicked
   *   a column header and asked whether it was ours.
   * - `this evaluation` a limitation of the scaffold or harness rather than of
   *   any candidate. Does not count.
   */
  readonly owner:
    | "candidate"
    | "pairing"
    | "third party"
    | "host"
    | "our implementation"
    | "this evaluation";
  readonly links: readonly IssueLink[];
  /**
   * Set when the defect has been fixed, describing what the fix was.
   *
   * Resolved findings are kept, not deleted. Almost all of them are
   * `owner: "our implementation"`, and a record of the bugs this evaluation found
   * in its own code is what entitles it to report bugs in anyone else's. It also
   * stops the same mistake being made twice, which is the ordinary reason to keep
   * a bug report after the fix.
   *
   * They are excluded from the demo pages by `openIssuesFor` and never counted by
   * the scoring layer.
   */
  readonly resolved?: string;
  /**
   * What it would take to make this defect go away. Required on blockers and
   * decisions, asserted by the registry's tests.
   *
   * Added because the scoring layer could rank severity but not cost of escape, and
   * a flat list of blockers implied that four very different propositions were
   * equivalent. They are not: one is a setting, one is a prop, one needs an upstream
   * release, one is forbidden by the brief, and one cannot be escaped at all without
   * abandoning the library's documented setup. That distinction is the most likely
   * decider of the shortlist, so it belongs in a field rather than in a reader's
   * inference from prose.
   *
   * - `config`          reversible per site by changing a setting we already control.
   * - `per-site-code`   fixable in consuming code, at a cost repeated per site.
   * - `upstream-only`   needs a change in the library; nothing consuming code can do.
   * - `out-of-scope`    a fix exists but this evaluation's rules forbid it, so it is
   *                     a policy decision for UNDRR rather than an engineering one.
   * - `inherent`        cannot be escaped while using the library as documented.
   */
  readonly remediability?: "config" | "per-site-code" | "upstream-only" | "out-of-scope" | "inherent";
}

const REPO = "https://github.com/khawkins98/data-design-demo";
const BLOB = `${REPO}/blob/main`;

/** Severity order for display: worst first. */
export const SEVERITY_ORDER: readonly IssueSeverity[] = ["blocker", "decision", "caveat", "info"];

/**
 * The owners whose findings may affect a candidate's score.
 *
 * The single gate between the diagnostic layer and the scoring layer, and the
 * reason it is a named export rather than an inline filter: a ranking is only
 * meaningful if it counts defects belonging to the thing being chosen.
 *
 * `host` is excluded because Delta and Mangrove behave identically for all five
 * candidates, so a host defect cannot discriminate between them. `our
 * implementation` and `this evaluation` are excluded because they are ours -
 * counting them would rank our own mistakes. All three stay fully visible in the
 * diagnostics; they simply do not move a number.
 *
 * `third party` counts, because choosing a library means accepting what it pulls
 * in, but it is weighted at a discount in the scoring generator: Carbon shipping
 * flatpickr's LTR-only calendar is a weaker charge than Carbon's own CSS failing
 * to mirror would be.
 */
export const SCOREABLE_OWNERS: readonly KnownIssue["owner"][] = [
  "candidate",
  "pairing",
  "third party",
];

export const KNOWN_ISSUES: readonly KnownIssue[] = Object.freeze([
  /* ---------------------------------------------------------------- MUI --- */
  {
    id: "mui-rtl-unfixable",
    /*
     * WAS A BLOCKER AGAINST MUI, AND SHOULD NEVER HAVE BEEN. Reclassified to our own
     * implementation, which is what the `owner` field is for: a defect only counts
     * against a candidate if the candidate caused it. This one was caused by us
     * doing two thirds of MUI's documented RTL setup.
     *
     * The reclassification is deliberately visible rather than a quiet deletion,
     * because it changes MUI's standing on a shortlist. It removes one of MUI's two
     * blockers.
     */
    severity: "caveat",
    remediability: "per-site-code",
    candidates: ["mui"],
    hosts: ["*"],
    owner: "our implementation",
    title: "We recorded MUI as incapable of RTL after doing two thirds of its setup",
    detail:
      "MUI's RTL guide has three steps: `dir`, a theme with `direction: \"rtl\"`, and an emotion cache carrying an RTL stylis plugin. This evaluation did the first two, measured the result and recorded a BLOCKER - \"RTL is not achievable in the MUI Community tier\" - with the outlined floating label sitting 710px from the field it names at 1280px. Steps 1 and 2 only flip components that read `theme.direction` in their own code; step 3 is what flips the emitted CSS, so without it every physical `left`/`right` MUI writes stays physical. The blocker also said the fix was forbidden by the rule against packages outside the candidate's ecosystem - true of the `styled-components` community `stylis-plugin-rtl`, last published 2021, but not of `@mui/stylis-plugin-rtl`, which lives in the `mui/material-ui` monorepo, is MIT, is released in lockstep with `@mui/material` and is in the Community tier. So the rule never applied. This is the second time an RTL defect of ours was written down as MUI's; see [[ours-rtl-defect-attributed-to-the-library]].",
    resolved:
      "An emotion `CacheProvider` carrying `@mui/stylis-plugin-rtl` wraps the candidate subtree in all four MUI views (src/direction.tsx). Measured after: the label sits 15px from its field's logical start, inside the 14px MUI reserves for the notch. Both MUI apps now pass their full suites - the two deliberately-failing RTL assertions were written to fail the day the defect was fixed, and both did. The cost is two dependencies and one provider; it is not per-component work.",
    links: [
      { label: "the provider", href: `${BLOB}/apps/delta-mui/src/direction.tsx` },
      {
        label: "MUI's RTL guide",
        href: "https://mui.com/material-ui/customization/right-to-left/",
      },
      { label: "axis A6", href: "../axes.html" },
    ],
  },
  {
    id: "mui-rtl-needs-a-third-setup-step",
    /*
     * What survives against MUI once the blocker above is withdrawn, and it is
     * genuinely MUI's: a setup cost, and a failure mode that is silent.
     */
    severity: "caveat",
    remediability: "config",
    candidates: ["mui"],
    hosts: ["*"],
    owner: "candidate",
    title: "MUI needs a third setup step for RTL, and fails silently without it",
    detail:
      "Alone among the five candidates, MUI cannot mirror from a `dir` attribute. It needs `dir`, a theme rebuilt with `direction`, AND an emotion cache carrying `@mui/stylis-plugin-rtl` - two extra dependencies and a provider at the root of every tree that renders MUI. The cost is small and one-off. The risk is not: with only the first two steps the components that read `theme.direction` in JavaScript flip correctly, so the page LOOKS mirrored, while every physical offset in MUI's emitted CSS stays put. This evaluation was fooled by exactly that for weeks and recorded a blocker over it. React Aria, Mantine, Ant Design and Carbon all mirror from `dir` alone.",
    links: [
      {
        label: "MUI's RTL guide",
        href: "https://mui.com/material-ui/customization/right-to-left/",
      },
      { label: "the provider", href: `${BLOB}/apps/delta-mui/src/direction.tsx` },
      { label: "axis A6", href: "../axes.html" },
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
    id: "antd-select-value-hidden-on-mangrove",
    severity: "blocker",
    // Dropping antd's `layer` setting reverses it: antd's CSS then out-specifies
    // Mangrove and the value shows. The cost is that antd stops inheriting the
    // Mangrove look for free, which is what the layer setting bought.
    remediability: "config",
    candidates: ["antd"],
    hosts: ["mangrove"],
    owner: "pairing",
    title: "Select controls do not display their selected value",
    detail:
      "Ant Design 6 renders Select as a div holding the visible value with a readonly input absolutely positioned over it, which antd's own CSS makes transparent. Because antd's CSS is layered and Mangrove's is not, Mangrove's element-level input rules win and paint that input opaque white at 46px over a 24px content div, so the SELECTED VALUE is covered and a reviewer cannot see what they filtered by. MEASURED BY INK, not by hit-testing: screenshot the control, count dark pixels inside the value's own rect, recolour the text transparent, count again. A chosen value gives 302 on Delta and 0 on Mangrove. The placeholder survives on both, because antd renders it in a flex item whose z-index:1 paints above the opaqued input while a chosen value is a bare text node with no box and no stacking context - so at rest the control looks fine on Mangrove and goes blank only once someone uses it. The Delta host is genuinely unaffected, by the same measurement, because Tailwind compiles Preflight into @layer base and antd's later layer wins there. DO NOT use elementFromPoint as the discriminator: it returns the overlaid input on BOTH hosts, by antd's design, so it reads as a defect everywhere and distinguishes nothing. An earlier version of this entry cited exactly that, and was wrong to. This is the concrete consequence of antd-layer-loses-to-mangrove, and it is why keeping the layer setting on Mangrove is not a matter of taste.",
    links: [
      {
        label: "ink measurement, Mangrove",
        href: `${BLOB}/apps/mangrove-antd/test-results/island-filter-resting-text.json`,
      },
      {
        label: "ink measurement, Delta",
        href: `${BLOB}/apps/delta-antd/test-results/app-filter-resting-text.json`,
      },
      { label: "see it", href: "../mangrove-antd/island.html" },
      { label: "compare against the Delta host", href: "../delta-antd/app.html" },
    ],
  },
  {
    id: "antd-layer-loses-to-mangrove",
    severity: "decision",
    remediability: "config",
    candidates: ["antd"],
    hosts: ["mangrove"],
    owner: "pairing",
    title: "Mangrove overrides Ant Design entirely, because Mangrove has no cascade layers",
    detail:
      "Ant Design's CSS is wrapped in a CSS @layer, and unlayered CSS beats layered CSS regardless of specificity. Mangrove 1.8.1 declares zero @layer at-rules, so its element rules win outright: the inputs on this page render with Mangrove's 2px #1a1a1a border, 46px height, square corners and Roboto, measured byte-identical to a bare Mangrove input. The controlHeight and borderRadius design tokens do not reach them. This cost zero lines of repair CSS, where the MUI pairing needed 27 lines to prevent it. It is reversible per site by dropping the layer setting, and if Mangrove adopts cascade layers the behaviour inverts and Ant Design starts winning instead. WHAT CHANGED: this was recorded as a decision between two acceptable appearances. The island view showed it is not. Mangrove's element rules also cover Select's own value - see antd-select-value-hidden-on-mangrove - so the choice is between Ant Design's look and a working control, not between two looks. The kitchen sink could not surface that, because its selects start with no value and a blank select reads as an empty one.",
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
    // No amount of consuming-side effort closes this: there is no hook to attach
    // those tokens to. Only Carbon can add one.
    remediability: "upstream-only",
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
    remediability: "config",
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
    // Restyling the document is what @carbon/styles is for. Containment is possible
    // only by abandoning the documented install for a hand-composed Sass entry, which
    // is a different product with a different upgrade path - so as documented, inherent.
    remediability: "inherent",
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
    title: "React Aria is unstyled, so these pairings carry 155 to 213 CSS rules",
    detail:
      "React Aria ships behaviour and accessibility, not appearance. Every visual decision on these pages is a stylesheet this repository owns. Counted as declaration blocks in the apps' own CSS: 155 on Mangrove and 213 on Delta. The figure is DERIVED and published in the A2 table on axes.html, so it does not need maintaining here - an earlier version of this entry carried a hand-counted number that was already stale. The figure was 121 to 133 before the step wizard and the DELTA menu bar were built - both of which four other candidates got largely for free, and which added about 70 rules here. The upside is unchanged and real: none of those rules reach an undocumented class name - they target published data-* state attributes, so they survive DOM restructuring in a way class-based overrides do not.",
    links: [{ label: "axis A2", href: "../axes.html" }],
  },
  {
    id: "react-aria-sort-no-indicator",
    severity: "caveat",
    candidates: ["react-aria"],
    hosts: ["*"],
    owner: "our implementation",
    title: "Sortable columns show no visual sort indicator - our bug, not the library's",
    detail:
      "Clicking a column header sorts the table and nothing visibly changes. The library is not at fault: react-aria-components 1.20.0 exposes sortDirection as a Column render prop and sets aria-sort itself, so assistive technology is told the state correctly. What is missing is any caret or arrow in our markup and any sort rule in our stylesheets - a visual-only gap, which means sighted keyboard and mouse users get no feedback while screen-reader users do. Recorded here rather than quietly fixed because it is the first example of a class of finding this evaluation must separate out: a defect in our demo code must never count against the library being evaluated.",
    links: [{ label: "axis A7", href: "../axes.html" }],
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
    id: "mantine-modal-close-unnamed",
    severity: "blocker",
    // closeButtonProps takes an aria-label, so any consuming site can fix it - but
    // every site must remember to, on every Modal, forever, and the fixtures carry no
    // "close" string to feed it.
    remediability: "per-site-code",
    candidates: ["mantine"],
    hosts: ["*"],
    owner: "candidate",
    title: "Modal's close button ships with no accessible name",
    detail:
      "Mantine's Modal renders `.mantine-Modal-close` with no accessible name, which axe reports as a CRITICAL button-name violation. The same family of defect affects Pagination's four edge controls. It is fixable per site with closeButtonProps, but the fixtures carry no 'close' string and reusing the cancel label produces two identically named dismiss controls in one dialog, so the realistic layouts ship withCloseButton={false} instead - Escape still closes. Found only by the full-application view: the kitchen sink has the identical defect and cannot see it, because its modal portals outside [data-candidate-root] and its axe run is scoped to that subtree. Every scoped scan in this repository has the same blind spot.",
    links: [
      { label: "axis A7", href: "../axes.html" },
      { label: "evidence", href: `${BLOB}/apps/delta-mantine/EVIDENCE.md` },
    ],
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

  {
    id: "portalled-overlay-leaves-the-token-scope",
    severity: "caveat",
    remediability: "per-site-code",
    candidates: ["react-aria"],
    hosts: ["*"],
    owner: "our implementation",
    title: "A portalled menu left the token scope, and every tokened rule silently died",
    detail:
      "The UNDRR custom properties are scoped to a `.undrr-tokens` wrapper inside the candidate subtree, and React Aria portals its `Popover` to `document.body` - outside it. So every `var(--undrr-*)` in the menu stylesheet resolved to nothing, and because an unresolved custom property makes the whole declaration invalid, CSS discarded each one and reported nothing. MEASURED before the fix: no border (`0px none`), no radius, zero padding on the panel and on every item, the label at the inherited 16px instead of 0.875rem, and the description black instead of muted. Only the literal values - the box shadow and the white background - survived, which is exactly why it looked deliberate rather than broken. Same portal boundary that loses CSS `direction` in this pairing's delete dialog: React context crosses a portal, CSS inheritance does not.",
    resolved:
      "The token scope class is applied to the `Popover` itself, so the properties resolve inside the portal. Two token names were also wrong - `--undrr-color-text` and `--undrr-color-text-muted` do not exist, against `--undrr-color-text-primary` and `--undrr-color-text-secondary` - and had been silently dropped in 12 declarations; an audit of every `var(--undrr-*)` reference across all apps and packages now reports none undefined without a fallback.",
    links: [
      { label: "the menu", href: `${BLOB}/apps/delta-react-aria/src/views/NavMenu.tsx` },
      { label: "axis A5", href: "../axes.html" },
    ],
  },
  /* --------------------------------------------------- the DELTA menu bar -- */
  /*
   * DELTA's menu bar was host chrome that only LOOKED like a menu: four links with
   * a caret that opened nothing. Real DELTA composes it from PrimeReact's
   * `Menubar`, so replacing PrimeReact means replacing a menu, and the single
   * most-used component on the estate was going unmeasured. `AppFrame` now takes a
   * `navMenu` slot and each pairing builds the bar with its own library, from the
   * same model transcribed from DELTA's own `RegularMenuBar`.
   *
   * All measured on the built pages at 1440px, not read from documentation.
   */
  {
    id: "antd-dropdown-trigger-has-no-aria",
    severity: "caveat",
    // Escapable: the trigger is our own `Button`, so the attributes can be written
    // by hand and wired to `onOpenChange`. Not escapable by configuration, and it
    // recurs on every trigger on every site.
    remediability: "per-site-code",
    candidates: ["antd"],
    hosts: ["*"],
    owner: "candidate",
    title: "Ant Design's dropdown trigger tells a screen reader nothing",
    detail:
      "Measured on the built page, before opening and after: antd's `Dropdown` puts NO `aria-haspopup`, NO `aria-expanded` and NO `aria-controls` on its trigger. The other four candidates all set haspopup and toggle expanded - React Aria, MUI and Carbon with `aria-haspopup=\"true\"`, Mantine with `\"menu\"`. So a screen-reader user hears \"DATA, button\" with no indication that it opens a menu or that the menu is now open, and DELTA's four top-level navigation items become four buttons that appear to do nothing. Same species as [[antd-disabled-step-leaves-the-tree]]: the visual affordance is complete and the accessible one is absent.",
    links: [
      { label: "the menu", href: `${BLOB}/apps/delta-antd/src/views/NavMenu.tsx` },
      { label: "axis A7", href: "../axes.html" },
    ],
  },
  {
    id: "mantine-disabled-menu-item-is-natively-disabled",
    severity: "caveat",
    remediability: "per-site-code",
    candidates: ["mantine"],
    hosts: ["*"],
    owner: "candidate",
    title: "Mantine's disabled menu item is removed from the keyboard's reach",
    detail:
      "`Menu.Item` with `disabled` renders a `<button>` carrying the NATIVE `disabled` attribute and `tabindex=\"-1\"`, and no `aria-disabled`. A natively disabled button is not focusable, so a screen-reader user arrowing through the menu never lands on the item and is never told it exists - the item is invisible rather than unavailable. The WAI-ARIA practices ask for menu items to stay focusable precisely so unavailability is discoverable. MUI and Carbon use `aria-disabled` with `tabindex=\"-1\"`; React Aria is the only one of the five that leaves the item genuinely focusable. Recorded because this evaluation first assumed Mantine did the right thing here and had to measure to find out otherwise.",
    links: [
      { label: "the menu", href: `${BLOB}/apps/delta-mantine/src/views/NavMenu.tsx` },
      { label: "axis A7", href: "../axes.html" },
    ],
  },
  {
    id: "no-candidate-has-a-menu-item-description-slot",
    severity: "caveat",
    remediability: "per-site-code",
    candidates: ["react-aria", "mui", "mantine", "antd"],
    hosts: ["*"],
    owner: "candidate",
    title: "No candidate has a slot for DELTA's two-line menu item",
    detail:
      "DELTA's menu items are a bold label above muted supporting text - `RegularMenuBar` renders it through a custom `itemRenderer`, and every item under DATA and ANALYSIS uses it. Not one of the five candidates has a prop for it. React Aria is cheapest, because `MenuItem` imposes no internal structure and two spans just work; Mantine likewise, once measured - this evaluation first recorded that `Menu.Item` takes a `description` prop, which it does not, and the prop was accepted silently and rendered nothing. MUI needs `flexDirection: \"column\"` because `MenuItem` lays children out in a row, and its native route (`ListItemText secondary`) brings Typography's own colour and spacing. Ant Design accepts a ReactNode as `label` but sizes the cell for one line, so the item's height becomes ours.",
    links: [
      { label: "the model", href: `${BLOB}/packages/host-delta/src/menu-model.ts` },
      { label: "axis A1", href: "../axes.html" },
    ],
  },
  {
    id: "carbon-menu-item-label-is-a-string",
    severity: "caveat",
    // `inherent`: `label` is typed as a string and rendered into Carbon's own
    // element. There is no children slot to reach past it without rebuilding the
    // component, which is not "using the library as documented".
    remediability: "inherent",
    candidates: ["carbon"],
    hosts: ["*"],
    owner: "candidate",
    title: "Carbon's menu item cannot hold DELTA's supporting line at all",
    detail:
      "Carbon is the one candidate where DELTA's existing menu item cannot be reproduced. `MenuItem` takes `label` as a STRING and renders it into its own `.cds--menu-item__label`; there is no children slot. The only other text slot is `shortcut`, intended for keyboard hints, which renders muted at the inline end rather than beneath the label - so the demo uses it and looks visibly wrong, deliberately, rather than disguising the gap. `OverflowMenuItem`'s `itemText` is a string too. Carbon also has no avatar component, so the profile trigger is a labelled button rather than the initials circle the design file shows.",
    links: [
      { label: "the menu", href: `${BLOB}/apps/delta-carbon/src/views/NavMenu.tsx` },
      { label: "axis A5", href: "../axes.html" },
    ],
  },
  {
    id: "menu-slot-hoists-the-provider",
    severity: "caveat",
    remediability: "per-site-code",
    candidates: ["mantine"],
    hosts: ["delta"],
    // Ours: the slot is this evaluation's design, and the consequence is a
    // property of that design meeting Mantine's requirements.
    owner: "this evaluation",
    title: "Putting Mantine in host chrome forces its provider around the whole page",
    detail:
      "Mantine components throw without `MantineProvider` in the tree - \"MantineProvider was not found in component tree\" - and the menu bar renders inside the host frame, above where the provider used to sit. So the provider had to be hoisted to wrap `AppFrame` itself. The consequence is real and is recorded rather than hidden: Mantine's CSS variables and `:where([dir])` rules now apply to the whole page rather than to the candidate subtree, so this pairing's blast radius is larger by construction. The wrapper is conditional on `?candidate=on`, so the leakage baseline is untouched and the assertion still compares like with like. MUI needed no equivalent change because it falls back to a default theme instead of throwing; React Aria has no such provider at all. Any real site adopting a library for shared chrome inherits this same question.",
    links: [
      { label: "the frame", href: `${BLOB}/packages/host-delta/src/AppFrame.tsx` },
      { label: "axis A4", href: "../axes.html" },
    ],
  },
  /* ------------------------------------------------------- the step wizard -- */
  /*
   * These six come from one screen built five times: DELTA's add-disaster-event
   * wizard, which the incumbent PrimeReact renders with its own `Stepper`. It is
   * the only requirement in this evaluation that the candidates do NOT all satisfy
   * the same way, which is why it was worth building - comparison.md's 300
   * assessments found every candidate covers every component and so discriminated
   * between nothing.
   *
   * The result is the reverse of the expected one. Four candidates ship a stepper
   * and NONE of them marks the current step in the accessibility tree, so all five
   * demos - including the four with a real component to use - hand-write
   * `aria-current="step"`. What a shipped stepper saves is the CSS, not the
   * semantics. Recorded per candidate rather than as one entry because the failures
   * are not the same failure: three omit the state, and MUI asserts a wrong one.
   */
  {
    id: "stepper-omits-aria-current",
    severity: "caveat",
    // One attribute per library, so cheap - but it is per site, forever, and it
    // has to be known about first. Nothing in any of the four APIs suggests it.
    remediability: "per-site-code",
    candidates: ["antd", "carbon", "mantine", "mui"],
    hosts: ["*"],
    owner: "candidate",
    title: "No candidate's stepper marks the current step for a screen reader",
    detail:
      "Measured in all four: `aria-current=\"step\"` is emitted by none of them and offered as a prop by none of them. antd marks the current step with a CSS class only; Mantine with `data-progress=\"true\"`; MUI with `aria-selected` (see its own entry); Carbon with a visually hidden English span reading \"Current\" that folds the state into the accessible name - \"Event basics Required Current\" - and stays English in all four locales unless every step is given `translateWithId`. Each demo adds the attribute by hand. None of the four ships a live region either, so the progress announcement is hand-written five times out of five.",
    links: [
      { label: "the wizard", href: `${BLOB}/apps/delta-antd/src/views/EventWizard.tsx` },
      { label: "axis A7", href: "../axes.html" },
    ],
  },
  {
    id: "mui-stepper-announces-a-tablist",
    severity: "caveat",
    /*
     * `inherent`, and the split matters. The wrong ARIA is escapable in per-site
     * code - five attributes overridden - but only because both components spread
     * `...other` AFTER their own `role`, which is an accident of implementation and
     * not a documented extension point. What cannot be escaped at all is the roving
     * tab index: the same child-sniffing flag installs it, there is no opt-out prop,
     * and it is not reachable from application code. So after the fix the indicator
     * still has tab-set keyboard behaviour while no longer claiming to be a tab set.
     */
    remediability: "inherent",
    candidates: ["mui"],
    hosts: ["*"],
    owner: "candidate",
    title: "MUI announces an ordered wizard as a tab list",
    detail:
      "`Stepper` sniffs its children, finds `StepButton` and silently switches into tab-list mode: `role=\"tablist\"` plus `aria-orientation` on the root, `role=\"tab\"` + `aria-selected` + `aria-posinset`/`aria-setsize` on every step, and `role=\"presentation\"` on the `Step` list items. There is no opt-out prop. A tab set tells a screen-reader user the panels are peers they may visit in any order, which is the opposite of a wizard that gates later steps - and it is the one thing about a stepper that ARIA has a documented answer for. Correcting the role also makes MUI's hard-coded `aria-orientation` a CRITICAL axe violation, `aria-allowed-attr`, because it is invalid on `role=\"group\"`; axe found it. Six attributes are overridden by hand and the roving tab index cannot be removed. THIS IS NEW, AND MUI RAISED THE OBJECTION AGAINST ITSELF: v5 through v7 emitted `aria-current=\"step\"`, the correct value; PR #47687 replaced it in v9.0.0 (April 2026) and the migration guide records the swap as an accessibility improvement. On 2026-01-27 a MUI maintainer asked on issue #43689 \"Wouldn't it be a bit odd if Stepper provides all the `tab` roles except `tabpanel`?\", and the PR's own author replied the same day \"I'm currently hesitant in turning the stepper into a tab list. I think the ordered list markup, combined with the `aria-current` and step buttons pointing to the content area is enough.\" That is the last human comment on the thread; a commit titled `refactor as tablist` landed two weeks later and the issue was closed by a bot. The question was never answered. No opt-out was added, and MUI's screen-reader test matrix did not exist when this shipped - it was drafted a month after v9.0.0 and does not include Stepper. THE PRACTICAL HARM IS SMALLER THAN THE PRINCIPLE, AND REAL: per a11ysupport.io, `aria-selected=\"true\"` is NOT conveyed by NVDA (Firefox or Chrome) or by VoiceOver (macOS or iOS) - only JAWS announces it - while `aria-current=\"step\"` is supported by all five combinations. So MUI replaced a working attribute with one that most screen readers ignore, and for most users the current step is simply no longer announced. This is a comprehension defect, not a WCAG 2.1 AA failure: a structurally valid tab list passes 4.1.2, which is also why axe reports 0 violations on MUI's default markup and a CRITICAL `aria-allowed-attr` on the partially corrected version - the tooling points the wrong way during the fix. NOR IS IT UNUSUAL: Angular Material has treated its stepper as a tab list for about nine years, documented and uncontested. TREAT THIS AS A NOTE TO BE AWARE OF, NOT A REASON TO STRIKE MUI OFF - the cost is permanent per-wizard maintenance, not a compliance failure.",
    links: [
      { label: "the wizard", href: `${BLOB}/apps/delta-mui/src/views/EventWizard.tsx` },
      {
        label: "MUI PR #47687",
        href: "https://github.com/mui/material-ui/pull/47687",
      },
      {
        label: "the unanswered objection, MUI issue #43689",
        href: "https://github.com/mui/material-ui/issues/43689",
      },
      {
        label: "v9 migration guide",
        href: "https://mui.com/material-ui/migration/upgrade-to-v9/",
      },
      { label: "axis A7", href: "../axes.html" },
    ],
  },
  {
    id: "mui-stepper-connector-physical-css",
    severity: "caveat",
    remediability: "config",
    candidates: ["mui"],
    hosts: ["*"],
    // Same root cause as [[mui-rtl-unfixable]], and it moves with it: this was the
    // second symptom of our own incomplete RTL setup, not a second MUI defect.
    owner: "our implementation",
    title: "MUI's step connector was recorded as broken in Arabic; it was our RTL setup",
    detail:
      "`StepConnector` centres itself on the step's physical left edge - `left: calc(-50% + 20px); right: calc(50% + 20px)`. With MUI's RTL plugin missing, `left`/`right` never swapped: measured at 1280px in Arabic, no connector at all between steps 1 and 2 and step 4's connector centred at x=37 with 94px hanging off the page. This was recorded as \"MUI's second physical-CSS RTL defect\", and the wizard carried a hand-written `inset-inline-*` repair for it.",
    resolved:
      "Wiring MUI's documented RTL step 3 fixed it at the source, and the hand-written repair was deleted after measuring that it changed nothing. With no repair present: three connectors at x=811/509/208 in Arabic and x=208/509/811 in English at 1280px - a perfect mirror, none off-page. The wizard's `sx` repair count drops from 2 to 1.",
    links: [
      { label: "the wizard", href: `${BLOB}/apps/delta-mui/src/views/EventWizard.tsx` },
      { label: "the provider", href: `${BLOB}/apps/delta-mui/src/direction.tsx` },
      { label: "axis A6", href: "../axes.html" },
    ],
  },
  {
    id: "carbon-stepper-truncates-step-names",
    severity: "caveat",
    remediability: "per-site-code",
    candidates: ["carbon"],
    hosts: ["*"],
    owner: "candidate",
    title: "Carbon truncates step names by design, and German hits it",
    detail:
      "`.cds--progress-label` ships `white-space: nowrap` with `text-overflow: ellipsis`, so German's \"Zusätzliche Einzelheiten\" renders as \"Zusätzliche Ein…\" at every viewport. Carbon's intended remedy is `overflowTooltipProps` - hover to read the step's name - which a touch user cannot reach. Carbon's own VERTICAL variant sets `white-space: initial` on the same element, so wrapping is a shape it supports, just not on the axis DELTA's design uses. Two further hatches were needed on the same component: `secondaryLabel` is `position: absolute` horizontally so the REQUIRED/OPTIONAL line reserves no height and overlaps a wrapped label, and the indicator has no media queries at all with a 7rem per-step minimum, so four steps demand 512px and scroll the document at 390px.",
    links: [
      { label: "evidence", href: `${BLOB}/apps/delta-carbon/evidence.json` },
      { label: "axis A2", href: "../axes.html" },
    ],
  },
  {
    id: "antd-disabled-step-leaves-the-tree",
    severity: "caveat",
    remediability: "per-site-code",
    candidates: ["antd"],
    hosts: ["*"],
    owner: "candidate",
    title: "An unreachable antd step disappears from the accessibility tree",
    detail:
      "antd gives a step its `role=\"button\"` and tabindex only when it is clickable, so `disabled: true` removes both and leaves nothing behind. Measured with an accessibility snapshot: steps 2, 3 and 4 collapsed out of the list and into a single unstructured text run - \"2 Linked events Optional 3 Additional details Optional 4 Review and save Required\" - so a screen-reader user could not tell how many steps remained or where one ended. Reinstating them needs `role` and `aria-disabled` passed through, which works only because the internal Step component spreads leftover item props onto the DOM node; antd's own `StepItem` type declares no ARIA props at all. Separately, `CheckOutlined` ships `role=\"img\" aria-label=\"check\"`, so a completed step announces the English word \"check\" in every locale until the marker is hidden.",
    links: [
      { label: "the wizard", href: `${BLOB}/apps/delta-antd/src/views/EventWizard.tsx` },
      { label: "axis A7", href: "../axes.html" },
    ],
  },
  {
    id: "react-aria-ships-no-stepper",
    severity: "caveat",
    /*
     * `inherent` and NOT a bug. React Aria ships behaviour, not appearance, so a
     * missing component is the library working as designed. It is recorded because
     * the registry would otherwise flatter React Aria by silence: the other four
     * carry stepper findings and the one that ships no stepper at all would show
     * none. The cost is real and it is the cost this recommendation turns on.
     */
    remediability: "inherent",
    candidates: ["react-aria"],
    hosts: ["*"],
    owner: "candidate",
    title: "React Aria ships no stepper, so the whole component is UNDRR's",
    detail:
      "React Aria Components has `Tabs`, `Breadcrumbs`, `ProgressBar` and `Disclosure`, and none of them is a step indicator; PrimeReact, the incumbent being replaced, has `Stepper`. Everything but the buttons is hand-written here: the markup, the states, the connector, the number-to-check swap, the wrapping and the announcement - 26 CSS rules over 221 lines for one component on one screen, against zero rules for Mantine and one for antd. `Tabs` is the tempting shortcut and is wrong, because it tells a screen-reader user the steps are peers they may visit in any order. The offsetting result is that the hand-built version is the only one of the five that got its semantics right by construction, since nothing had to be overridden.",
    links: [
      { label: "the wizard", href: `${BLOB}/apps/delta-react-aria/src/views/EventWizard.tsx` },
      { label: "architecture options", href: `${BLOB}/docs/architecture-options.md` },
    ],
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
    /* ------------------------------------------- our own bugs, found and fixed --
     *
     * Recorded as classes rather than one entry per site, because every one of
     * these was shared across several pairings - which is itself the finding. They
     * were caused by the demo code being written from a common reference, not by
     * any library.
     *
     * All carry `resolved`, so they are absent from the demo pages and invisible to
     * the scoring layer, and present in the registry as the audit trail. The reason
     * for keeping them is stated on the `resolved` field.
     */
    id: "ours-sort-state-shown-xor-announced",
    severity: "caveat",
    candidates: ["react-aria", "mui"],
    hosts: ["*"],
    owner: "our implementation",
    title: "Sort state was shown without being announced, or announced without being shown",
    detail:
      "The single most distorting defect this evaluation found in its own code, because it broke in opposite directions for two candidates and would have scored them in opposite, equally wrong ways. React Aria announced without showing: the library stamps documented [data-allows-sorting] and [data-sort-direction] selectors onto the th and sets aria-sort itself, and we styled neither, so screen-reader users had the state and sighted users had nothing. MUI showed without announcing: TableSortLabel rendered a visible arrow while TableCell's one-line sortDirection prop went unpassed, so no aria-sort reached the th at all. Found because a reviewer clicked a column header and asked whether it was our bug.",
    resolved:
      "React Aria styled from the library's own selectors, as a borders-only triangle rather than a glyph in content, since generated text is announced by some screen readers and would duplicate aria-sort. MUI passes sortDirection. Both assert ordering rather than attributes now.",
    links: [{ label: "axis A7", href: "../axes.html" }],
  },
  {
    id: "ours-descending-sort-by-array-reverse",
    severity: "caveat",
    candidates: ["react-aria", "mantine"],
    hosts: ["*"],
    owner: "our implementation",
    title: "Descending sort was a reversed array, so it reordered tie groups too",
    detail:
      "Array.prototype.sort is stable, so an ascending sort preserves input order within groups of equal keys. Reversing the whole array reverses that secondary order as well, and these fixtures have enormous tie groups - hazardType has about 8 distinct values across 250 rows, verificationStatus has 4 - so toggling a column ascending, descending, ascending did not restore the original ordering. Compounded by a collator built with sensitivity: 'base', a MATCHING setting used for ordering, which made a and á and A compare equal and manufactured extra ties in exactly the French and German fixtures the set exists to stress.",
    resolved:
      "Comparators negate instead of reversing, with null and id tiebreaks deliberately left unsigned so equal keys hold one order in both directions. Tests compute both the correct ordering and the reverse-bug's prediction from the fixtures and name the wrong one.",
    links: [{ label: "axis A1", href: "../axes.html" }],
  },
  {
    id: "ours-collation-without-a-locale",
    severity: "caveat",
    candidates: ["mantine"],
    hosts: ["*"],
    owner: "our implementation",
    title: "Row ordering depended on the machine's default locale",
    detail:
      "Three different collation strategies coexisted across the pairings: one passed the fixture locale to localeCompare, one built an Intl.Collator from it, and one called String#localeCompare with no locale at all - so German and French row order depended on whichever locale the runner happened to default to. A demo whose output changes with the machine it runs on cannot support a claim about a library.",
    resolved:
      "All comparators take an explicit Intl.Collator built from the selected bcp47 tag, asserted against a German ordering that a locale-less compare gets wrong.",
    links: [{ label: "axis A1", href: "../axes.html" }],
  },
  {
    id: "ours-rtl-defect-attributed-to-the-library",
    severity: "caveat",
    candidates: ["mui", "antd", "mantine"],
    hosts: ["*"],
    owner: "our implementation",
    title: "An RTL defect of ours was recorded as MUI's, and two pairings scored credit against it",
    detail:
      "MUI's TableCell align prop is physical-only, so our align=\"right\" left the row-action column pinned to the physical right in Arabic while the row flipped. A code comment recorded that as an RTL limitation of MUI. It was not: TableCell also accepts sx, and sx={{textAlign:'end'}} hands over the logical property without leaving MUI's own API. The damage was not the misplaced column but the comment - the antd and Mantine views both cited it to explain why their own RTL was better, so three pairings were earning A6 credit against a defect we had introduced. Distinct from mui-rtl-unfixable, which is real, lives inside MUI's own stylesheet where no app-level prop reaches, and is untouched by this.",
    resolved:
      "Logical alignment via sx, the false comment rewritten, and the derived claims in the antd and Mantine views restated as properties of those libraries rather than as comparisons against a weakness we manufactured.",
    links: [{ label: "axis A6", href: "../axes.html" }],
  },
  {
    id: "ours-library-i18n-declined-or-overridden",
    severity: "caveat",
    candidates: ["mui", "react-aria", "carbon"],
    hosts: ["*"],
    owner: "our implementation",
    title: "Translations the libraries already ship were declined or overwritten",
    detail:
      "Three shapes of the same mistake. MUI: pagination chrome left in English and recorded as a finding that MUI's locale bundles are a second translation source parallel to the fixtures - while @mui/material/locale ships exactly arEG, frFR and deDE, and the antd pairings wired antd's equivalent packs and were credited for it. The objection applied to both pairings or to neither. React Aria: explicit aria-label props on the tag remove button, both date pickers and the ComboBox trigger overrode names the library already sets from its own translation bundles, replacing working Arabic with English. Carbon: one app wired flatpickr's locale and its twin hardcoded locale=\"en\".",
    resolved:
      "MUI's core and X locale packs wired in all three views, including through integration-mui so the inventory matches. React Aria's overrides removed so the library names its own controls. Carbon's date locales wired in both apps. The genuinely missing fixture vocabulary is now recorded as a gap rather than filled with invented strings.",
    links: [{ label: "axis A6", href: "../axes.html" }],
  },
  {
    id: "ours-fixture-labels-reused-as-nouns",
    severity: "caveat",
    candidates: ["*"],
    hosts: ["*"],
    owner: "our implementation",
    title: "Action labels were reused as the names of unrelated controls",
    detail:
      "The fixture LabelSet has no actionView, actionEdit, colActions or any all/any option string, and the realistic views borrowed whatever was closest instead of recording the gap. So an Edit button was named \"Save\", row-action columns were headed \"Review note\" (the name of a real and different field) or \"Settings\", and - worst - \"Clear filters\" became the label of the all/any option INSIDE several Selects, so a collapsed dropdown's visible text and accessible name both read \"Clear filters\" beside a real Clear-filters button saying the same thing. None of it was necessary: every library involved separates a placeholder from an option list.",
    resolved:
      "Library-native empty states replace the sentinel options, and where no fixture string exists the untranslated English word is used and the missing key recorded. One true English word beats four translations of something false - the same call Carbon's untranslated pagination chrome already made.",
    links: [{ label: "axis A7", href: "../axes.html" }],
  },
  {
    id: "ours-comments-citing-apis-that-do-not-exist",
    severity: "caveat",
    candidates: ["carbon"],
    hosts: ["*"],
    owner: "our implementation",
    title: "Recorded reasoning cited a Carbon API that does not exist, and CSS rules that were not in the file",
    detail:
      "Two comments asserted that Carbon's Pagination has a translateWithId hook, which is why its chrome was left in English. Pagination.d.ts contains zero occurrences of it; the strings come from nine discrete props, which is a worse i18n surface than one hook and is the actual finding. Meanwhile translateWithId does exist on DataTable and TableHeader, where we never used it and where carbon-props.ts inventories the API in detail without mentioning it. Separately a demo.css comment described flex-end and padding-inline rules that were not in the file - the behaviour was correct and the cited evidence invented, which in a repository whose product is the accuracy of its record is the worse of the two faults.",
    resolved:
      "Both comments corrected against the installed package rather than from memory, itemRangeText wired so counts route through Intl, and the remaining seven Pagination strings plus the missing sort and selection vocabulary recorded as fixture gaps.",
    links: [{ label: "axis A6", href: "../axes.html" }],
  },
  {
    id: "ours-timezone-shifted-date-boundaries",
    severity: "caveat",
    candidates: ["carbon"],
    hosts: ["*"],
    owner: "our implementation",
    title: "Date filters shifted by a day outside UTC",
    detail:
      "toISOString().slice(0,10) was called on flatpickr's local-midnight Date, so at any positive UTC offset the filter boundary moved back a day, and at negative offsets the displayed day moved instead. The harness pins timezoneId: 'UTC' for determinism, which is correct and which is also exactly why this survived: it cannot reproduce in CI. It sat beneath a header comment promising no new Date().",
    resolved:
      "Local-date formatting throughout, one time frame per surface, and a test block per date surface running under Australia/Sydney so the bug cannot come back invisibly.",
    links: [{ label: "axis A1", href: "../axes.html" }],
  },
  {
    id: "ours-divergence-between-twins",
    severity: "caveat",
    candidates: ["carbon", "antd", "mantine"],
    hosts: ["*"],
    owner: "our implementation",
    title: "Two hosts of one candidate diverged in ways that changed what was measured",
    detail:
      "Carbon: delta-carbon lacked the aria-describedby workaround its Mangrove twin documented at length, and the twin's success disproved delta's own evidence.json claim that the violation could not be fixed from the consuming side. Applying it removed a CRITICAL. Carbon again: the Mangrove island omitted cds--layer-one while its comment claimed it carried it, so five Carbon tokens with no literal fallback were undefined in precisely the scoped mode the island exists to measure - invisible to screenshots, because all five drive pressed and selected states. Ant Design: the island shipped no sorter on any column while every other island sorted, understating antd's table. Mantine: three views styled the sort trigger three different ways.",
    resolved:
      "Each twin brought into line with the better of the two, and the false evidence.json and EVIDENCE.md claims retracted with their counts corrected.",
    links: [{ label: "axis A3", href: "../axes.html" }],
  },
  {
    id: "ours-accessibility-attributes-omitted",
    severity: "caveat",
    candidates: ["carbon", "mantine", "react-aria"],
    hosts: ["*"],
    owner: "our implementation",
    title: "Accessible state we already knew how to supply was left out",
    detail:
      "aria-current missing from three of four SideNavs while our own fourth passed it; aria-controls pointing at nodes that keepMounted={false} had unmounted; filter counts changing silently in a plain paragraph while a sibling file demonstrated the role=status pattern; an unnamed DataTableSkeleton whose twin was named; selected state carried by colour alone with no aria-pressed; a live region with unconditional padding and background painting an empty coloured strip before any message existed; and two undebounced live regions announcing the same fact on every keystroke.",
    resolved:
      "All supplied. The empty live region keeps its element mounted and loses only its class, because conditionally rendering it would have traded a visible bug for a silent one - a live region must exist before its content changes or the announcement is lost.",
    links: [{ label: "axis A7", href: "../axes.html" }],
  },
  {
    id: "ours-assertions-that-could-not-fail",
    severity: "caveat",
    candidates: ["*"],
    hosts: ["*"],
    owner: "our implementation",
    title: "Ten classes of assertion that could not fail - which is why the rest survived",
    detail:
      "Two axe tests with no expect at all. Four expect(violations).toBeGreaterThanOrEqual(0). Sort tests asserting aria-sort, which the library derives from state rather than from ordering, so a comparator returning 0 passed. Page-reset tests asserting toContainText('1'), satisfied by the '11-20 of 250' that preceded the action. Status-pill tests that 250 identically-labelled rows would pass, and which were the only assertion about that column. A post-delete focus test that was a ternary over the same two literals its expected set contained, so it was true by construction including in the case its own comment said it existed to catch. And in the token package, a test claiming to require an Arabic face in every font stack whose regex passed via system-ui, so deleting Noto Sans Arabic from every stack left it green.",
    resolved:
      "All replaced with assertions on ordering, counts, mappings and full strings, and every one proven falsifiable by breaking the thing it guards, confirming the failure, and restoring. The leakage assertions needed no change: each already checked that it had found every canary before checking that none had changed, which is the vacuous-pass guard the rest of the suite lacked.",
    links: [{ label: "axis A7", href: "../axes.html" }],
  },
  {
    id: "long-labels-clean-is-not-reproducible",
    severity: "caveat",
    candidates: ["react-aria"],
    hosts: ["mangrove"],
    owner: "this evaluation",
    title: "The recorded long-labels result does not reproduce",
    detail:
      "evidence.json records longLabels.status: \"clean\" and test-results/long-labels-mobile.json records overflowPx: 0, but the mobile assertion fails intermittently: measured at 2 failures in 10 consecutive runs of the unmodified suite, at scrollWidth 406 against clientWidth 390 - a 16px overflow. The offender is the table inside SectionStates' statebox, which has no sortable columns, so it is unrelated to the sort work done alongside this finding. THE CAUSE IS NOT ATTRIBUTED. It could be our markup or React Aria's, and this entry deliberately does not guess: owner is recorded as this evaluation because what is certainly wrong is the RECORD - a value captured on a passing run and reported as a stable fact. Kept out of anything scoreable for that reason, since scoring a candidate on an unattributed defect would be worse than not scoring it. Needs a deterministic measurement before either the status or the cause can be stated.",
    links: [{ label: "axis A7", href: "../axes.html" }],
  },
  {
    id: "react-aria-tooltip-focus-test-not-isolated",
    severity: "caveat",
    candidates: ["react-aria"],
    hosts: ["delta"],
    owner: "this evaluation",
    remediability: "per-site-code",
    title: "The focus-tooltip result depends on what ran before it",
    detail:
      "`tooltip opens on keyboard focus, not only hover` fails intermittently in a FULL suite run and never in isolation: measured at 10 passes in 10 isolated runs, against one full-suite run where it failed on both the mobile and desktop projects and two full-suite runs where it passed. The button is focused when it fails - that assertion passes on the line above - and `.demo-tooltip` is simply never in the DOM, so what varies is not focus but whether React Aria considers the focus VISIBLE. The spec's own helper documents the dependency: React Aria opens a focus tooltip only when the interaction modality is keyboard, and modality is global page state that a pointer event anywhere can flip. THE CAUSE IS NOT ATTRIBUTED, deliberately. A stale pointer position surviving into the next test is the obvious candidate and this entry does not claim to have proven it. What is certain is that the assertion is not isolated from the rest of the run, so a green result from it is weaker evidence than it appears - which is why this is recorded as ours rather than scored against the candidate. Not caused by the DELTA chrome rebuild: it is in the kitchen-sink spec, which uses HostShell and not AppFrame.",
    links: [
      { label: "the spec", href: `${BLOB}/apps/delta-react-aria/e2e/demo.spec.ts` },
      { label: "axis A7", href: "../axes.html#a7" },
    ],
  },
  {
    id: "delta-host-has-no-mangrove-stylesheet",
    severity: "caveat",
    candidates: ["*"],
    hosts: ["delta"],
    owner: "this evaluation",
    remediability: "config",
    title: "The Delta host carries Mangrove class names with no Mangrove stylesheet behind them",
    detail:
      "AppFrame renders `mg-button`, `mg-container` and `dts-*` classes because real DELTA does, and its own docblock claimed this made \"a candidate's own base styles meet Mangrove specificity and Tailwind Preflight together\". MEASURED IN THE BUILT PAGE, IT DOES NOT: zero `.mg-button` rules are loaded, and both `mg-button` elements compute to background rgba(0,0,0,0), border-width 0px, padding 0px - Tailwind Preflight's reset and nothing else. The Delta entries import the host Tailwind sheet, the tokens, the known-issues sheet and the candidate theme; no Mangrove stylesheet is among them. The three e2e specs that check this assert toHaveClass(/mg-button/), which a class name satisfies whether or not it styles anything, so the gap survived review. REAL DELTA LOADS ONE FIRST: app/root.tsx links /assets/css/style-dts.css - 67KB, 81 `.mg-button` rules - BEFORE the Tailwind sheet. CONSEQUENCE FOR SCORING: A4 on the Delta host has been measured against one cascade where DELTA runs two, so a Delta-host A4 result is a floor and not a verdict, and the Mangrove-host result is the only one that has met Mangrove specificity. Fixing it is a stylesheet import, hence `config`, but it reopens every A4 and A6 measurement taken on this host, which is why it is recorded as a decision rather than taken as one during a layout change.",
    links: [
      { label: "the frame", href: `${BLOB}/packages/host-delta/src/AppFrame.tsx` },
      { label: "axis A4", href: "../axes.html#a4" },
    ],
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

/**
 * The issues a reader should see on a demo page: everything still open.
 *
 * Resolved findings stay in `KNOWN_ISSUES` deliberately. A defect we found,
 * attributed to ourselves and fixed is exactly the record that makes the rest of
 * the registry credible - deleting it on the grounds that it no longer reproduces
 * is how an evaluation quietly becomes a sales document. But it does not belong in
 * the box on a demo page, which answers "what should I know about what I am looking
 * at", and a fixed bug is not that.
 *
 * So: `issuesFor` is the audit trail, `openIssuesFor` is the page.
 */
export function openIssuesFor(candidate: string, host: string): readonly KnownIssue[] {
  return issuesFor(candidate, host).filter((issue) => !issue.resolved);
}
