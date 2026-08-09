# Evidence: MUI Community on the Delta host

Structured record in `evidence.json`. This is the prose.

**Summary.** Of 30 requirements: **26 native, 4 composed, 0 custom, 0
unsupported**, for 54 custom lines. Leakage clean. Scoped axe: 1 serious
violation, 4 incomplete. Long labels clean at every viewport.

Composed entries: `datetime-range-picker` (licensed-tier blocker),
`validation-states` (no form-level error channel), `rtl` (needs `direction` on
the theme) and `side-by-side`. Bundle is the real price: **387 kB gzipped
against React Aria's 238 kB**, 142 dependencies against 20.

---

## The date-time range: what composition actually cost

MUI's range pickers exist only in `@mui/x-date-pickers-pro` (licensed tier).
The community package ships **zero** `Range*` components (`ls` output in
`licences.md`). Composed from two `DateTimePicker`s with `ampm={false}`, minute
views, `minDateTime`/`maxDateTime` wired between them, span derived in
application code. **31 custom lines.**

What a native range picker would have given:

- **One calendar showing both endpoints** with highlighted intervening days, instead of two independent calendars.
- **Drag-to-select** across a range.
- **One popover and one focus trap** instead of two.
- **Shared "now editing the end" state** (no re-entering a fresh picker on tab).
- **A single accessible name for the range.** Screen-reader users get two unrelated date-time fields -- the most substantive loss.
- **The derived span for free.** The summary string is our code.

`minDateTime`/`maxDateTime` wiring prevents inversion through the picker UI, but
typed input still needs the explicit check (recorded in `humanReviewRequired`).

**Verdict:** `composed`. Usable, meaningfully worse than native, gap mostly borne by screen-reader users.

---

## Leakage: clean, but only because CssBaseline was omitted

14 canaries, 27 watched properties, **zero differences.** Depends on
**`CssBaseline` not being used** -- it writes to `html`, `body` and `*`.
`ScopedCssBaseline` is the bounded alternative. Adopters must decide whether the
host absorbs `CssBaseline` centrally or every consumer scopes it.

**Harness qualification:** the assertion diffs two loads of the same page, so
statically imported stylesheets cancel out. All 3 selectors in `src/demo.css`
are scoped under `.demo`. Limitation documented in
`packages/test-harness/src/leakage.ts` and `docs/requirements.md`. Emotion
styles inject at render time and were genuinely measured as absent.

**MUI portals overlays to `document.body`.** The theme pins z-index layers to
the token scale (MUI defaults start above 1000).

---

## Where MUI clearly wins

**Data table.** Sorting, multi-select with select-all, filtering, pagination
with page-size control and column resizing -- all props. **Zero custom lines
across all six table requirements.** React Aria needed 70 lines and had to build
pagination from scratch.

**Multiselect.** `multiple` on `Autocomplete`, chips included. React Aria needs
`ListBox` + `TagGroup` composed by hand.

**States.** `Alert` with correct ARIA roles, `LinearProgress`, DataGrid's
`loading` prop and `localeText.noRowsLabel`. React Aria needed hand-written
`role="alert"` / `role="status"` markup.

**Long labels.** 0px horizontal overflow in German at 390, 1024 and 1440 --
against React Aria's 261px at 390px. Two CSS rules to wrap grid headers.

**14 lines of CSS** against 624 for React Aria (78 lines of `theme.ts` versus
624 lines of stylesheet).

---

## Where it cost

**Bundle: 387 kB gzipped, 142 dependencies.** React Aria: 238 kB and 20.

**Theming is a build-time copy, not a live reference.** Changing a token
requires a rebuild. MUI's palette and the UNDRR tokens are two sources of truth
kept in step by hand.

**Portalled overlays needed no token fix.** MUI portals to `document.body`
outside `.undrr-tokens` but renders correctly because the theme resolved values
at build time. React Aria had to scope every overlay.

**`cssVariables: true` rejected** -- it would emit `--mui-*` at `:root`,
putting MUI's palette in the host's global scope.

**RTL is incomplete.** `direction: "rtl"` flips layout but does NOT change
physical offsets emotion emitted: `.MuiInputLabel-outlined` uses `left: 0`, so
outlined floating labels detach from fields. At 1440x900 in Arabic: **4 fields
displaced >100px**, worst case **854px** label-to-input gap. Visible in
`screenshots/desktop/rtl/01-forms.png`. Confirmed by `mangrove-mui` to
reproduce on the other host (candidate issue, not host). MUI's remedy
(`stylis-plugin-rtl`) is third-party, forbidden by constraint 2. Recorded in
`humanReviewRequired`.

**RTL setup is heavier than React Aria.** MUI needs `direction` on the theme
(rebuilt per locale) and `adapterLocale` in `LocalizationProvider`. React Aria
needed only `I18nProvider`.

**TypeScript friction:**
- Picker props not `exactOptionalPropertyTypes`-compatible (`minDateTime`/`maxDateTime` typed `Date` not `Date | undefined`).
- `Stack` no longer accepts `flexWrap`/`alignItems` as direct props in v9; use `sx`.

**Matching the host takes overriding.** MUI's `Card` has its own elevation,
radius and padding; Delta's flat cards need `variant="outlined"`, `elevation={0}`.

---

## Accessibility

No conformance claimed. Scoped to candidate subtree: **1 serious violation, 0
critical, 4 incomplete.** Whole-page counts match (host baseline: 0 violations).

Violation: `color-contrast` on disabled field helper text.
`--undrr-color-text-disabled` (`#8b9aa5`) is ~2.8:1 on white. Disabled
*controls* are exempt from WCAG 1.4.3; helper text is not. Tokens are
import-only and could not be fixed here.

Incomplete rules: `aria-prohibited-attr`, `aria-valid-attr-value`,
`color-contrast`, `duplicate-id-aria`. The last needs human review on DataGrid
pages. Per-section: section 1 carries the violation; 2, 3, 4, 6, 7 report
incompletes; 5 and 9 are clean.

---

## Determinism

All dates from fixtures' ISO strings, formatted with `timeZone: "UTC"`. No
`new Date()` without arguments.

---

## Shared packages

Not modified. The token palette's `textDisabled` value cannot pass contrast when
a library applies it to non-control text -- a token-design question for UNDRR.
