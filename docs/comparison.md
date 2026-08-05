<!--
  GENERATED FILE - DO NOT EDIT BY HAND.
  Produced by scripts/build-comparison.mjs from apps/*/evidence.json.
  Regenerate with: pnpm comparison
-->

# Candidate comparison

7 of 8 pairings have reported. Every figure below comes
from a run's own `evidence.json`; nothing here is entered by hand.

Read this alongside each run's `EVIDENCE.md`, which carries the reasoning the
numbers cannot.

## Headline

| | Adobe React Aria<br>Delta | MUI<br>Delta | IBM Carbon<br>Delta | Mantine<br>Delta | Adobe React Aria<br>Mangrove | MUI<br>Mangrove | IBM Carbon<br>Mangrove | Mantine<br>Mangrove |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Native** | 20 | 26 | 19 | 20 | 21 | 26 | — | 19 |
| **Composed** | 8 | 4 | 10 | 7 | 7 | 4 | — | 10 |
| **Custom** | 2 | 0 | 1 | 3 | 2 | 0 | — | 1 |
| **Unsupported** | 0 | 0 | 0 | 0 | 0 | 0 | — | 0 |
| Custom lines of code | 128 | 54 | 171 | 411 | 122 | 54 | — | 293 |
| Custom CSS lines | 715 | 14 | 300 | 72 | 661 | 27 | — | 103 |
| CSS selectors | 156 | 3 | 34 | 17 | 120 | 7 | — | 44 |
| Wrappers | 5 | 3 | 4 | 4 | 3 | 2 | — | 4 |
| Tokens applied | 48 | 29 | 50 | 66 | 47 | 32 | — | 62 |
| Tokens unreachable | 0 | 0 | 21 | 5 | 0 | 0 | — | 0 |
| Bundle (kB gzipped) | 238.8 | 387.4 | 261.5 | 238.8 | 237.6 | 397.6 | — | 270.9 |
| Dependencies | 19 | 142 | 145 | 112 | 20 | 158 | — | 113 |
| Build time (s) | 2 | 2.4 | 2.8 | 2.6 | 1.2 | 1.7 | — | 3.58 |

## Conformance signals

Leakage is the load-bearing one: it says whether the candidate stayed inside
its own subtree and left the host's own elements alone. axe counts are scoped
to the candidate subtree, so host baseline violations are excluded.

| | Adobe React Aria<br>Delta | MUI<br>Delta | IBM Carbon<br>Delta | Mantine<br>Delta | Adobe React Aria<br>Mangrove | MUI<br>Mangrove | IBM Carbon<br>Mangrove | Mantine<br>Mangrove |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Leakage | clean | clean | clean | clean | clean | clean | — | clean |
| axe violations | 0 | 1 | 3 | 0 | 0 | 1 | — | 0 |
| axe critical | 0 | 0 | 1 | 0 | 0 | 0 | — | 0 |
| axe serious | 0 | 1 | 2 | 0 | 0 | 1 | — | 0 |
| axe incomplete | 1 | 4 | 2 | 1 | 1 | 4 | — | 0 |
| RTL | clean | issues | clean | clean | clean | issues | — | clean |
| Long labels | clean | clean | clean | clean | clean | clean | — | clean |
| Blockers | 0 | 0 | 0 | 0 | 0 | 0 | — | 0 |

## Requirement matrix

`N` native · `C` composed · `X` custom · **`U`** unsupported · `·` not started

| | Adobe React Aria<br>Delta | MUI<br>Delta | IBM Carbon<br>Delta | Mantine<br>Delta | Adobe React Aria<br>Mangrove | MUI<br>Mangrove | IBM Carbon<br>Mangrove | Mantine<br>Mangrove |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `buttons` | N | N | N | N | N | N | · | N |
| `links` | N | N | N | N | N | N | · | N |
| `text-input` | N | N | N | N | N | N | · | N |
| `validation-states` | N | C | C | C | N | C | · | C |
| `disabled-states` | N | N | N | N | N | N | · | N |
| `select-small` | N | N | N | N | N | N | · | N |
| `select-medium` | N | N | N | N | N | N | · | N |
| `select-large` | N | N | N | N | N | N | · | N |
| `multiselect` | C | N | C | N | C | N | · | N |
| `combobox-searchable` | N | N | C | N | N | N | · | N |
| `date-picker` | N | N | N | N | N | N | · | N |
| `datetime-range-picker` | N | C | C | N | N | C | · | N |
| `modal` | N | N | N | N | N | N | · | N |
| `tooltip` | N | N | N | N | N | N | · | N |
| `popover` | N | N | N | N | N | N | · | N |
| `accordion` | N | N | N | N | N | N | · | N |
| `cards` | X | N | N | N | X | N | · | N |
| `left-nav` | N | N | C | N | N | N | · | N |
| `table-render` | N | N | C | C | N | N | · | C |
| `table-sort` | C | N | N | X | C | N | · | C |
| `table-multiselect` | C | N | N | X | C | N | · | C |
| `table-filter` | C | N | N | C | C | N | · | C |
| `table-paginate` | X | N | C | C | X | N | · | C |
| `table-column-resize-or-reorder` | N | N | X | X | N | N | · | X |
| `table-states` | C | N | C | C | C | N | · | C |
| `form-states` | C | N | N | N | C | N | · | C |
| `locale-switcher` | N | N | N | N | N | N | · | N |
| `rtl` | N | C | N | C | N | C | · | C |
| `long-labels` | C | N | C | N | N | N | · | N |
| `side-by-side` | C | C | C | C | C | C | · | C |

## Unsupported requirements

None so far, among the pairings that have reported.

## Blockers

None reported.

## Still needs human review

No run claims accessibility conformance. These are the items each run flagged
as needing a person, and they do not appear in any count above.

### delta-react-aria

- axe `color-contrast` (1 incomplete, sections 2 and 6): axe could not determine contrast automatically. Needs manual checking, particularly disabled button text, hint text and the status badges against the neutral token palette.
- Keyboard and screen-reader testing by a human. axe is static analysis and cannot confirm that the range calendar, the column resizer, listbox type-ahead or the tri-state select-all checkbox are usable with a screen reader.
- The 400-option Select renders all 400 DOM nodes. Whether that is acceptable, or whether Virtualizer should be mandatory, is a performance decision not taken here.
- Column-header truncation: with ResizableTableContainer's table-layout:fixed, long localised headers such as "Wirtschaftlicher Schaden (Mio. USD)" ellipsise at the default column width. A design decision is needed on whether that is acceptable given the resizer, or whether headers should wrap to two lines instead.
- REACT ARIA ISSUE WORTH FILING, two instances: a visually hidden control should not be able to change document layout. ColumnResizer's hidden <input type=range> is position:absolute with no positioned ancestor and escapes any ancestor overflow; Select's hidden native <select> is clipped visually but stays in layout. Both silently scroll the page sideways at narrow viewports, and both had to be worked around in consumer CSS.
- The four Delta pairings cannot use Tailwind utilities of their own. host-delta.src.css declares @source "./HostShell.tsx", so only the 75 utilities the host shell itself uses exist in the compiled stylesheet; any other utility class emits no CSS and fails silently with no build error. This run stayed inside that set deliberately and reused the host's own strings verbatim, which is why section 5's cards are pixel-identical to the host's. Worth a decision before any Delta demo is read as representative of how a real Delta app would be styled.
- The Delta host contributed 0 axe violations, matching the documented baseline, so the scoped and whole-page counts agree at 0. Nothing was subtracted.

### delta-mui

- RTL floating labels are broken and cannot be fixed within the rules. MUI's remedy is stylis-plugin-rtl, which constraint 2 forbids as a third-party package. UNDRR needs to decide whether that is acceptable for an Arabic-serving service, or whether it disqualifies MUI Community. Confirmed to affect both MUI pairings, so it is the candidate and not the host.
- axe `color-contrast` (1 serious): the helper text on the disabled TextField fails contrast. MUI applies its disabled text colour to the associated helper text, and the neutral token palette's --undrr-color-text-disabled (#8b9aa5) is roughly 2.8:1 on white. Disabled *controls* are exempt from WCAG 1.4.3, but helper text is not itself a disabled control, so this needs a ruling. Tokens are import-only so it could not be fixed here.
- axe reported 4 incomplete rules it could not decide: aria-prohibited-attr, aria-valid-attr-value, color-contrast, duplicate-id-aria. `duplicate-id-aria` on a DataGrid page is worth a human look, since duplicate ARIA ids break screen-reader association.
- The 400-option Select renders all 400 MenuItems. MUI Select has no built-in virtualisation; Autocomplete was capped at 100 rendered options instead. Whether the plain Select is acceptable at that size is a performance decision not taken here.
- Keyboard and screen-reader testing by a human, particularly the composed date-time range: two separate pickers give screen-reader users two unrelated fields with no single accessible name for the range as a concept.
- Omitting CssBaseline is a real deviation from MUI's intended setup. ScopedCssBaseline was used instead, which contains the reset but means MUI components run without the global normalisation they are built to expect. Needs a decision on whether that trade is acceptable, or whether the host should absorb CssBaseline.
- The composed range's minDateTime/maxDateTime wiring is present in code but was NOT verified end to end: the calendar opens on a month with no out-of-range days, so no disabled day exists to assert against. Verified by reading the props only.

### delta-carbon

- axe `aria-valid-attr-value` (1 CRITICAL), on #form-required and #form-format. Carbon's invalid TextInput sets aria-errormessage pointing at its `.cds--form-requirement` div, which carries no role=alert, no aria-live and is not referenced by aria-describedby. axe verbatim: "aria-errormessage value `form-required-error-msg` must use a technique to announce the message (e.g., aria-live, aria-describedby, role=alert, etc.)". The div is Carbon's internal render and is not reachable through props, so this cannot be fixed from the consuming side. Needs confirmation against a real screen reader and, if upheld, an upstream issue — it would affect every invalid Carbon input in every Carbon application.
- axe `aria-hidden-focus` (1 serious), on `.cds--batch-actions`. Carbon's own batch-action bar sets aria-hidden while inactive but leaves its buttons in the tab order. axe verbatim: "Focusable content should be disabled or be removed from the DOM". Again Carbon's internal markup, again not reachable from props. Appeared only once TableBatchActions was rendered.
- axe `color-contrast` (1 serious), on #form-disabled-helper-text: 2.76:1 for #8b9aa5 on #f8fafc at 12px. Carbon applies its disabled text colour to the helper text of a disabled field, and --undrr-color-text-disabled is #8b9aa5. Disabled CONTROLS are exempt from WCAG 1.4.3 but helper text is not itself a disabled control, so this needs a ruling. Identical in cause to the delta-mui finding, and tokens are import-only so it could not be fixed here.
- axe reported 2 incomplete rules. `aria-valid-attr-value` on the three ComboBoxes and a downshift toggle button: "Unable to determine if aria-controls referenced ID exists on the page while using aria-haspopup" — downshift sets aria-controls to a menu id that only exists while the menu is open, which is a known pattern but worth a screen-reader check. `color-contrast` on 24 elements where "Element's background color could not be determined due to a pseudo element" — Carbon draws button and switch backgrounds with ::before layers, which defeats automated contrast checking on the ContentSwitcher, the tooltip trigger and every column-reorder button. Those 24 elements therefore have NO automated contrast coverage at all and need manual measurement.
- Carbon's Tooltip `label` prop replaces the trigger's accessible name via aria-labelledby, so a button announces its tooltip text instead of its own visible label. `description` would preserve the name. Which is correct is a content decision, but the default is surprising and this demo uses `label` because it is what Carbon's examples use.
- Carbon hides the items-per-page control below a 42rem container width via a CSS container query. On a 390px screen a reviewer cannot change the page size of a 250-row table. Whether that is acceptable for UNDRR's mobile use is a product decision.
- The 400-option ComboBox mounts all 400 items when opened with an empty query. Carbon has no virtualisation and no result cap, and unlike MUI's Autocomplete there is no documented filterOptions-style limit — capping would mean filtering in shouldFilterItem, which changes what the user can reach by scrolling. Whether that is acceptable at 400 options is a performance decision not taken here.
- The composed date-time range was only partly verified end to end. The e2e run asserts the two date inputs, the two time inputs, the derived duration, and that an invalid time string surfaces the error notification. It does NOT verify that flatpickr's range calendar disables out-of-order days, because the calendar opens on a month where no such day exists. Verified by reading the props only.
- Excluding Carbon's global reset is a real deviation from the library's intended setup, and it works here largely because the Delta host already loads Tailwind Preflight, which covers much of the same ground (box-sizing on *, font: inherit and border: 0 solid on form controls, zeroed heading and list margins). That substitution would NOT hold on a host without Preflight, and the mangrove-carbon pairing should be expected to differ. Someone needs to decide whether shipping Carbon without its reset is supportable long term.
- Keyboard and screen-reader testing by a human throughout, in particular: the custom column-reorder control (arrow-labelled buttons, no announcement of the new position after a move), the composed date-time range as a single concept, and Carbon's DataTable batch-action bar.

### delta-mantine

- axe reported `color-contrast` INCOMPLETE on one element in section 6 — a check it could not decide automatically. Needs a human ruling.
- Keyboard and screen-reader testing of the hand-built table. Mantine's Table gives no roving tabindex, no cell navigation and no selection announcement, so the entire keyboard model is this demo's. aria-sort plus a VisuallyHidden sort state is the extent of what was implemented; a real grid interaction model was not attempted.
- The column resize handle is role=separator with aria-valuenow and arrow keys. That is a defensible reading of the ARIA splitter pattern, but a resizable table column is not a window splitter and the pattern should be reviewed before it is reused.
- Mantine's DEFAULTS are repeatedly the inaccessible ones: Tooltip is hover-only unless events={{ focus: true }}, Anchor underlines on hover only, Pagination's edge controls and the clear buttons have no accessible name. Each is fixable with a documented prop. Whether UNDRR should wrap Mantine components to make the accessible configuration the default is a decision this run did not take.
- Omitting baseline.css is a real deviation from Mantine's documented setup. On the Delta host, Tailwind Preflight happens to supply the two rules that matter (box-sizing, font: inherit). A Mangrove/Mantine pairing must re-check this rather than copy src/mantine-styles.css, and UNDRR needs a decision on whether the host should absorb baseline.css instead.
- The 400-option Select renders all 400 options; limit={100} caps rendering but the full list is still walked on each keystroke, and @mantine/core has no virtualisation. Whether that is acceptable at 400 is a performance decision not taken here.
- The range picker's drag-to-select was read from the implementation, not driven in the browser. Its same-day time-inversion check is present in code but unreachable through the calendar and was not tested via typed input.
- Pointer-drag column resize was not exercised in Playwright — only keyboard resize was asserted — so the RTL delta inversion in useColumnResize is unverified.
- tokensApplied: 66 means "reachable", not "consumed by the library". Twelve are spacing steps declared as extra theme.spacing keys; they emit --mantine-spacing-* variables but Mantine's own components only consume xs–xl.
- EmptyState and DataList are new in Mantine 9 and their API stability over time is unknown. EmptyState's variant accepts only `filled` and `light`.

### mangrove-react-aria

- React Aria renders visually hidden controls that still affect document layout, in two places: ColumnResizer's hidden range input escapes any ancestor overflow unless a positioned ancestor exists, and Select's hidden native <select> stays in layout at its longest-option width. Both silently scroll the page sideways. Worth reporting upstream: a visually hidden control should not be able to change layout.
- axe `color-contrast` (1 incomplete, sections 2 and 6): axe could not determine contrast automatically. Needs manual checking, particularly disabled button and hint text against the neutral token palette.
- The 400-option Select renders all 400 DOM nodes. Whether that is acceptable, or whether Virtualizer should be mandatory, is a performance decision not taken here.
- Keyboard and screen-reader testing by a human. axe is static analysis and cannot confirm that the range calendar, column resizer or listbox type-ahead are usable with a screen reader.
- MANGROVE DEFECT, affects all four Mangrove pairings: `input[type=...] { display: block }` outranks `[hidden] { display: none }`, so any library's hidden helper inputs render visibly. Worked around per-app here; should be fixed in Mangrove.
- The Mangrove host also contributes a `link-in-text-block` serious violation (whole-page count 1, scoped count 0). Host finding, not a candidate one.
- React Aria sets z-index inline on its portal container (100000), which outranks the token z-index scale. The overlay layering tokens are therefore not honoured by this candidate without !important. MUI, whose z-index comes from its theme object, was pinnable to the token scale.

### mangrove-mui

- The failing RTL test needs a decision. Either UNDRR accepts stylis-plugin-rtl as part of adopting MUI -- it is maintained by the stylis project, not by MUI, and is a third-party dependency this brief forbids -- or Arabic gets misplaced field labels on any full-width TextField. This is the single most consequential unresolved item in this run.
- axe `color-contrast` (1 serious, scoped): the helper text on the disabled TextField fails contrast. MUI applies its disabled text colour to the associated helper text, and the neutral token palette's --undrr-color-text-disabled (#8b9aa5) is roughly 2.8:1 on white. Disabled *controls* are exempt from WCAG 1.4.3, but helper text is not itself a disabled control, so this needs a ruling. Tokens are import-only so it could not be fixed here.
- axe reported 4 incomplete rules it could not decide across the page. `duplicate-id-aria` on a DataGrid page is worth a human look, since duplicate ARIA ids break screen-reader association.
- The 10 lines of CSS neutralising Mangrove's `input[type=...]` rules are a per-app workaround that every Mangrove pairing will need in some form. It should be fixed in Mangrove -- either by excluding `[hidden]` and scoping the input rules to a class, or by shipping a reset consumers can opt into -- rather than written four times.
- Mangrove's `[hidden]` specificity bug is still present in 1.8.1 and still worth fixing upstream, even though MUI happens not to trigger it. React Aria does. This run's clean result is luck about MUI's implementation detail, not evidence the host bug is harmless.
- The 400-option Select renders all 400 MenuItems. MUI Select has no built-in virtualisation; Autocomplete was capped at 100 rendered options instead. Whether the plain Select is acceptable at that size is a performance decision not taken here.
- Keyboard and screen-reader testing by a human, particularly the composed date-time range: two separate pickers give screen-reader users two unrelated fields with no single accessible name for the range as a concept.
- Omitting CssBaseline is a real deviation from MUI's intended setup, and on this host it is the direct cause of the input repair CSS. Needs a decision on whether the host should absorb CssBaseline centrally instead.
- The composed range's minDateTime/maxDateTime wiring is present in code but was NOT verified end to end: the calendar opens on a month with no out-of-range days, so no disabled day exists to assert against. Verified by reading the props only.
- Counting note for whoever aggregates these files: this run records 32 tokensApplied for a theme.ts that is byte-identical to delta-mui's, which recorded 29. The difference is counting method, not theming depth. Pick one method before comparing.

### mangrove-mantine

- THE DATA TABLE IS THE DECISION. Mantine's Table is presentational only, and 229 of this run's 293 custom behavioural lines -- 78% -- are table code. delta-mui got sort, multi-select, filter, pagination with a page-size control AND column resize from props on one <DataGrid />, for zero custom lines. If Mantine is chosen for a *data* design system, UNDRR is choosing either to add mantine-datatable -- a well-maintained MIT package, but a third-party single-maintainer dependency in the critical path of the application's most important screen -- or to build and maintain the table layer in-house. That is a governance decision, not a technical one.
- The hand-written column resizer (src/use-column-resize.ts, 72 lines) needs screen-reader testing. It is keyboard-operable and exposes role=separator with aria-valuenow, but it does not announce width changes as they happen, which a native implementation would. It is the highest-risk piece of custom code in this run.
- Mantine ships TWO icon-only controls with no accessible name: Pagination's first/previous/next/last, and InputClearButton (rendered by `clearable`). Both were axe criticals out of the box and both are fixable through the public API, but a team that turns on `clearable` and `withEdges` without running axe ships unlabelled buttons. Worth raising upstream, and worth a lint rule locally.
- Omitting baseline.css is a real deviation from Mantine's documented setup. A scoped replacement is shipped, but Mantine's components are built expecting the global one. Needs a decision on whether that trade is acceptable, or whether the host should absorb the baseline -- which on Mangrove would mean accepting 36 changed canary properties.
- The undocumented per-component CSS import order should be raised with Mantine. The failure mode -- every button silently unstyled, with a clean build, clean types, passing tests and zero axe violations -- is the worst kind, and two independent runs in this evaluation hit it.
- The 400-option Select renders 400 option nodes. Virtualisation means dropping to the Combobox primitive and supplying your own virtualiser. Whether that is acceptable at UNDRR's list sizes is a performance decision not taken here.
- Keyboard and screen-reader testing by a human, particularly the native date-time range popover: it contains a calendar and two separate TimePickers, and axe cannot say whether moving between them is coherent.
- Mantine's Anchor defaults to underline="hover", which reproduces the host's own link-in-text-block WCAG 1.4.1 failure. It was overridden here, but it is a library default worth a local lint rule, since the two systems make the same wrong choice independently.
- The Mangrove nav accent bar is not reachable through NavLink's props or CSS variables. Either accept Mantine's tinted-background active state as the new convention, or accept custom CSS reaching into NavLink internals on every consuming page. Not faked here so the gap stays visible in the section 9 screenshots.
