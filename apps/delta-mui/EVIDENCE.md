# Evidence: MUI Community on the Delta host

Structured record in `evidence.json`. This is the prose.

**Summary.** Of 30 requirements: **26 native, 4 composed, 0 custom, 0
unsupported**, for 54 custom lines. Leakage clean. Scoped axe: 1 serious
violation, 4 incomplete. Long labels clean at every viewport.

The four composed entries are `datetime-range-picker` (the licensed-tier
blocker), `validation-states` (no form-level error channel), `rtl` (needs
`direction` on the theme, not just an attribute) and `side-by-side`.

**The headline is that `unsupported` is zero.** The date-time range picker was
expected to be a blocker; composing two free-tier pickers met the requirement at
a measurable but modest cost. The bundle is the real price: **387 kB gzipped
against React Aria's 238 kB**, and 142 dependencies against 20.

---

## The date-time range: what composition actually cost

MUI's range pickers exist only in `@mui/x-date-pickers-pro`, licence
`SEE LICENSE IN LICENSE`. Verified empirically rather than from memory: the
community package ships **zero** `Range*` components (`ls` output in
`licences.md`).

Composed from two `DateTimePicker`s with `ampm={false}`, minute views,
`minDateTime`/`maxDateTime` wired between them, and the span derived in
application code. **31 custom lines.**

What a native range picker would have given, which this does not:

- **One calendar showing both endpoints** with the intervening days highlighted.
  Here there are two independent calendars and the user holds the range in their
  head.
- **Drag-to-select** across a range.
- **One popover and one focus trap** instead of two.
- **Shared "now editing the end" state**, so tabbing from start to end does not
  re-enter a fresh picker.
- **A single accessible name for the range as a concept.** Screen-reader users
  get two unrelated date-time fields. This is the most substantive loss and it is
  an accessibility one, not a cosmetic one.
- **The derived span for free.** The "1 May 2026, 00:00 – 15 Jun 2026, 23:59
  (46 days)" summary is our code.

**One correction to an earlier claim of mine.** I first wrote that nothing
structurally prevents an end before a start. That was too strong:
`minDateTime`/`maxDateTime` wired between the two pickers do disable out-of-range
days in each calendar, so inversion is not reachable through the picker UI. The
wiring is ours rather than the component's, and typed input still needs the
explicit check, but the guard is real. I could not verify it end to end — the
calendar opens on a month containing no out-of-range days, so there is no
disabled day to assert against — and that limitation is recorded in
`humanReviewRequired` rather than papered over.

**Verdict:** `composed`, not `unsupported`. Genuinely usable, meaningfully worse
than native, and the gap is mostly borne by screen-reader users.

---

## Leakage: clean, but only because CssBaseline was omitted

14 canaries, 27 watched properties, **zero differences** — despite this being the
pairing most expected to fail. Tailwind Preflight and MUI's emotion-injected
styles coexisted without touching the host canaries.

That result depends entirely on one decision: **`CssBaseline` is not used.** It
is MUI's documented global reset and it writes to `html`, `body` and `*`, which
would reach straight past the candidate subtree and restyle the host's canaries.
`ScopedCssBaseline` applies the same reset bounded to a wrapper element.

Recorded honestly: this is a **real deviation from MUI's intended setup**, not a
free win. MUI components are built expecting the global baseline. Anyone adopting
MUI inside Delta needs to decide whether the host absorbs `CssBaseline` centrally
or every consumer scopes it.

Also relevant, though it did not trip the assertion: **MUI portals its overlays
to `document.body`**, outside the candidate subtree. Overlay content therefore
escapes any containment scoped to the subtree, which is why the theme pins MUI's
z-index layers to the token scale — MUI's defaults start above 1000 and would sit
over host chrome regardless of what the host intended.

---

## Where MUI clearly wins

**The data table.** Sorting, multi-select with select-all, filtering, pagination
with a page-size control and column resizing are all props. **Zero custom lines
across all six table requirements.** The React Aria run needed 70 lines for
sorting, filtering and pagination, and had to build the pagination control from
scratch because no component exists.

**Multiselect.** `multiple` on `Autocomplete`, chips included. React Aria has no
multiselect component and needs `ListBox` + `TagGroup` composed by hand.

**States.** `Alert` with correct ARIA roles, `LinearProgress`, DataGrid's
`loading` prop and `localeText.noRowsLabel`. React Aria needed hand-written
`role="alert"` / `role="status"` markup.

