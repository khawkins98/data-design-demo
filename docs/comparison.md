<!--
  GENERATED FILE - DO NOT EDIT BY HAND.
  Produced by scripts/build-comparison.mjs from apps/*/evidence.json.
  Regenerate with: pnpm comparison
-->

# Candidate comparison

5 of 8 pairings have reported. Every figure below comes
from a run's own `evidence.json`; nothing here is entered by hand.

Read this alongside each run's `EVIDENCE.md`, which carries the reasoning the
numbers cannot.

## Headline

| | Adobe React Aria<br>Delta | MUI<br>Delta | IBM Carbon<br>Delta | Mantine<br>Delta | Adobe React Aria<br>Mangrove | MUI<br>Mangrove | IBM Carbon<br>Mangrove | Mantine<br>Mangrove |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Native** | 20 | 26 | — | 20 | 21 | 26 | — | — |
| **Composed** | 8 | 4 | — | 7 | 7 | 4 | — | — |
| **Custom** | 2 | 0 | — | 3 | 2 | 0 | — | — |
| **Unsupported** | 0 | 0 | — | 0 | 0 | 0 | — | — |
| Custom lines of code | 128 | 54 | — | 411 | 122 | 54 | — | — |
| Custom CSS lines | 715 | 14 | — | 72 | 661 | 27 | — | — |
| CSS selectors | 156 | 3 | — | 17 | 120 | 7 | — | — |
| Wrappers | 5 | 3 | — | 4 | 3 | 2 | — | — |
| Tokens applied | 48 | 29 | — | 66 | 47 | 32 | — | — |
| Tokens unreachable | 0 | 0 | — | 5 | 0 | 0 | — | — |
| Bundle (kB gzipped) | 238.8 | 387.4 | — | 238.8 | 237.6 | 397.6 | — | — |
| Dependencies | 19 | 142 | — | 112 | 20 | 158 | — | — |
| Build time (s) | 2 | 2.4 | — | 2.6 | 1.2 | 1.7 | — | — |

## Conformance signals

Leakage is the load-bearing one: it says whether the candidate stayed inside
its own subtree and left the host's own elements alone. axe counts are scoped
to the candidate subtree, so host baseline violations are excluded.

| | Adobe React Aria<br>Delta | MUI<br>Delta | IBM Carbon<br>Delta | Mantine<br>Delta | Adobe React Aria<br>Mangrove | MUI<br>Mangrove | IBM Carbon<br>Mangrove | Mantine<br>Mangrove |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Leakage | clean | clean | — | clean | clean | clean | — | — |
| axe violations | 0 | 1 | — | 0 | 0 | 1 | — | — |
| axe critical | 0 | 0 | — | 0 | 0 | 0 | — | — |
| axe serious | 0 | 1 | — | 0 | 0 | 1 | — | — |
| axe incomplete | 1 | 4 | — | 1 | 1 | 4 | — | — |
| RTL | clean | issues | — | clean | clean | issues | — | — |
| Long labels | clean | clean | — | clean | clean | clean | — | — |
| Blockers | 0 | 0 | — | 0 | 0 | 0 | — | — |

## Requirement matrix

`N` native · `C` composed · `X` custom · **`U`** unsupported · `·` not started

| | Adobe React Aria<br>Delta | MUI<br>Delta | IBM Carbon<br>Delta | Mantine<br>Delta | Adobe React Aria<br>Mangrove | MUI<br>Mangrove | IBM Carbon<br>Mangrove | Mantine<br>Mangrove |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `buttons` | N | N | · | N | N | N | · | · |
| `links` | N | N | · | N | N | N | · | · |
| `text-input` | N | N | · | N | N | N | · | · |
| `validation-states` | N | C | · | C | N | C | · | · |
| `disabled-states` | N | N | · | N | N | N | · | · |
| `select-small` | N | N | · | N | N | N | · | · |
| `select-medium` | N | N | · | N | N | N | · | · |
| `select-large` | N | N | · | N | N | N | · | · |
| `multiselect` | C | N | · | N | C | N | · | · |
| `combobox-searchable` | N | N | · | N | N | N | · | · |
| `date-picker` | N | N | · | N | N | N | · | · |
| `datetime-range-picker` | N | C | · | N | N | C | · | · |
| `modal` | N | N | · | N | N | N | · | · |
| `tooltip` | N | N | · | N | N | N | · | · |
| `popover` | N | N | · | N | N | N | · | · |
| `accordion` | N | N | · | N | N | N | · | · |
| `cards` | X | N | · | N | X | N | · | · |
| `left-nav` | N | N | · | N | N | N | · | · |
| `table-render` | N | N | · | C | N | N | · | · |
| `table-sort` | C | N | · | X | C | N | · | · |
| `table-multiselect` | C | N | · | X | C | N | · | · |
| `table-filter` | C | N | · | C | C | N | · | · |
| `table-paginate` | X | N | · | C | X | N | · | · |
| `table-column-resize-or-reorder` | N | N | · | X | N | N | · | · |
| `table-states` | C | N | · | C | C | N | · | · |
| `form-states` | C | N | · | N | C | N | · | · |
| `locale-switcher` | N | N | · | N | N | N | · | · |
| `rtl` | N | C | · | C | N | C | · | · |
| `long-labels` | C | N | · | N | N | N | · | · |
| `side-by-side` | C | C | · | C | C | C | · | · |

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
