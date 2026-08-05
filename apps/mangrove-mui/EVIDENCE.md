# Evidence: MUI Community on the Mangrove host

Structured record in `evidence.json`. This is the prose.

**Summary.** Of 30 requirements: **26 native, 4 composed, 0 custom, 0
unsupported**, for 54 custom lines. Leakage clean, 14 canaries, zero differences.
Scoped axe: 1 serious violation, 0 critical, 4 incomplete. Long labels clean at
every viewport. **42 e2e tests: 39 pass, 3 fail, and the 3 failures are left
failing on purpose.**

The four composed entries are `datetime-range-picker` (the licensed-tier
blocker), `validation-states` (no form-level error channel), `rtl` (incomplete —
see below) and `side-by-side`.

This is the twin of `apps/delta-mui`: same library, same version, same fixtures,
different host. `src/theme.ts` is identical between the two, so the comparison
below is a clean read of what the *host* costs.

---

## The three headline results

**1. The host changed nothing about leakage.** 14 canaries, 27 watched
properties, zero differences, exactly as on Delta. Neither host could be
contaminated by MUI, because the two things that would have done it — a global
reset and `:root` custom properties — were both declined deliberately.

**2. The host changed a great deal about styling, in the opposite direction.**
Mangrove restyles the *candidate*. That is invisible to the leakage assertion,
which only watches host elements, and it cost the only host-specific CSS in this
run. Details below.

**3. A real MUI RTL defect surfaced here that the delta-mui run missed.** It is
not host-specific — it reproduces identically on Delta — but this run found it and
recorded it, and `apps/delta-mui/evidence.json` says `rtl: clean`, which is
wrong. See "The failing test" below.

---

## Mangrove restyles MUI's inputs, and wins on specificity

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

Element plus attribute: specificity **(0,1,1)**. MUI's own slot class
`.MuiOutlinedInput-input` is **(0,1,0)** and loses.

Measured on a section-1 TextField with our repair removed at runtime:

| Property | Unrepaired | Repaired |
| --- | --- | --- |
| `border-top-width` | `2px` | `0px` |
| `height` | `46px` | `38.8px` |
| `background-color` | `rgb(255, 255, 255)` | `rgba(0, 0, 0, 0)` |
| `font-family` | `Roboto, sans-serif` | the token stack |

A 2px black box in the host's font, drawn *inside* MUI's own notched outline, on
every TextField, Select, Autocomplete and picker field on the page. Repaired with
10 lines under `.demo .MuiOutlinedInput-input` — (0,2,0), no `!important` needed.

**The cause traces straight back to a containment decision.** `CssBaseline` is
MUI's global reset and it is what neutralises host element styling like this. It
was declined because it writes to `html`, `body` and `*` and would have restyled
the host's canaries, failing the leakage assertion. So on Delta, omitting
CssBaseline cost nothing visible; on Mangrove it costs this. That is the honest
shape of the trade: **containment and correct rendering are in tension here, and
Mangrove is where the tension shows.**

Whoever adopts MUI inside a Mangrove application should decide this centrally —
either Mangrove scopes its input rules to a class, or the host absorbs
`CssBaseline`, or every consumer writes these ten lines.

---

## Three anticipated host problems that did not happen

Brief and prior evidence pointed at these. All three were measured, and all three
were **inert against MUI 9.10.1**. The rules written for them were deleted rather
than left in to pad the CSS count; `src/demo.css` lists them.

