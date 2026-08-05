# Git hooks

These hooks live in the repo so they are versioned and reviewable. Git does not
enable them automatically on clone — each contributor runs this once:

```sh
git config core.hooksPath .githooks
```

## `commit-msg`

Rejects a commit unless its message satisfies all of the following.

| Rule | Detail |
| --- | --- |
| No AI attribution | `Co-Authored-By:` trailers naming an AI agent, and `Generated with [...]` style lines, are rejected. Human co-authors are fine. |
| Subject length | 72 characters or fewer. |
| Subject encoding | ASCII only. No emoji, em dashes, smart quotes, or accented characters. |
| Conventional Commits | `type(optional-scope)!: description` |

Allowed types: `build` `chore` `ci` `docs` `feat` `fix` `perf` `refactor`
`revert` `style` `test`

Git's own `Merge ...` and `Revert "..."` subjects are exempt from the
Conventional Commits check only; length and encoding rules still apply.

Examples that pass:

```
feat(tokens): add mangrove colour scale
fix(charts): correct axis label overlap
refactor(tokens)!: drop legacy colour names
```
