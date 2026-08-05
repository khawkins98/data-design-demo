<!--
  GENERATED FILE - DO NOT EDIT BY HAND.
  Produced by scripts/build-comparison.mjs from apps/*/evidence.json.
  Regenerate with: pnpm comparison
-->

# Candidate comparison

3 of 8 pairings have reported. Every figure below comes
from a run's own `evidence.json`; nothing here is entered by hand.

Read this alongside each run's `EVIDENCE.md`, which carries the reasoning the
numbers cannot.

## Headline

| | Adobe React Aria<br>Delta | MUI<br>Delta | IBM Carbon<br>Delta | Mantine<br>Delta | Adobe React Aria<br>Mangrove | MUI<br>Mangrove | IBM Carbon<br>Mangrove | Mantine<br>Mangrove |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Native** | — | 26 | — | — | 21 | 26 | — | — |
| **Composed** | — | 4 | — | — | 7 | 4 | — | — |
| **Custom** | — | 0 | — | — | 2 | 0 | — | — |
| **Unsupported** | — | 0 | — | — | 0 | 0 | — | — |
| Custom lines of code | — | 54 | — | — | 106 | 54 | — | — |
| Custom CSS lines | — | 14 | — | — | 624 | 27 | — | — |
| CSS selectors | — | 3 | — | — | 115 | 7 | — | — |
| Wrappers | — | 3 | — | — | 3 | 2 | — | — |
| Tokens applied | — | 29 | — | — | 47 | 32 | — | — |
| Tokens unreachable | — | 0 | — | — | 0 | 0 | — | — |
| Bundle (kB gzipped) | — | 387.4 | — | — | 237.6 | 397.6 | — | — |
| Dependencies | — | 142 | — | — | 20 | 158 | — | — |
| Build time (s) | — | 2.4 | — | — | 1.2 | 1.7 | — | — |

## Conformance signals

Leakage is the load-bearing one: it says whether the candidate stayed inside
its own subtree and left the host's own elements alone. axe counts are scoped
to the candidate subtree, so host baseline violations are excluded.

| | Adobe React Aria<br>Delta | MUI<br>Delta | IBM Carbon<br>Delta | Mantine<br>Delta | Adobe React Aria<br>Mangrove | MUI<br>Mangrove | IBM Carbon<br>Mangrove | Mantine<br>Mangrove |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Leakage | — | clean | — | — | clean | clean | — | — |
| axe violations | — | 1 | — | — | 0 | 1 | — | — |
| axe critical | — | 0 | — | — | 0 | 0 | — | — |
| axe serious | — | 1 | — | — | 0 | 1 | — | — |
| axe incomplete | — | 4 | — | — | 1 | 4 | — | — |
| RTL | — | issues | — | — | clean | issues | — | — |
| Long labels | — | clean | — | — | issues | clean | — | — |
| Blockers | — | 0 | — | — | 0 | 0 | — | — |

## Requirement matrix

`N` native · `C` composed · `X` custom · **`U`** unsupported · `·` not started

| | Adobe React Aria<br>Delta | MUI<br>Delta | IBM Carbon<br>Delta | Mantine<br>Delta | Adobe React Aria<br>Mangrove | MUI<br>Mangrove | IBM Carbon<br>Mangrove | Mantine<br>Mangrove |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `buttons` | · | N | · | · | N | N | · | · |
| `links` | · | N | · | · | N | N | · | · |
| `text-input` | · | N | · | · | N | N | · | · |
| `validation-states` | · | C | · | · | N | C | · | · |
| `disabled-states` | · | N | · | · | N | N | · | · |
| `select-small` | · | N | · | · | N | N | · | · |
| `select-medium` | · | N | · | · | N | N | · | · |
| `select-large` | · | N | · | · | N | N | · | · |
| `multiselect` | · | N | · | · | C | N | · | · |
| `combobox-searchable` | · | N | · | · | N | N | · | · |
| `date-picker` | · | N | · | · | N | N | · | · |
| `datetime-range-picker` | · | C | · | · | N | C | · | · |
| `modal` | · | N | · | · | N | N | · | · |
| `tooltip` | · | N | · | · | N | N | · | · |
| `popover` | · | N | · | · | N | N | · | · |
| `accordion` | · | N | · | · | N | N | · | · |
| `cards` | · | N | · | · | X | N | · | · |
| `left-nav` | · | N | · | · | N | N | · | · |
| `table-render` | · | N | · | · | N | N | · | · |
| `table-sort` | · | N | · | · | C | N | · | · |
| `table-multiselect` | · | N | · | · | N | N | · | · |
| `table-filter` | · | N | · | · | C | N | · | · |
| `table-paginate` | · | N | · | · | X | N | · | · |
| `table-column-resize-or-reorder` | · | N | · | · | N | N | · | · |
| `table-states` | · | N | · | · | C | N | · | · |
| `form-states` | · | N | · | · | C | N | · | · |
| `locale-switcher` | · | N | · | · | N | N | · | · |
| `rtl` | · | C | · | · | N | C | · | · |
| `long-labels` | · | N | · | · | C | N | · | · |
| `side-by-side` | · | C | · | · | C | C | · | · |

## Unsupported requirements

None so far, among the pairings that have reported.

## Blockers

None reported.

## Still needs human review

No run claims accessibility conformance. These are the items each run flagged
as needing a person, and they do not appear in any count above.

### delta-mui

- RTL floating labels are broken and cannot be fixed within the rules. MUI's remedy is stylis-plugin-rtl, which constraint 2 forbids as a third-party package. UNDRR needs to decide whether that is acceptable for an Arabic-serving service, or whether it disqualifies MUI Community. Confirmed to affect both MUI pairings, so it is the candidate and not the host.
- axe `color-contrast` (1 serious): the helper text on the disabled TextField fails contrast. MUI applies its disabled text colour to the associated helper text, and the neutral token palette's --undrr-color-text-disabled (#8b9aa5) is roughly 2.8:1 on white. Disabled *controls* are exempt from WCAG 1.4.3, but helper text is not itself a disabled control, so this needs a ruling. Tokens are import-only so it could not be fixed here.
- axe reported 4 incomplete rules it could not decide: aria-prohibited-attr, aria-valid-attr-value, color-contrast, duplicate-id-aria. `duplicate-id-aria` on a DataGrid page is worth a human look, since duplicate ARIA ids break screen-reader association.
- The 400-option Select renders all 400 MenuItems. MUI Select has no built-in virtualisation; Autocomplete was capped at 100 rendered options instead. Whether the plain Select is acceptable at that size is a performance decision not taken here.
- Keyboard and screen-reader testing by a human, particularly the composed date-time range: two separate pickers give screen-reader users two unrelated fields with no single accessible name for the range as a concept.
- Omitting CssBaseline is a real deviation from MUI's intended setup. ScopedCssBaseline was used instead, which contains the reset but means MUI components run without the global normalisation they are built to expect. Needs a decision on whether that trade is acceptable, or whether the host should absorb CssBaseline.
- The composed range's minDateTime/maxDateTime wiring is present in code but was NOT verified end to end: the calendar opens on a month with no out-of-range days, so no disabled day exists to assert against. Verified by reading the props only.

### mangrove-react-aria

- axe `color-contrast` (1 incomplete, sections 2 and 6): axe could not determine contrast automatically. Needs manual checking, particularly disabled button and hint text against the neutral token palette.
- Horizontal scroll of 261px at 390px width in German is unresolved. Needs a design decision: stack the date-time range picker's two endpoints vertically at mobile, or accept horizontal scroll in that section.
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
