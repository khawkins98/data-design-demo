/**
 * DELTA's real menu bar contents, as data.
 *
 * TRANSCRIBED FROM A DELTA CHECKOUT, `app/components/RegularMenuBar.tsx`, on the
 * same terms as the rest of this frame: the bar's shape came from that file and
 * the DLDTS design screens, so its CONTENTS should come from there too. Labels,
 * order, descriptions and the profile menu's separator are DELTA's, not invented.
 * The `description` lines exist because DELTA's `itemRenderer` renders a
 * two-line item - a bold label above muted supporting text - which is a real test
 * of whether a candidate's menu can hold rich item content at all, and several
 * cannot without opting out of their own item component.
 *
 * WHAT WE DELIBERATELY DID NOT COPY. DELTA gates DATA, ANALYSIS and SETTINGS on
 * `isLoggedIn`, `isCountryAccountSelected` and `userRole === "admin"`. This demo
 * has no auth, so every menu is present. The evaluation is about the menu
 * component, and a conditionally absent menu measures nothing.
 *
 * WHY THIS IS A MODEL AND NOT MARKUP. Every candidate has its own menu API -
 * `Menu` with `items`, `Dropdown` with `menu`, `OverflowMenu` with children,
 * `MenuTrigger` with a render function - so the only thing that can be shared
 * across five implementations is the data. Each pairing maps this to its own
 * library, and the differences in HOW they map it are the finding. See the
 * `navMenu` slot in AppFrame.tsx.
 *
 * HOST CHROME IS ENGLISH IN EVERY LOCALE, as it is everywhere else in this frame:
 * the fixtures translate the application's content, not the shell around it, and
 * a half-translated bar would read as a defect that is ours.
 */

/** One item inside a menu. `separator` items carry no label. */
export interface DeltaMenuEntry {
  readonly id: string;
  readonly label: string;
  /** DELTA's second line, rendered muted beneath the label. */
  readonly description?: string;
  /** DELTA renders a separator before "Sign out" in the profile menu. */
  readonly separator?: boolean;
  /**
   * Marks the item as unavailable. Not in DELTA's model - added here because a
   * disabled item is where menu implementations diverge most (skipped by type-
   * ahead or not, focusable or not, `aria-disabled` or the `disabled` attribute),
   * and every other view in this evaluation tests disabled states too.
   */
  readonly disabled?: boolean;
}

export interface DeltaMenu {
  readonly id: string;
  /** Uppercased in the bar, as DELTA does with `.toUpperCase()`. */
  readonly label: string;
  readonly icon: string;
  readonly current?: boolean;
  readonly items: readonly DeltaMenuEntry[];
}

export const DELTA_MENUS: readonly DeltaMenu[] = [
  {
    id: "data",
    label: "Data",
    icon: "database",
    current: true,
    items: [
      {
        id: "hazardous-events",
        label: "Hazardous events",
        description: "Monitor hazardous situations",
      },
      {
        id: "disaster-events",
        label: "Disaster events",
        description: "View all disaster events",
      },
      {
        id: "disaster-records",
        label: "Disaster records",
        description: "Complete disaster documentations",
      },
    ],
  },
  {
    id: "analysis",
    label: "Analysis",
    icon: "chart",
    items: [
      { id: "sectors", label: "Sectors", description: "Analyze data by sectors" },
      { id: "hazards", label: "Hazards", description: "Analyze data by hazards" },
      {
        id: "analysis-disaster-events",
        label: "Disaster events",
        description: "Analyze data by disaster events",
      },
    ],
  },
  {
    id: "about",
    label: "About",
    icon: "info",
    items: [
      {
        id: "about-the-system",
        label: "About the system",
        description: "System information",
      },
      { id: "technical-specifications", label: "Technical specifications" },
      { id: "partners", label: "Partners" },
      { id: "methodologies", label: "Methodologies" },
      { id: "support", label: "Support" },
      { id: "faq", label: "FAQ" },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    icon: "cog",
    items: [
      {
        id: "system-settings",
        label: "System settings",
        description: "Configure system preferences",
      },
      {
        id: "access-management",
        label: "Access management",
        description: "Manage user permissions",
      },
      {
        id: "organization-management",
        label: "Organization management",
        description: "Manage organizations",
      },
      { id: "geographic-levels", label: "Geographic levels" },
      { id: "sectors-settings", label: "Sectors" },
      // The one item this model marks unavailable: DELTA gates SETTINGS on an
      // admin role, and API keys are the item a non-admin most plausibly sees
      // disabled rather than absent. See DeltaMenuEntry.disabled.
      { id: "api-keys", label: "API keys", disabled: true },
      { id: "assets", label: "Assets" },
    ],
  },
];

/**
 * The avatar menu. Separate because it is triggered from a different control and
 * because it is the only DELTA menu with a separator in it.
 */
export const DELTA_PROFILE_MENU: readonly DeltaMenuEntry[] = [
  { id: "profile", label: "Profile" },
  { id: "change-password", label: "Change password" },
  { id: "totp", label: "TOTP (2FA)" },
  { id: "sign-out", label: "Sign out", separator: true },
];
