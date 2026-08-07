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

Mangrove's compiled stylesheet contains:

```css
input[type=date], input[type=email], input[type=number], input[type=password],
input[type=search], input[type=tel], input[type=text], textarea {
  appearance: none; background-color: #fff; border: 2px solid #1a1a1a;
  border-radius: 0; box-sizing: border-box; display: block;
  font-family: Roboto, sans-serif; font-size: 1rem; height: 46px;
  padding: .390625rem; width: 100%;
}
```

Element + attribute specificity **(0,1,1)** beats MUI's `.MuiOutlinedInput-input`
**(0,1,0)**. Measured on a section-1 TextField with the repair removed at runtime:

| Property | Unrepaired | Repaired |
| --- | --- | --- |
| `border-top-width` | `2px` | `0px` |
| `height` | `46px` | `38.8px` |
| `background-color` | `rgb(255, 255, 255)` | `rgba(0, 0, 0, 0)` |
| `font-family` | `Roboto, sans-serif` | the token stack |

Repaired with 10 lines under `.demo .MuiOutlinedInput-input` -- (0,2,0), no
`!important` needed. Root cause: `CssBaseline` was declined (writes to `html`,
`body`, `*`); on Delta omitting it cost nothing, on Mangrove it costs this.
**Containment and correct rendering are in tension.**

---

## Three anticipated host problems that did not happen

All three measured inert against MUI 9.10.1. Defensive rules deleted rather than
left to pad the CSS count.

**`[hidden]` specificity bug did not bite.** MUI never uses `hidden`; helper
inputs use `aria-hidden="true"` collapsed to 1px with **no `type` attribute**,
so Mangrove's `[hidden] { display: none }` never matches. 0 `[hidden]` elements
in the candidate subtree. The host bug should still be fixed.

**`ul` rule did not reach MUI's lists.** Measured `padding-left: 0px` and
`list-style-type: none` -- MUI's own List styles win.

**`legend` rule never matches MUI's notch legend.** Host rule is a descendant
selector, not bare `legend`. Metrics identical with and without a reset.

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

MUI's range pickers exist only in `@mui/x-date-pickers-pro` (licensed tier).
The community package ships **zero** `Range*` components. Composed from two
`DateTimePicker`s with `ampm={false}`, minute views, `minDateTime`/`maxDateTime`
wired between them, span derived in application code. **31 custom lines.**

What a native range picker would have given:

- **One calendar showing both endpoints** with highlighted intervening days
- **Drag-to-select** across a range
- **One popover and one focus trap** instead of two
- **A single accessible name for the range** -- screen-reader users get two unrelated fields (the most substantive loss)
- **The derived span for free** -- the duration line is our code

`minDateTime`/`maxDateTime` wiring prevents inversion through the picker UI, but
typed input still needs the explicit check (recorded in `humanReviewRequired`).

**Verdict:** `composed`. Usable, meaningfully worse than native, gap mostly borne by screen-reader users.

---

## Portalled overlays

MUI portals to `document.body`, outside `.undrr-tokens`.

| | Measured |
| --- | --- |
| `.MuiPopover-paper` background | `rgb(255, 255, 255)` |
| `--undrr-color-surface` visible in the portal | `""` (empty) |

Overlays render correctly because MUI's theme resolves token values at build
time and emotion emits literal colours. The same build-time inlining makes
MUI's theme a **copy** of the tokens, not a live reference.

---

## Matching the host: further away than on Delta

MUI themed to UNDRR tokens does not read as Mangrove: different radius, table
density, button weight, blue. `variant="outlined"` and `elevation={0}` get Card
flat, but the remaining gap is palette and type scale. **Mangrove 1.8.1
publishes no CSS custom properties** -- matching requires transcribing Sass
values by hand. Mangrove 2.0 preview tokens were **not** used.

---

## Where MUI wins

**Data table.** Sorting, multi-select, filtering, pagination, page-size control
and column resizing -- all props. **Zero custom lines across all six table
requirements.** `mangrove-react-aria` needed 70 lines and a scratch-built
pagination control.

**Multiselect.** `multiple` on `Autocomplete`, chips included. React Aria has no
multiselect component.

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

**Theming is a build-time copy, not a live reference.** See the portals section.

**`cssVariables: true` was rejected** -- it would emit `--mui-*` properties at
`:root`, putting MUI's palette in the host's global scope.

**RTL costs more than React Aria and does not finish the job.** See the failing
test.

**TypeScript friction:**
- Picker props not `exactOptionalPropertyTypes`-compatible (`minDateTime`/`maxDateTime` typed `Date` not `Date | undefined`).
- `Stack` no longer accepts `flexWrap`/`alignItems` as direct props in v9; use `sx`.

---

## Accessibility

No conformance claimed. Scoped to candidate subtree: **1 serious, 0 critical,
4 incomplete.** Whole-page counts match (host baseline: 0 violations).

Violation: `color-contrast` on disabled field helper text.
`--undrr-color-text-disabled` (`#8b9aa5`) is ~2.8:1 on white. Disabled
*controls* are exempt from WCAG 1.4.3; helper text is not. Tokens are
import-only and could not be fixed here.

Whole page adds `link-in-text-block` -- **Mangrove host baseline** (bare `a`
with `text-decoration: none`), excluded from scoped numbers.

Per-section: section 1 carries the violation; 2, 3, 4, 6, 7 report incompletes;
5 and 9 are clean. The RTL label defect (870px gap) is also an accessibility
problem axe does not catch.

---

## Determinism

All dates from fixtures' ISO strings, formatted with `timeZone: "UTC"`. No
`new Date()` without arguments.

---

## Shared packages

Not modified. The token palette's `textDisabled` value cannot pass contrast when
a library applies it to non-control text -- a token-design question for UNDRR.