**Long labels.** 0px horizontal overflow in German at 390, 1024 and 1440 —
against React Aria's 261px overflow at 390px. Two small CSS rules to wrap grid
headers, and that was all.

**14 lines of CSS**, against 624 for React Aria. Styling moved into the theme
object rather than disappearing, but 78 lines of `theme.ts` versus 624 lines of
stylesheet is a genuine difference in volume.

---

## Where it cost

**Bundle: 387 kB gzipped, 142 dependencies.** React Aria: 238 kB and 20. For a
disaster-loss reporting tool likely to be used on constrained connections, a
149 kB gzipped difference is a real consideration, not a rounding error.

**Theming is a build-time copy, not a live reference.** MUI's theme is a
JavaScript object, so token values are resolved at build time. Change a token and
you need a rebuild; a `var()`-based consumer picks it up at runtime. This also
means MUI's palette and the UNDRR tokens are two sources of truth that must be
kept in step by hand.

**Portalled overlays needed nothing, and that is worth stating.** MUI portals its
popper to `document.body`, outside the `.undrr-tokens` element, and a computed-style
check confirms it sees an empty `--undrr-color-surface` there. It renders
`rgb(255, 255, 255)` correctly regardless, because the theme resolved token values
at build time. The react-aria run had to put the token scope class on every overlay
to avoid transparent popovers. The same build-time inlining listed above as a
drawback is exactly what makes MUI immune here.

**`cssVariables: true` was rejected deliberately.** It would make MUI emit
`--mui-*` properties at `:root`, putting MUI's palette in the same global scope
as the host. That would have made theming feel more native at the cost of the
containment this evaluation is measuring.

**RTL costs more than React Aria.** MUI needs `direction` on the theme itself —
its components read it to flip margins and icon positions — so the theme is
rebuilt per locale. `adapterLocale` also has to be threaded into
`LocalizationProvider` separately for the pickers. React Aria needed only
`I18nProvider`.

**Two TypeScript friction points**, both worth knowing before adopting:

- **MUI's picker props are not `exactOptionalPropertyTypes`-compatible.**
  `minDateTime`/`maxDateTime` are typed `Date` rather than `Date | undefined`, so
  `value ?? undefined` fails to compile and a conditional spread is required.
  Any codebase running that strict flag will hit this.
- **`Stack` no longer accepts `flexWrap`/`alignItems` as direct props** in v9;
  they must move into `sx`.

**Matching the host takes overriding, not building.** MUI's `Card` has its own
elevation, radius and padding, so reaching Delta's flat bordered cards means
`variant="outlined"` and `elevation={0}`. React Aria had no card at all, so there
was nothing to argue with. Neither is strictly better: subtracting opinions and
adding styles are different kinds of work.

---

## Accessibility

**No conformance is claimed.** Results recorded verbatim.

Scoped to the candidate subtree: **1 serious violation, 0 critical, 4
incomplete.** Whole-page counts are identical, which confirms the Delta host
contributes nothing — consistent with the host baseline measurement of 0
violations for Delta.

The violation is `color-contrast` on the disabled field's helper text. MUI
applies its disabled text colour to the associated helper text, and the neutral
token palette's `--undrr-color-text-disabled` (`#8b9aa5`) is roughly 2.8:1 on
white. Disabled *controls* are exempt from WCAG 1.4.3; helper text is not itself
a disabled control, so this needs a ruling. Tokens are import-only, so it could
not be fixed here — and that is the correct outcome under Brief 1 rather than a
gap.

Four rules came back incomplete: `aria-prohibited-attr`,
`aria-valid-attr-value`, `color-contrast`, `duplicate-id-aria`. The last is worth
a human look on a DataGrid page, since duplicate ARIA ids break screen-reader
association.

Per-section: only section 1 carries the violation. Sections 2, 3, 4, 6 and 7
report incompletes; sections 5 and 9 are entirely clean.

---

## Determinism

All dates parsed from the fixtures' ISO strings, formatted with an explicit
`timeZone: "UTC"` in every `Intl` formatter. No `new Date()` with no argument
anywhere in demo code.

---

## Shared packages

Not modified. One finding worth noting against the scaffold rather than against
MUI: the token palette's `textDisabled` value cannot pass contrast when a library
applies it to non-control text. That is a token-design question for UNDRR, not
something a demo should fix.