**The `[hidden]` specificity bug did not bite.** Mangrove's `[hidden] { display:
none }` (0,1,0) really does lose to its own `input[type=text] { display: block }`
(0,1,1) — that part is confirmed, and it is a genuine host defect that broke the
React Aria run. But MUI never uses the `hidden` attribute: its picker and Select
helper inputs are `aria-hidden="true"`, collapsed to 1px by MUI's own CSS, and
**carry no `type` attribute at all**, so neither Mangrove rule matches them.
Surveyed in e2e: 0 elements with `[hidden]` anywhere in the candidate subtree, 0
helper inputs with a `type` attribute. The test asserts the second of those too,
so a future MUI version that starts emitting `type` shows up as a regression
rather than as a silent visual bug.

**This run's clean result is luck about an implementation detail, not evidence
the host bug is harmless.** It should still be fixed in Mangrove.

**Mangrove's `ul` rule did not reach MUI's lists.** `ul { padding-left: 1.25rem;
list-style-position: outside }` was expected to indent `MuiList` and the
Autocomplete listbox. Measured `padding-left: 0px` and `list-style-type: none` in
both, in the subtree and inside portals, with our reset removed. MUI's own List
styles already win.

**Mangrove's `legend` rule never matches MUI's notch legend.** The host rule is a
descendant selector, not a bare `legend`. Legend metrics were byte-identical with
and without a reset: `font-size: 13.71px`, `margin-bottom: 0px`, `width: 60.73px`.

---

## The failing test: MUI's RTL is incomplete without a third-party plugin

**Three of 42 tests fail. They are the same test at three viewports and they are
left failing, per the brief's honesty rule.**

`createTheme(base, { direction: "rtl" })` flips layout, component internals and
the pickers. What it does not flip is the physical CSS offsets emotion has
already emitted. `MuiInputLabel-outlined` is positioned with `left: 0` plus
`transform: translate(14px, -9px)`.

Consequence, measured in Arabic at 1440px on the `server-rejected` form field:

| | Value |
| --- | --- |
| FormControl | 1086px wide, x = 37 |
| Input | 202px wide, x = 921 (correct: logical start is the right) |
| Label | x = 51, `left: 0px` (wrong: physical left) |
| Distance from label to the field it names | **870px** |

Any TextField whose FormControl is wider than its input is affected. MUI's
documented fix is a stylis RTL plugin — `stylis-plugin-rtl` — in the emotion
cache. That is a third-party package outside the candidate's own ecosystem, and
Brief 1 constraint 2 forbids adding one, so it was not added and the test was not
weakened.

**Two things make this worth stating carefully.** First, it is the *candidate*,
not the host: the same defect is visible in
`apps/delta-mui/screenshots/desktop/rtl/01-forms.png`, at the same place, with the
same geometry. Second, `apps/delta-mui/evidence.json` records `rtl: clean` and
`status: composed` with no issues listed. That is a miss, not a difference
between the hosts, and the aggregate comparison should not read it as one.

For contrast, `mangrove-react-aria` needed only `I18nProvider` and wrote no
direction-aware CSS at all. On this requirement React Aria is simply better.

---

## The date-time range: what composition actually cost

MUI's range pickers exist only in `@mui/x-date-pickers-pro`, licence
`SEE LICENSE IN LICENSE`. Verified empirically rather than from memory: the
community package ships **zero** `Range*` components (see `licences.md`).

Composed from two `DateTimePicker`s with `ampm={false}`, minute views,
`minDateTime`/`maxDateTime` wired between them, and the span derived in
application code. **31 custom lines.** Renders as
"1 May 2026, 00:00 – 15 Jun 2026, 23:59 (46 days)".

What a native range picker would have given, which this does not:

- **One calendar showing both endpoints** with the intervening days highlighted.
  Here there are two independent calendars and the user holds the range in their
  head.
- **Drag-to-select** across a range.
- **One popover and one focus trap** instead of two.
- **Shared "now editing the end" state**, so tabbing from start to end does not
  re-enter a fresh picker.
- **A single accessible name for the range as a concept.** Screen-reader users get
  two unrelated date-time fields. This is the most substantive loss and it is an
  accessibility one, not a cosmetic one.
- **The derived span for free.** The duration line is our code.

`minDateTime`/`maxDateTime` do disable out-of-range days in each calendar, so
inversion is not reachable through the picker UI — but that wiring is ours, and
typed input still needs the explicit check. It could not be verified end to end:
the calendar opens on a month containing no out-of-range days, so there is no
disabled day to assert against. Recorded in `humanReviewRequired` rather than
papered over.

**Verdict:** `composed`, not `unsupported`. Genuinely usable, meaningfully worse
than native, and the gap is mostly borne by screen-reader users.

---

## Portalled overlays: immune, and the reason cuts both ways

MUI portals its popper and popover to `document.body`, outside the
`.undrr-tokens` element. Asserted rather than assumed:

| | Measured |
| --- | --- |
| `.MuiPopover-paper` background | `rgb(255, 255, 255)` |
| `--undrr-color-surface` visible in the portal | `""` (empty) |

The overlay is styled correctly *even though the token is not reachable there*,
because MUI's theme resolved token values at build time and emotion emitted
literal colours. The `mangrove-react-aria` run had to put the token scope class on
every portalled overlay to avoid transparent popovers.

The same build-time inlining is why MUI's theme is a **copy** of the tokens rather
than a live reference: change a token and you need a rebuild. Immunity here and
inflexibility there are the same property.

---

## Matching the host: further away than on Delta

Section 9 is the evidence. The host column uses Mangrove's real classes —
`mg-button mg-button-primary`, `mg-table mg-table--striped`, `mg-card` — so it is
styled by the design system itself.

MUI themed to the neutral UNDRR tokens does not read as Mangrove: different
radius, different table density, different button weight, a different blue.
`variant="outlined"` and `elevation={0}` get MUI's Card to flat-and-bordered, but
the remaining distance is a *palette and type scale* problem, and **Mangrove 1.8.1
publishes no CSS custom properties at all**, so there is nothing to point MUI's
theme at. Even after 2.0 lands, font sizes, font families and breakpoints stay
SCSS-only.

So on this host, "themed to match the host" is not reachable through the token
mapping. It would require transcribing Mangrove's Sass values into the MUI theme
by hand and keeping them in step manually. That was not done, and the residual
gap is left visible in the screenshots rather than hidden.

The Mangrove 2.0 preview tokens were **not** used. All theming numbers in
`evidence.json` measure `packages/undrr-tokens` only.

---

## Where MUI clearly wins, on this host as on Delta

**The data table.** Sorting, multi-select with select-all, filtering, pagination
with a page-size control and column resizing are all props. **Zero custom lines
across all six table requirements.** `mangrove-react-aria`, on this same host,
needed 70 lines for sorting, filtering and pagination, and had to build the
pagination control from scratch because no component exists.

**Multiselect.** `multiple` on `Autocomplete`, chips included. React Aria has no
multiselect component.

**States.** `Alert` with correct ARIA roles, `LinearProgress`, DataGrid's
`loading` prop and `localeText.noRowsLabel`.

**Long labels.** 0px horizontal overflow in German at 390, 1024 and 1440 —
against `mangrove-react-aria`'s 261px overflow at 390px on the same host.

**Inline links.** `Link` underlines by default, which is exactly what Mangrove's
own bare `a` styling fails to do. On the one accessibility rule the host baseline
fails, the candidate behaves better than the host.

**27 lines of CSS across 7 selectors**, against 624 lines and 115 selectors for
React Aria on this host. Styling moved into `theme.ts` rather than disappearing,
but that file is 111 lines.

---

## Where it cost

**Bundle: 397.6 kB gzipped JS, 158 dependencies.** `mangrove-react-aria`: 237.6 kB
and 20. Add 35.5 kB gzipped CSS, essentially all of which is
Mangrove's own stylesheet: the design system ships 197.5 kB raw / 37.0 kB gzipped
on its own, and the app's entire CSS bundle is 190.7 kB raw / 35.5 kB gzipped
after Vite minifies it. A host cost both Mangrove pairings pay
(`mangrove-react-aria`: 37.3 kB). For a disaster-loss reporting tool
used on constrained connections, the 160 kB JS difference is a real consideration.

**Theming is a build-time copy, not a live reference.** See the portals section.
MUI's palette and the UNDRR tokens are two sources of truth kept in step by hand.

**`cssVariables: true` was rejected deliberately.** It would make MUI emit
`--mui-*` properties at `:root`, putting MUI's palette in the same global scope as
the host.

**RTL costs more than React Aria and does not finish the job.** See the failing
test.

**Two TypeScript friction points**, both worth knowing before adopting:

- **MUI's picker props are not `exactOptionalPropertyTypes`-compatible.**
  `minDateTime`/`maxDateTime` are typed `Date` rather than `Date | undefined`, so
  `value ?? undefined` fails to compile and a conditional spread is required.
- **`Stack` no longer accepts `flexWrap`/`alignItems` as direct props** in v9.

---

## Accessibility

**No conformance is claimed.** Results recorded verbatim.

Scoped to the candidate subtree: **1 serious violation, 0 critical, 4
incomplete.** The violation is `color-contrast` on the disabled field's helper
text. MUI applies its disabled text colour to the associated helper text, and the
token palette's `--undrr-color-text-disabled` (`#8b9aa5`) is roughly 2.8:1 on
white. Disabled *controls* are exempt from WCAG 1.4.3; helper text is not itself a
disabled control, so this needs a ruling. Tokens are import-only, so it could not
be fixed here.

