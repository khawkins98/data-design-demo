# Case study — what the wizard actually measured

Supporting evidence for [Architecture options](./architecture-options.md). This
detail is retained because it demonstrates a maintenance and ownership cost; it
does not determine the architecture recommendation by itself.

One screen, built five times, and the result inverts the question. **Four
candidates ship a stepper. None of them marks the current step in the
accessibility tree.** All five demos hand-write `aria-current="step"` — the four
with a real component to use included.

| Candidate | Stepper? | What it emits for "current" | Hand-written style |
| --- | --- | --- | --- |
| Mantine | `Stepper` | `data-progress="true"` — a data attribute | **0 rules** |
| Ant Design | `Steps` | a CSS class; a disabled step gets no role at all | 1 rule |
| IBM Carbon | `ProgressIndicator` | hidden English text "Current", folded into the accessible name | 14 rules |
| MUI | `Stepper` | `aria-selected` — the *wrong* state, see below | 0 rules, 2 `sx` repairs |
| React Aria | **none** | nothing to emit; the component is yours | **26 rules, 221 lines** |

Counts are every hand-written CSS rule for the whole wizard, review cards
included, so they compare like with like. Three of Carbon's fourteen reach into
`.cds--` internals rather than its theming API, which is the more expensive kind.
MUI writes no stylesheet at all — it uses `sx` throughout, as that demo does
everywhere — so its number is the two `sx` blocks that exist to *repair* the
component, not the twelve doing ordinary layout.

**MUI does not merely omit it — it asserts something false.** `Stepper` sniffs its
children, finds `StepButton`, and silently switches into tab-list mode:
`role="tablist"` on the root, `role="tab"` + `aria-selected` +
`aria-posinset`/`aria-setsize` on each step, and `role="presentation"` on the list
items. There is no opt-out prop. A tab set tells a screen-reader user the panels
are peers they may visit in any order, in a form that gates them. Six attributes
are overridden by hand — and only because both components spread `...other` after
their own `role`, which is an accident of implementation, not an extension point.
The roving tab index installed by the same flag cannot be removed at all.

**And this is a position, not a bug — one MUI argued itself into.** v5 through v7
emitted `aria-current="step"`, the value this document calls correct. PR
[#47687](https://github.com/mui/material-ui/pull/47687), merged 12 March 2026 and
shipped in v9.0.0, replaced it; the
[v9 migration guide](https://mui.com/material-ui/migration/upgrade-to-v9/) lists
*"the `aria-current` changed to `aria-selected`"* among a set of accessibility
improvements, and the change does fix two real complaints that the stepper
announced too little.

The part worth reading is the thread. On issue
[#43689](https://github.com/mui/material-ui/issues/43689), 27 January 2026, a MUI
maintainer asked of the proposal:

> Wouldn't it be a bit odd if Stepper provides all the `tab` roles except
> `tabpanel`?

The PR's own author agreed the same day:

> I'm currently hesitant in turning the stepper into a tab list. I think the
> ordered list markup, combined with the `aria-current` and step buttons pointing
> to the content area is enough.

**That is the last human comment on the thread.** Two weeks later a commit titled
`refactor as tablist` landed; the issue was closed by a bot on merge. A second
reviewer raised the same doubt inside the PR — *"Since this isn't a tablist, I'm
not sure"* — and got an answer about keyboard mechanics, not about the role. No
public rationale for the reversal exists in the PR, the issue, the commit
messages or any RFC.

So the objection in this document is not an outside opinion MUI has never heard.
It is MUI's own, raised twice, conceded once, and then shipped past without being
answered.

**Nobody outside MUI has filed against it, and there is a reason.** Four months
after release, v9 is **11.4% of `@mui/material` installs**; v5 — which emits
`aria-current="step"` — is still 40%. MUI's screen-reader/browser test matrix was
drafted a month *after* v9.0.0 and does not include Stepper. And their axe CI
asserts on two rules only (`color-contrast`, `link-in-text-block`), which would
not catch this even if it asserted on everything: `ol[role=tablist] >
li[role=presentation] > button[role=tab]` is a structurally valid tab list. Read
the silence as *nobody has pointed a screen reader at a v9 gated wizard yet* — not
as review and approval.

**How much this actually matters, stated conservatively.** It is **not** a WCAG
2.1 AA failure — a structurally valid tab list satisfies 4.1.2, and no
conformance audit would flag it. Nor is it novel: **Angular Material has treated
its stepper as a tab list for roughly nine years**, documented and uncontested,
which is a fair argument that the wider accessibility community does not regard
this as serious.

The measurable harm is narrower and more concrete than the role argument.
Per [a11ysupport.io](https://a11ysupport.io/tech/aria/aria-selected_attribute),
`aria-selected="true"` is **not conveyed by NVDA on either browser, nor by
VoiceOver on macOS or iOS** — only JAWS announces it — whereas
[`aria-current="step"`](https://a11ysupport.io/tech/aria/aria-current_attribute)
is supported by all five combinations. So for most screen-reader users the change
means the current step is no longer announced at all. That is a comprehension
regression against v7, not a barrier: the form still works, and the step count is
still visible.

So: **a note to be aware of, not a reason to strike MUI off.** What it does tell
you is a maintenance fact rather than a compliance one — the correction is
permanent, it recurs in every wizard on the estate, and the people best placed to
remove the need for it already raised the objection and shipped past it.

**So what a shipped stepper saves is the CSS, not the semantics.** That is the
sentence to carry into the decision, because it is the opposite of the intuition,
and because the accessibility layer is the part Mangrove ends up owning under
*every* candidate. Under shape C you own it deliberately, once. Under A and B you
own it too — scattered across five component wrappers, while believing the library
handled it.

Two further library-owned defects, both consistent with what the rest of this
evaluation already found: MUI's step connector is positioned with physical
`left`/`right` and in Arabic leaves one gap with no line while hanging another 94px
off the page; and Carbon truncates step names by design, so German renders
"Zusätzliche Ein…", with a hover tooltip as the documented remedy that a touch user
cannot reach. Both are in the known-issues registry with measurements.

**None of these moved a composite,** and that is worth stating plainly rather than
leaving to inference. The scores are derived from axis bands; the registry only
feeds the blocker column, and all six of these are caveats. They change what a
reader knows without changing what the ranking says.
