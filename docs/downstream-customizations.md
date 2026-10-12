# Downstream customization ledger

This document records behavior intentionally maintained by the downstream fork
of `dataelement/dsh-desktop`. Update it when a customization is introduced,
substantially changed during upstream integration, or removed because upstream
now provides an equivalent capability.

The downstream history started from upstream commit `115a0b4`. Add one row per
downstream customization as development continues.

| Customization | Owner / location | Upstream coupling | Required validation | Removal or upstreaming condition |
| --- | --- | --- | --- | --- |
| Upstream synchronization workflow | `.agents/skills/dsh-upstream-sync/`, this ledger | Uses the `origin`/`upstream` remote convention; no product runtime coupling | Skill structure validation, preflight script execution, `git diff --check` | Remove or migrate when the repository adopts an equivalent centrally maintained workflow |