Whole page: **2 serious violations** — `color-contrast` (above) and
`link-in-text-block`. **The second is the Mangrove host baseline**, on the host's
own canary paragraph, caused by Mangrove styling bare `a` elements with colour and
`text-decoration: none`. It is not caused by MUI and is excluded from the scoped
numbers in `evidence.json`, per `docs/requirements.md`.

Per-section: only section 1 carries a violation. Sections 2, 3, 4, 6 and 7 report
incompletes; sections 5 and 9 are entirely clean. Identical section-level shape to
delta-mui.

The RTL label defect above is an accessibility problem as well as a visual one — a
label 870px from its input is still programmatically associated, but visually it
names nothing. axe does not catch it.

---

## Determinism

All dates parsed from the fixtures' ISO strings, formatted with an explicit
`timeZone: "UTC"` in every `Intl` formatter. No `new Date()` with no argument
anywhere in demo code.

---

## Shared packages

Not modified. Three findings against things this run could not edit:

1. **Mangrove's input rules** should be class-scoped, or shipped with an opt-in
   reset. Every Mangrove pairing will hit them.
2. **Mangrove's `[hidden]` specificity bug** is still live in 1.8.1 even though
   MUI happens to dodge it.
3. **The token palette's `textDisabled`** cannot pass contrast when a library
   applies it to non-control text. A token-design question for UNDRR, not
   something a demo should fix.
