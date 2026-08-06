# @undrr-eval/known-issues

The box at the top of every demo page listing that pairing's measured problems.

## Why it exists

A demo page looks fine in a screenshot. "MUI cannot do right-to-left in the
Community tier" and "Ant Design loses every style conflict to Mangrove" do not
show up unless you already know to look. Someone clicking through ten demos to
form a view should not have to open ten `EVIDENCE.md` files to find the
limitations.

## How to add an issue

Add an entry to `src/issues.ts`. Every field is required and the tests enforce
most of them.

```ts
{
  id: "antd-measure-row-aria",
  severity: "caveat",          // blocker | decision | caveat | info
  candidates: ["antd"],        // ids, or ["*"] for all
  hosts: ["*"],                // "delta" | "mangrove", or ["*"]
  owner: "candidate",          // candidate | host | pairing | this evaluation
  title: "...",
  detail: "...",               // specific and measured, over 120 characters
  links: [{ label: "axe result", href: "..." }],
}
```

Two rules that matter more than the schema:

1. **Every entry must be traceable.** `links` has to point at the file that
   measured it, and any figure in `detail` must match what that file records.
   This box is the most prominent text on the page, so it has to be the most
   reliable. Do not add something that has only been reasoned about.
2. **`severity: "decision"` means a trade-off for UNDRR, not a defect.** The Ant
   Design cascade-layer behaviour is the clearest example: it is either exactly
   what UNDRR wants or exactly what it does not, and this evaluation should not
   pretend to know which.

## Scoping

`issuesFor(candidate, host)` resolves the wildcards and sorts worst-first. It is
pure and unit-tested, because the failure that matters is not a crash - it is
showing a reader the wrong pairing's issues, which looks fine on screen. The
tests specifically pin that MUI's RTL blocker never appears on another candidate
and that host-scoped issues stay on their host.

## Rendering

Each app renders `<KnownIssues candidate=... host=... candidateName=... />` as the
first child of its `HostShell`, which means:

- **Outside the candidate wrapper.** No candidate stylesheet restyles the box, so
  it reads identically on all ten demos rather than becoming another thing being
  compared.
- **In both candidate states.** It is present in the `?candidate=off` leakage
  baseline as well as the normal render, so it cannot itself register as a
  leakage difference.
- **Inside `[data-candidate-root]`,** so it is included in the scoped axe run. It
  is written to pass one: real heading, real list, labelled links, underlined
  rather than colour-only, and colours from tokens that already meet contrast.

It carries `TOKEN_SCOPE_CLASS` itself. That is not decoration: the UNDRR tokens
are declared on `.undrr-tokens` rather than `:root` so the leakage assertion stays
honest, and the first version of this component rendered with a transparent
background and Mangrove's `#1a1a1a` border because it sat outside that scope and
every `var(--undrr-*)` was invalid. The same mistake portalled overlays caused in
three earlier pairings.

The box is a `<details>` collapsed by default, so it informs without pushing the
demo below the fold.

## Not published as a package

Import only, like the rest of `packages/`. It is part of the evaluation
scaffold, not a deliverable.
