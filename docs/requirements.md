# Requirements contract

The canonical requirement IDs for `evidence.json`, and the rules for how each
`status` is assigned.

Eight runs classifying the same outcome differently would make the comparison
worthless — one agent's `composed` is another's `custom` unless the boundary is
written down. Use these IDs verbatim. Every one gets an entry, even if the
answer is "trivial".

## Status values

| Status | Means |
| --- | --- |
| `native` | A single documented component from the candidate library does it. |
| `composed` | Built from documented library primitives, wired together by you. |
| `custom` | You wrote behaviour the library does not provide. |
| `unsupported` | Not reachable without a paid tier or a package outside the candidate's ecosystem. |

The line between `composed` and `custom` is **behaviour**, not code volume.
Wiring two library components together and computing a derived value from their
outputs is `composed`. Implementing keyboard navigation, focus management or
overlay positioning the library does not offer is `custom`.

Record `customLinesOfCode` for anything above `native`, counting only lines you
wrote — not library code, not fixture imports.

## Requirement IDs

### Section 1 — Forms and actions

| ID | What must work |
| --- | --- |
| `buttons` | Primary, secondary and disabled variants |
| `links` | Inline links inside body text |
| `text-input` | Labelled text input with hint text |
| `validation-states` | All four `VALIDATION_CASES`, including `server-rejected` |
| `disabled-states` | Disabled input, select and button |

### Section 2 — Selection

| ID | What must work |
| --- | --- |
| `select-small` | Single select, 8 options |
| `select-medium` | Single select, 40 options |
| `select-large` | Single select, 400 options |
| `multiselect` | Multiple selection with removable chips or equivalent |
| `combobox-searchable` | Type-to-filter, at all three sizes |

### Section 3 — Dates

| ID | What must work |
| --- | --- |
| `date-picker` | Single date, calendar and keyboard entry |
| `datetime-range-picker` | A start and an end, each with date and time |

**`datetime-range-picker` is the one requirement with a prescribed fallback.**
See the next section — read it before assigning a status.

### Section 4 — Overlays

| ID | What must work |
| --- | --- |
| `modal` | Focus trap, restore on close, Escape to dismiss |
| `tooltip` | Hover and keyboard focus triggered |
| `popover` | Click triggered, dismiss on outside click |
| `accordion` | Expand and collapse, correct ARIA |

### Section 5 — Host-matched chrome

| ID | What must work |
| --- | --- |
| `cards` | Styled to match the host's own cards |
| `left-nav` | Styled to match the host's own navigation |

### Section 6 — Data table

| ID | What must work |
| --- | --- |
| `table-render` | All 250 rows, every column type formatted correctly |
| `table-sort` | Sortable on at least one column of each type |
| `table-multiselect` | Row selection with a select-all |
| `table-filter` | Filter on at least one column |
| `table-paginate` | Pagination with a page-size control |
| `table-column-resize-or-reorder` | Either resize **or** reorder; one is enough |

### Section 7 — States

| ID | What must work |
| --- | --- |
| `table-states` | Loading, empty, error and success for the table |
| `form-states` | Loading, empty, error and success for one form |

### Section 8 — Locale

| ID | What must work |
| --- | --- |
| `locale-switcher` | Cycles en, fr, de, ar |
| `rtl` | Arabic applies RTL, including component internals |
| `long-labels` | The five 60+ character labels do not break layout |

### Section 9 — Comparison

| ID | What must work |
| --- | --- |
| `side-by-side` | Host and candidate rendering of a button, table, card and nav list |

---

## The `datetime-range-picker` fallback

**A composed two-picker implementation is the expected answer, not a failure.**

No paid tier may be used. Where a candidate's only native date-time *range*
component sits behind a commercial licence — this is the case for MUI, whose
range pickers live in `@mui/x-date-pickers-pro` — do not stop and do not
substitute a third-party package. Instead:

1. Render **two separate date-time pickers** from the candidate's free tier: a
   start and an end, each with date and time granularity.
2. Compute the range in application code: derive the duration, and validate that
   end is not before start.
3. Surface an invalid range using the same validation treatment as
   `VALIDATION_CASES`.

Assign `status: "composed"`, and use `notes` to say what a native range picker
would have given you that the two-picker version does not. Be specific — this
is the substance of the finding. Typical gaps:

- No single calendar showing both endpoints with the intervening days highlighted
- No drag-to-select across a range
- Nothing stopping the user picking an end before a start until validation runs
- Two separate popovers to keyboard through instead of one
- Two focus traps to manage, and no shared "now editing the end" state

Record the wiring in `customLinesOfCode` and any wrapper in `wrappers`.

**This supersedes the earlier reading that MUI would return `unsupported` here.**
`unsupported` is now reserved for a requirement that cannot be met *at all*
within the free tier — not one that can be met by composing free-tier parts at a
cost in fidelity and effort. That cost is precisely what the evaluation is
trying to measure, so it must be recorded rather than avoided.

Candidates with a native date-time range component should use it and record
`native`. The comparison is then meaningful: it shows what UNDRR gives up by
choosing a library whose range picker is paid.

---

## Known host baseline axe violations

The host shells are not axe-clean, and that is not your fault. Measured against
the scaffold preview, which contains no component library at all:

| Host | Violations | Detail |
| --- | --- | --- |
| Delta | 0 | — |
| Mangrove | 1 serious | `link-in-text-block` on `.mg-link` |

`link-in-text-block` is WCAG 1.4.1: links in a block of text must be
distinguishable by something other than colour. Mangrove 1.8.1 renders inline
links in blue with no underline, so the rule fails on the host's own canary
paragraph. **This is a real finding about Mangrove, not about any candidate.**

When reporting `axe` counts in `evidence.json`:

- Run axe over the whole page **and** scoped to the candidate subtree, using the
  harness's `include` option:
  `runAxe(page, { section, include: "[data-candidate-root]" })`.
- Put the **scoped** counts in `evidence.json.axe`, so your numbers describe the
  candidate rather than the host.
- Record the whole-page counts in `EVIDENCE.md` and note which violations were
  inherited from the host baseline above.

A Mangrove demo reporting 1 serious violation it did not cause would otherwise
look worse than its Delta twin for no reason.

## Mangrove 2.0 theming

`host-mangrove` loads Mangrove 1.8.1, whose theming is entirely Sass
compile-time — the compiled stylesheet declares no CSS custom properties, so
tokens cannot be reached at runtime.

Mangrove 2.0 changes this and is coming, but is unlanded. Its token API is
available for theming work:

```
import "@undrr-eval/host-mangrove/mangrove-2-preview.css";
```

If you use it, note these in `theming.method` and `theming.escapeHatchesUsed`:

- **Colours are space-separated RGB channels**, not colour values. Consume as
  `rgb(var(--mg-color-interactive))`, or `rgb(var(--mg-color-interactive) / 0.1)`
  for alpha. Assigning a raw token to a library's colour property produces an
  invalid value that fails silently — if a candidate's theming API only accepts
  a colour string, this is a real integration cost and should be recorded.
- **Ten colour tokens are hex or named colours, not channels**, so the pattern
  above does not work for them. They are listed in `MANGROVE_2_PREVIEW`.
- **Font size, font family and breakpoints stay SCSS-only** in 2.0. They have no
  custom property equivalent, so they count toward `tokensUnreachable`
  regardless of which Mangrove version is loaded.

Record theming depth against `packages/undrr-tokens` as the brief requires. The
Mangrove 2.0 tokens are a second, optional measurement — if you take it, say so
explicitly in `EVIDENCE.md` so the numbers are not confused.
