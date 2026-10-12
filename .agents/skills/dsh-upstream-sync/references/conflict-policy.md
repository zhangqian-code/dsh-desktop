# DSH upstream conflict policy

Use this policy only while integrating `upstream/main` into the downstream
fork. Read the relevant directory `AGENTS.md` before editing a conflicted path.

## Resolve by authority and intent

- Compare the merge base, downstream side, upstream side, surrounding code,
  tests, and originating commits. Conflict markers alone are insufficient.
- Keep downstream product behavior only when it remains compatible with the
  new upstream contract. Prefer a new upstream extension point over retaining
  an obsolete patch.
- Do not hide failures with broad catches, disabled checks, widened exclusions,
  or changes that discard original error causes.
- Record non-obvious resolutions in the sync report and update
  `docs/downstream-customizations.md` when a customization changes ownership,
  compatibility range, or removal condition.

## Path-specific rules

### Dependency manifests and lockfile

Resolve `package.json` semantics first. Preserve exact runtime compatibility
requirements and the repository's npm/package-lock workflow. Regenerate or
validate `package-lock.json` from the resolved manifest instead of accepting a
textually clean but inconsistent lockfile. Confirm `postinstall` completes and
all `patch-package` patches apply.

### `patches/`

Read `docs/patch-plugin-contract.md` and `patches/AGENTS.md`. Rebase each patch
against the exact upgraded package contents. If upstream now supplies the
equivalent fix or seam, remove the downstream patch and verify there is no
duplicate injection or behavior. Never edit only hunk offsets to force a patch
to apply without checking runtime intent.

### `packages/`

Preserve host singleton resolution, plugin isolation, lifecycle cleanup,
locale/theme contracts, and the distinction between source and generated
artifacts. Prefer a host plugin or supported slot over expanding a third-party
patch.

### `src/main/`, `src/preload/`, and `src/shared/`

Preserve Electron process boundaries, narrow IPC, serializable contracts,
sender validation, recoverable user-data changes, and the prohibition on Node
or Electron privileges in shared code. Re-evaluate cleanup and failure paths
when upstream changes process or window lifecycle behavior.

### Loader, Profile, generation, and Safe Mode

Treat Profile composition, backend load, client discovery, HTML bootstrap, and
client activation as separate stages. Normal Profile and Safe Mode resolution
rules are deliberately different. Preserve the actual package name, parent
module, resolution stage, and original cause in failures.

### Generated and distributed artifacts

Find the authoritative source and regenerate derived bundles, previews,
archives, and manifests. Do not manually merge generated output or delete
third-party distribution archives and lockfiles to make the tree clean.

### Delete/modify and rename conflicts

Determine whether upstream removed or replaced the capability. Do not restore a
downstream file merely because it existed before, and do not accept upstream
deletion merely because Git labels it as the other side.
