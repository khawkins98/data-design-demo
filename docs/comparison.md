<!--
  GENERATED FILE - DO NOT EDIT BY HAND.
  Produced by scripts/build-comparison.mjs from apps/*/evidence.json.
  Regenerate with: pnpm comparison
-->

# Candidate comparison

10 of 10 pairings have reported. Every figure below comes
from a run's own `evidence.json`; nothing here is entered by hand.

Read this alongside each run's `EVIDENCE.md`, which carries the reasoning the
numbers cannot.

## Headline

| | Adobe React Aria<br>Delta | MUI<br>Delta | IBM Carbon<br>Delta | Mantine<br>Delta | Ant Design<br>Delta | Adobe React Aria<br>Mangrove | MUI<br>Mangrove | IBM Carbon<br>Mangrove | Mantine<br>Mangrove | Ant Design<br>Mangrove |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Native** | 20 | 26 | 19 | 20 | 28 | 21 | 26 | 19 | 19 | 28 |
| **Composed** | 8 | 4 | 10 | 7 | 1 | 7 | 4 | 10 | 10 | 1 |
| **Custom** | 2 | 0 | 1 | 3 | 1 | 2 | 0 | 1 | 1 | 1 |
| **Unsupported** | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Custom lines of code | 128 | 77 | 171 | 411 | 95 | 122 | 77 | 171 | 293 | 95 |
| Custom CSS lines | 715 | 14 | 300 | 72 | 46 | 661 | 27 | 351 | 103 | 46 |
| CSS selectors | 156 | 3 | 34 | 17 | 6 | 120 | 7 | 48 | 44 | 6 |
| Wrappers | 5 | 3 | 4 | 4 | 4 | 3 | 2 | 4 | 4 | 4 |
| Tokens applied | 48 | 29 | 50 | 66 | 44 | 47 | 32 | 50 | 62 | 44 |
| Tokens unreachable | 0 | 0 | 21 | 5 | 0 | 0 | 0 | 22 | 0 | 0 |
| Bundle (kB gzipped) | 238.8 | 387.4 | 261.5 | 238.8 | 392.3 | 237.6 | 397.6 | 207.8 | 270.9 | 423.4 |
| Dependencies | 19 | 142 | 145 | 112 | 68 | 20 | 158 | 146 | 113 | 69 |
| Build time (s) | 2 | 2.4 | 2.8 | 2.6 | 1.5 | 1.2 | 1.7 | 4.7 | 3.58 | 1.5 |

## Conformance signals

Leakage is the load-bearing one: it says whether the candidate stayed inside
its own subtree and left the host's own elements alone. axe counts are scoped
to the candidate subtree, so host baseline violations are excluded.

| | Adobe React Aria<br>Delta | MUI<br>Delta | IBM Carbon<br>Delta | Mantine<br>Delta | Ant Design<br>Delta | Adobe React Aria<br>Mangrove | MUI<br>Mangrove | IBM Carbon<br>Mangrove | Mantine<br>Mangrove | Ant Design<br>Mangrove |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Leakage | clean | clean | clean | clean | clean | clean | clean | **FAILED** | clean | clean |
| axe violations | 0 | 1 | 2 | 0 | 1 | 0 | 1 | 1 | 0 | 1 |
| axe critical | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| axe serious | 0 | 1 | 2 | 0 | 1 | 0 | 1 | 1 | 0 | 1 |
| axe incomplete | 1 | 4 | 2 | 1 | 1 | 1 | 4 | 2 | 0 | 1 |
| RTL | clean | clean | clean | clean | clean | clean | clean | clean | clean | clean |
| Long labels | clean | clean | clean | clean | clean | clean | clean | clean | clean | clean |
| Blockers | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

## Requirement matrix

`N` native · `C` composed · `X` custom · **`U`** unsupported · `·` not started

| | Adobe React Aria<br>Delta | MUI<br>Delta | IBM Carbon<br>Delta | Mantine<br>Delta | Ant Design<br>Delta | Adobe React Aria<br>Mangrove | MUI<br>Mangrove | IBM Carbon<br>Mangrove | Mantine<br>Mangrove | Ant Design<br>Mangrove |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `buttons` | N | N | N | N | N | N | N | N | N | N |
| `links` | N | N | N | N | N | N | N | N | N | N |
| `text-input` | N | N | N | N | N | N | N | N | N | N |
| `validation-states` | N | C | C | C | N | N | C | C | C | N |
| `disabled-states` | N | N | N | N | N | N | N | N | N | N |
| `select-small` | N | N | N | N | N | N | N | N | N | N |
| `select-medium` | N | N | N | N | N | N | N | N | N | N |
| `select-large` | N | N | N | N | N | N | N | N | N | N |
| `multiselect` | C | N | C | N | N | C | N | C | N | N |
| `combobox-searchable` | N | N | C | N | N | N | N | N | N | N |
| `date-picker` | N | N | N | N | N | N | N | N | N | N |
| `datetime-range-picker` | N | C | C | N | N | N | C | C | N | N |
| `modal` | N | N | N | N | N | N | N | N | N | N |
| `tooltip` | N | N | N | N | N | N | N | N | N | N |
| `popover` | N | N | N | N | N | N | N | C | N | N |
| `accordion` | N | N | N | N | N | N | N | N | N | N |
| `cards` | X | N | N | N | N | X | N | N | N | N |
| `left-nav` | N | N | C | N | N | N | N | N | N | N |
| `table-render` | N | N | C | C | N | N | N | N | C | N |
| `table-sort` | C | N | N | X | N | C | N | N | C | N |
| `table-multiselect` | C | N | N | X | N | C | N | N | C | N |
| `table-filter` | C | N | N | C | N | C | N | N | C | N |
| `table-paginate` | X | N | C | C | N | X | N | C | C | N |
| `table-column-resize-or-reorder` | N | N | X | X | X | N | N | X | X | X |
| `table-states` | C | N | C | C | N | C | N | C | C | N |
| `form-states` | C | N | N | N | N | C | N | C | C | N |
| `locale-switcher` | N | N | N | N | N | N | N | N | N | N |
| `rtl` | N | C | N | C | N | N | C | C | C | N |
| `long-labels` | C | N | C | N | N | N | N | C | N | N |
| `side-by-side` | C | C | C | C | C | C | C | C | C | C |

## Unsupported requirements

None. Every requirement was met natively, by composition, or with custom code.

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

- CORRECTED. This entry previously recorded axe `aria-valid-attr-value` as 1 CRITICAL on #form-required and #form-format, and stated that it "cannot be fixed from the consuming side". The second half was wrong, and the mangrove-carbon pairing had already disproved it against the same @carbon/react version: passing an explicit `aria-describedby="${id}-error-msg"` gives axe the announcement technique it is looking for, and the violation goes to 0. The count above is now 0 critical / 2 serious. THE UNDERLYING CARBON GAP IS STILL REAL and still needs an upstream issue: on an invalid field Carbon sets `aria-errormessage` pointing at a `.cds--form-requirement` div that carries no role=alert, no aria-live and no aria-describedby, Carbon exposes no prop for it, and the workaround only works because `...rest` is spread last in `sharedTextInputProps` and because the caller knows the id is derived as `${id}-error-msg`. Both are internals. Every invalid Carbon input in every Carbon application needs the same three-word patch. Still needs confirmation against a real screen reader.
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

### delta-antd

- THE CENTRAL QUESTION for this candidate, and it is a design decision rather than a defect. StyleProvider layer makes antd lose every conflict with unlayered host CSS. On Delta that is invisible, because Tailwind 4 is itself layered. On Mangrove it means antd's inputs render as MANGROVE's inputs - 2px #1a1a1a, 46px, square, Roboto - with zero host-repair CSS, where MUI needed 27 lines to fight the same rules. If UNDRR wants the Mangrove look and feel to win by default, this is the best mechanism found anywhere in this evaluation. If UNDRR wants the token mapping to be authoritative, it is a problem. See mangrove-antd.
- antd is themed at bundle time, so a Mangrove token change requires rebuilding every consuming site. cssVar mode would fix that but breaks containment as configured here. Whether that trade can be reopened depends on whether :root-level antd custom properties are acceptable once Mangrove 2.0 ships its own.
- The aria-hidden-focus defect on .ant-table-measure-row is upstream and unfixable through the public API without giving up scroll.x or row selection. It should be reported to antd.
- antd's derived greys failed contrast in four places. They were pinned, but the same derivation will apply to any component whose colour is not explicitly set, so a real deployment needs an audit rather than trusting the seed tokens.
- Typography.Link does not underline by default, which is a WCAG 1.4.1 question for inline links in body text. Not fixed here because the same question applies to Mangrove's own link styling and the two should be settled together.
- Column resize is ours, so it is ours to maintain: 95 lines including RTL direction handling and keyboard support. Mantine has the same gap. React Aria, MUI and Carbon do not.
- demo-state.ts is byte-identical to the copy in integration-mui. It is candidate-independent as well as host-independent and belongs in the scaffold, but packages/ is import-only for demo runs so it was left duplicated rather than churning six other apps.

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

### mangrove-carbon

- THE LEAKAGE FAILURE NEEDS A DECISION, NOT A FIX. Carbon as documented restyles the host: 54 computed-property changes across 11 of 14 canaries. The scoped-CSS experiment (?carbonCss=scoped) reduces that to 0, but it depends on Sass's deprecated nested @import, requires a hand-copied block of Carbon's layout tokens, and would need maintaining across Carbon upgrades. The three options are (a) accept that Carbon owns page-level typography and reset, and retire Mangrove's, (b) carry the scoped build and its maintenance cost, (c) do not adopt Carbon on Mangrove pages. This is an architecture decision for UNDRR.
- IBM TELEMETRY. 21 packages in this tree run `postinstall: ibmtelemetry --config=telemetry.yml`, POSTing to https://www-api.ibm.com/ibm-telemetry/v1/metrics: 12 @carbon/* packages plus 9 @ibm/plex* font packages. @carbon/react's config enables jsx, npm and js collectors with an allow-list of 829 entries of component and prop names. It runs at install time, so it fires in CI and on every developer machine, and it is ON by default; the opt-out is IBM_TELEMETRY_DISABLED=true. No other candidate in this evaluation installs anything comparable. For a UN body this is a data-governance and procurement question, and if Carbon is adopted the variable should be set in CI and documented for contributors.
- axe `aria-valid-attr-value` was a CRITICAL violation on all three invalid TextInputs before being worked around: Carbon points aria-errormessage at a .cds--form-requirement element that has no role=alert, no aria-live and is not in aria-describedby. The workaround duplicates the reference through aria-describedby and depends on Carbon's internal id convention. It should be fixed upstream, and until it is, every Carbon consumer using invalid fields has this violation unless they know the trick.
- axe `color-contrast` (1 serious): the helper text on the disabled TextInput and disabled Select. Carbon applies its disabled text colour to the associated helper text, and the neutral token palette's --undrr-color-text-disabled (#8b9aa5) is roughly 2.8:1 on white. Disabled controls are exempt from WCAG 1.4.3 but helper text is not itself a disabled control, so this needs a ruling. Tokens are import-only so it could not be fixed here. The delta-mui run reported the identical finding.
- axe reported 2 incomplete rules it could not decide: aria-valid-attr-value and color-contrast. Both need a human look.
- axe `scrollable-region-focusable` (serious, 390px only) on Carbon's .cds--data-table-content. Caused by the overflow-x rule that stops a 250-row German table scrolling the document. Carbon renders that div internally with no way to add tabindex, so the choice is a keyboard-inaccessible scroll region or a horizontally scrolling document. Needs a design decision.
- The Mangrove host's own `link-in-text-block` serious violation DISAPPEARS in the default build and returns in the scoped build. Carbon's global `a { color: #0062fe }` reaches the host's canary paragraph and changes the link/text contrast enough for axe to stop firing. Nobody should take comfort from that number: the leakage masked a host accessibility failure rather than fixing anything. Whole-page counts are 1 violation with Carbon global and 3 with Carbon contained.
- The 400-option Dropdown renders all 400 DOM nodes. Carbon has no virtualisation for any of its list boxes and no opt-in equivalent to React Aria's Virtualizer, so this is not a configuration choice. Whether it is acceptable at that size is a performance decision not taken here.
- Keyboard and screen-reader testing by a human. axe is static analysis and cannot confirm that the composed date-time range is usable: four separate fields, no single accessible name for the range as a concept, and the times outside the calendar popover. The custom column reorder also needs screen-reader verification — Ctrl+Shift+Arrow is asserted to work but is not announced.
- Carbon's DatePicker is a React shell over flatpickr's imperative API and is not a controlled component. The `value` array identity problem documented under datetime-range-picker is a trap any team will hit; whether that is acceptable in a form-heavy application is worth deciding before adoption. flatpickr is also pinned to an exact version by Carbon, so a security fix in it waits on a Carbon release.
- The scoped-CSS build depends on Mangrove for `box-sizing`. Carbon's `html { box-sizing: border-box }` becomes `.demo html` under nesting and never matches, so Carbon's `* { box-sizing: inherit }` inherits from whatever the host set. Mangrove happens to declare `*, ::after, ::before { box-sizing: border-box }`, so it works — measured, border-box everywhere in both builds. That is the mirror image of the delta-carbon run being rescued by Tailwind Preflight, and it means the scoped build is not self-sufficient: on a host with no global box-sizing rule it would break.

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

### mangrove-antd

- THE CENTRAL QUESTION, and it is a design decision rather than a defect. On this host antd's controls render as MANGROVE's controls, because antd's styles are layered and Mangrove's are not. It cost zero lines of repair CSS, where mangrove-mui needed 27 lines to achieve the opposite. If UNDRR wants Mangrove's look and feel to win by default across many sites, this is the best mechanism found anywhere in this evaluation - it is a single prop, it needs no per-component work, and it cannot drift. If UNDRR wants the UNDRR token mapping to be authoritative over the host, it is a problem, because controlHeight and borderRadius do not reach any control Mangrove styles by element. The choice is reversible per-site by dropping `layer`, which is why it belongs to UNDRR rather than to this evaluation.
- Because the host wins, the two antd pairings do NOT look alike, and that is expected rather than a bug. Compare apps/delta-antd/screenshots with apps/mangrove-antd/screenshots at the same viewport to see what `layer` does. Any conclusion drawn from one host's screenshots does not transfer to the other.
- If Mangrove 2.0 adopts cascade layers, this behaviour inverts and antd would start winning conflicts against the host. That should be checked against the 2.0 branch before either decision is locked in. Tracked in issue #4.
- antd is themed at bundle time, so a Mangrove token change requires rebuilding every consuming site. cssVar mode would fix that but breaks containment as configured here. Whether that trade can be reopened depends on whether :root-level antd custom properties are acceptable once Mangrove 2.0 ships its own.
- The aria-hidden-focus defect on .ant-table-measure-row is upstream and unfixable through the public API without giving up scroll.x or row selection. It should be reported to antd.
- antd's derived greys failed contrast in four places. They were pinned, but the same derivation will apply to any component whose colour is not explicitly set, so a real deployment needs an audit rather than trusting the seed tokens.
- Typography.Link does not underline by default, which is a WCAG 1.4.1 question for inline links in body text. Not fixed here because the same question applies to Mangrove's own link styling and the two should be settled together.
- Column resize is ours, so it is ours to maintain: 95 lines including RTL direction handling and keyboard support. Mantine has the same gap. React Aria, MUI and Carbon do not.
- demo-state.ts is byte-identical to the copy in integration-mui. It is candidate-independent as well as host-independent and belongs in the scaffold, but packages/ is import-only for demo runs so it was left duplicated rather than churning six other apps.
