# DSH upstream integration validation

Run checks from the repository root. Report only checks actually executed.

## Baseline

For any committed code integration:

```bash
git diff --check
npm run typecheck
npm run build
npm test
```

Run targeted tests first while resolving a specific behavior, then the full
suite before handoff. If dependencies or patches changed, run `npm ci` and
confirm the complete `postinstall` succeeds before the baseline.

Pure documentation-only changes need diff, link, and command verification, not
application startup.

## Risk routing

| Affected area | Additional evidence |
| --- | --- |
| Harness entry, loader, Profile projection, generation, dependency closure | Relevant behavior tests including `harness-node-entry`, `plugin-startup-failure`, `safe-mode-host-resolved`, `safe-mode-runtime`, and `desktop-plugin-closure` where present and affected |
| Client module graph or bootstrap | Authenticated HTML, bootstrap response and execution/registration, module-system creation, and actual UI mount; a script tag or HTTP 200 alone is insufficient |
| Patch files or host plugins | Clean patch replay/install, actual package loading, unload/reload where applicable, and missing optional plugin behavior |
| IPC, permissions, or privileged file/process behavior | Valid and rejected inputs plus the corresponding real Electron flow |
| Profile, plugin, migration, or generation state | Temporary Profile, interruption/failure recovery, idempotent retry, and preservation of previous user state |
| UI behavior | Relevant language, light/dark theme, narrow window, and interaction states |
| Windows path, process, installer, junction, or native behavior | Windows validation; macOS success does not substitute |
| Release behavior | Target-native package and release-runbook checks without bypassing `verify-target` |

## Handoff

List validation by stage and call out anything not exercised: real Harness
subprocess, packaged resources, installed application, macOS, Windows, signed
installer, or release publication.
