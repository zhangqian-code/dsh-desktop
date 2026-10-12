---
name: dsh-upstream-sync
description: Assess and integrate dataelement/dsh-desktop upstream changes into this downstream fork. Use for upstream checks, sync branches, merge-conflict resolution, or reports about divergence from upstream; do not use for ordinary feature-branch updates.
---

# DSH upstream sync

Keep `origin` pointed at the downstream fork and `upstream` pointed at
`dataelement/dsh-desktop`. Treat upstream integration as a compatibility
exercise, not a mechanical Git merge.

## Choose the mode

- Use **check** mode for scheduled or read-only assessment. Fetch remote refs,
  report divergence and risk, and leave the working tree, branches, commits,
  and remote repositories unchanged.
- Use **integrate** mode only when the user asks to perform the sync. Work on a
  dedicated `sync/upstream-YYYYMMDD-<short-sha>` branch or isolated worktree.

If the requested mode is unclear, default to check mode.

## Shared preflight

1. Read the applicable `AGENTS.md` files and inspect `git status`, current
   branch, ongoing Git operations, remotes, and their URLs.
2. Stop mutation if the worktree is dirty, a merge/rebase/cherry-pick is in
   progress, `origin` and `upstream` are ambiguous, or either target ref is
   missing. Preserve the evidence and explain the exact blocker.
3. Fetch `origin` and `upstream` with tags and pruning. On connection timeout or
   direct-connect failure, retry that command once with
   `http://127.0.0.1:7890`; do not change global proxy settings.
4. Run `node .agents/skills/dsh-upstream-sync/scripts/preflight.mjs` from the
   repository root and use its structured result as the baseline.

## Check mode

Do not checkout, merge, rebase, commit, push, open a pull request, or edit
project files. Report:

- downstream and upstream SHAs plus ahead/behind counts;
- upstream commits not yet integrated;
- overlapping paths and risk groups;
- likely validation work and any condition requiring human judgment.

When an automation invokes check mode, stay quiet if the refs are identical.

## Integrate mode

Before resolving conflicts, read
[references/conflict-policy.md](references/conflict-policy.md). Then:

1. Start from the current downstream integration branch after confirming it is
   synchronized with its `origin` tracking branch.
2. Create the dedicated sync branch/worktree. Never integrate directly on
   `main`.
3. Run `git merge --no-ff --no-commit upstream/main` so a clean merge can still
   be reviewed before committing.
4. Resolve each conflict from the upstream and downstream intent. Never apply a
   repository-wide `ours` or `theirs` strategy. Preserve unrelated downstream
   work and the innermost diagnostics required by project rules.
5. Read [references/validation-matrix.md](references/validation-matrix.md) and
   run checks proportional to the affected areas. A successful textual merge
   is not successful integration.
6. Commit only after conflict markers are absent and required checks pass.
   Pushing, opening a pull request, or merging to `main` requires the user's
   explicit request for that external action.

## Output contract

Always distinguish: fetched, merged locally, conflicts resolved, tests passed,
pushed, pull request opened, and merged. Include upstream SHA, sync branch,
conflicted paths, resolution decisions, checks actually run, and unverified
platform or installed-build behavior.
