<!--
  GENERATED FILE - DO NOT EDIT BY HAND.
  Produced by scripts/build-comparison.mjs from apps/*/evidence.json.
  Regenerate with: pnpm comparison
-->

# Candidate comparison

2 of 8 pairings have reported. Every figure below comes
from a run's own `evidence.json`; nothing here is entered by hand.

Read this alongside each run's `EVIDENCE.md`, which carries the reasoning the
numbers cannot.

## Headline

| | Adobe React Aria<br>Delta | MUI<br>Delta | IBM Carbon<br>Delta | Mantine<br>Delta | Adobe React Aria<br>Mangrove | MUI<br>Mangrove | IBM Carbon<br>Mangrove | Mantine<br>Mangrove |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Native** | — | 26 | — | — | 21 | — | — | — |
| **Composed** | — | 4 | — | — | 7 | — | — | — |
| **Custom** | — | 0 | — | — | 2 | — | — | — |
| **Unsupported** | — | 0 | — | — | 0 | — | — | — |
| Custom lines of code | — | 54 | — | — | 106 | — | — | — |
| Custom CSS lines | — | 14 | — | — | 624 | — | — | — |
| CSS selectors | — | 3 | — | — | 115 | — | — | — |
| Wrappers | — | 3 | — | — | 3 | — | — | — |
| Tokens applied | — | 29 | — | — | 47 | — | — | — |
| Tokens unreachable | — | 0 | — | — | 0 | — | — | — |
| Bundle (kB gzipped) | — | 387.4 | — | — | 237.6 | — | — | — |
| Dependencies | — | 142 | — | — | 20 | — | — | — |
| Build time (s) | — | 2.4 | — | — | 1.2 | — | — | — |

## Conformance signals

Leakage is the load-bearing one: it says whether the candidate stayed inside
its own subtree and left the host's own elements alone. axe counts are scoped
to the candidate subtree, so host baseline violations are excluded.

| | Adobe React Aria<br>Delta | MUI<br>Delta | IBM Carbon<br>Delta | Mantine<br>Delta | Adobe React Aria<br>Mangrove | MUI<br>Mangrove | IBM Carbon<br>Mangrove | Mantine<br>Mangrove |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Leakage | — | clean | — | — | clean | — | — | — |
| axe violations | — | 1 | — | — | 0 | — | — | — |
| axe critical | — | 0 | — | — | 0 | — | — | — |
| axe serious | — | 1 | — | — | 0 | — | — | — |
| axe incomplete | — | 4 | — | — | 1 | — | — | — |
| RTL | — | clean | — | — | clean | — | — | — |
| Long labels | — | clean | — | — | issues | — | — | — |
| Blockers | — | 0 | — | — | 0 | — | — | — |

## Requirement matrix

`N` native · `C` composed · `X` custom · **`U`** unsupported · `·` not started

| | Adobe React Aria<br>Delta | MUI<br>Delta | IBM Carbon<br>Delta | Mantine<br>Delta | Adobe React Aria<br>Mangrove | MUI<br>Mangrove | IBM Carbon<br>Mangrove | Mantine<br>Mangrove |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `buttons` | · | N | · | · | N | · | · | · |
| `links` | · | N | · | · | N | · | · | · |
| `text-input` | · | N | · | · | N | · | · | · |
| `validation-states` | · | C | · | · | N | · | · | · |
| `disabled-states` | · | N | · | · | N | · | · | · |
| `select-small` | · | N | · | · | N | · | · | · |
| `select-medium` | · | N | · | · | N | · | · | · |
| `select-large` | · | N | · | · | N | · | · | · |
| `multiselect` | · | N | · | · | C | · | · | · |
| `combobox-searchable` | · | N | · | · | N | · | · | · |
| `date-picker` | · | N | · | · | N | · | · | · |
| `datetime-range-picker` | · | C | · | · | N | · | · | · |
| `modal` | · | N | · | · | N | · | · | · |
| `tooltip` | · | N | · | · | N | · | · | · |
| `popover` | · | N | · | · | N | · | · | · |
| `accordion` | · | N | · | · | N | · | · | · |
| `cards` | · | N | · | · | X | · | · | · |
| `left-nav` | · | N | · | · | N | · | · | · |
| `table-render` | · | N | · | · | N | · | · | · |
| `table-sort` | · | N | · | · | C | · | · | · |
| `table-multiselect` | · | N | · | · | N | · | · | · |
| `table-filter` | · | N | · | · | C | · | · | · |
| `table-paginate` | · | N | · | · | X | · | · | · |
| `table-column-resize-or-reorder` | · | N | · | · | N | · | · | · |
| `table-states` | · | N | · | · | C | · | · | · |
| `form-states` | · | N | · | · | C | · | · | · |
| `locale-switcher` | · | N | · | · | N | · | · | · |
| `rtl` | · | C | · | · | N | · | · | · |
| `long-labels` | · | N | · | · | C | · | · | · |
| `side-by-side` | · | C | · | · | C | · | · | · |

## Unsupported requirements

None so far, among the pairings that have reported.

## Blockers

None reported.

## Still needs human review

No run claims accessibility conformance. These are the items each run flagged
as needing a person, and they do not appear in any count above.

### delta-mui

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
