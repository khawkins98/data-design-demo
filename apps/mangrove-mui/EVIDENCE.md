# Evidence: MUI Community on the Mangrove host

Structured record in `evidence.json`. This is the prose.

**Summary.** Of 30 requirements: **26 native, 4 composed, 0 custom, 0
unsupported**, for 54 custom lines. Leakage clean. Scoped axe: 1 serious
violation, 4 incomplete. Long labels clean at every viewport. **42 e2e tests:
39 pass, 3 fail (left failing on purpose).**

Composed entries: `datetime-range-picker` (licensed-tier blocker),
`validation-states` (no form-level error channel), `rtl` (incomplete -- see
below) and `side-by-side`. Twin of `apps/delta-mui` -- same library, version
and fixtures; `src/theme.ts` identical. The comparison isolates host cost.

---

## Mangrove restyles MUI's inputs

Mangrove's `input[type=text]` (and siblings) rule has specificity **(0,1,1)**,
beating MUI's `.MuiOutlinedInput-input` **(0,1,0)**. It forces `border: 2px
solid #1a1a1a`, `height: 46px`, `background-color: #fff`, and `font-family:
Roboto`. Measured with the repair removed at runtime:

| Property | Unrepaired | Repaired |
| --- | --- | --- |
| `border-top-width` | `2px` | `0px` |
| `height` | `46px` | `38.8px` |
| `background-color` | `rgb(255, 255, 255)` | `rgba(0, 0, 0, 0)` |
| `font-family` | `Roboto, sans-serif` | the token stack |

Repaired with 10 lines under `.demo .MuiOutlinedInput-input` -- (0,2,0), no
`!important`. Root cause: `CssBaseline` was declined (writes to `html`, `body`,
`*`); on Delta omitting it cost nothing, on Mangrove it costs this.

---

## Three anticipated host problems that did not happen

All three inert against MUI 9.10.1. `[hidden]`: MUI never uses `hidden` (0
matches in candidate subtree). `ul`: MUI's List styles win. `legend`: host rule
is a descendant selector, not bare `legend`; metrics identical either way.

---

## The failing test: MUI's RTL is incomplete

**Three of 42 tests fail** (same test at three viewports, left failing per the
honesty rule). `direction: "rtl"` flips layout but not physical CSS offsets
emotion emitted. `MuiInputLabel-outlined` uses `left: 0`.

Measured in Arabic at 1440px on the `server-rejected` field:

| | Value |
| --- | --- |
| FormControl | 1086px wide, x = 37 |
| Input | 202px wide, x = 921 (correct: logical start is the right) |
| Label | x = 51, `left: 0px` (wrong: physical left) |
| Distance from label to the field it names | **870px** |

MUI's fix (`stylis-plugin-rtl`) is third-party, forbidden by constraint 2.
Candidate defect, not host: identical geometry in
`apps/delta-mui/screenshots/desktop/rtl/01-forms.png`. React Aria needed only
`I18nProvider`.

---

## The date-time range: what composition cost

Range pickers are `@mui/x-date-pickers-pro` only (licensed tier). Composed from
two `DateTimePicker`s with `minDateTime`/`maxDateTime` wired between them.
**31 custom lines.** Losses: two calendars instead of one, two focus traps, no
single accessible name (screen-reader users get two unrelated fields). Typed
input can still invert the range (recorded in `humanReviewRequired`).

---

## Portalled overlays

MUI portals to `document.body`, outside `.undrr-tokens`.

| | Measured |
| --- | --- |
| `.MuiPopover-paper` background | `rgb(255, 255, 255)` |
| `--undrr-color-surface` visible in the portal | `""` (empty) |

Renders correctly because MUI resolves tokens at build time; emotion emits
literal colours. Same inlining makes the theme a **copy**, not a live reference.

---

## Matching the host: further away than on Delta

Different radius, table density, button weight, blue. **Mangrove 1.8.1
publishes no CSS custom properties** -- matching requires transcribing Sass
values by hand.

---

## Where MUI wins

**Data table.** Sorting, multi-select, filtering, pagination, page-size control
and column resizing -- all props. **Zero custom lines across all six table
requirements.** `mangrove-react-aria` needed 70 lines and a scratch-built
pagination control.

**Multiselect.** `multiple` on `Autocomplete`, chips included.

**States.** `Alert` with correct ARIA roles, `LinearProgress`, DataGrid's
`loading` prop and `localeText.noRowsLabel`.

**Long labels.** 0px horizontal overflow in German at 390, 1024 and 1440 --
vs. `mangrove-react-aria`'s 261px overflow at 390px.

**Inline links.** `Link` underlines by default; Mangrove's bare `a` does not.

**27 lines of CSS across 7 selectors** vs. 624 lines / 115 selectors for React
Aria on this host.

---

## Where it cost

**Bundle: 397.6 kB gzipped JS, 158 dependencies** (`mangrove-react-aria`:
237.6 kB, 20 deps).

**Theming is a build-time copy, not a live reference.**

**`cssVariables: true` rejected** -- emits `--mui-*` at `:root`.

**RTL costs more than React Aria and does not finish the job.** See the failing
test.

**TypeScript friction:**
- Picker props not `exactOptionalPropertyTypes`-compatible (`minDateTime`/`maxDateTime` typed `Date` not `Date | undefined`).
- `Stack` no longer accepts `flexWrap`/`alignItems` as direct props in v9; use `sx`.

---

## Accessibility

Scoped to candidate subtree: **1 serious, 0 critical, 4 incomplete.** Host
baseline: 0 violations.

Violation: `color-contrast` on disabled helper text. `#8b9aa5` is ~2.8:1 on
white. Disabled *controls* are exempt from WCAG 1.4.3; helper text is not.

Whole page adds `link-in-text-block` -- **Mangrove host baseline** (bare `a`,
`text-decoration: none`), excluded from scoped numbers. Section 1 carries the
violation; 2, 3, 4, 6, 7 report incompletes; 5 and 9 clean. The RTL label
defect (870px gap) is also an accessibility problem axe does not catch.

---

## Determinism

All dates from fixtures' ISO strings, formatted with `timeZone: "UTC"`.

---

## Shared packages

Not modified. `textDisabled` cannot pass contrast when applied to non-control
text -- a token-design question for UNDRR.
