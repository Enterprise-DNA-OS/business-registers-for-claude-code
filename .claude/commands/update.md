---
description: "Change --record with --title, --owner, --due, --retain-until or --values (JSON merge)."
---

# update

Change --record with --title, --owner, --due, --retain-until or --values (JSON merge).

Read relevant records before changing them. Include --actor for writes. Never invent a missing value or choose between ambiguous names.

Run from the project root, replacing the example values with the operator's brief:

```bash
npm run registers -- update --record="Name or id" --owner="New owner" --actor="Operator"
```

Use --json when exact values are needed. Report the result and any unresolved records. A failed command exits nonzero; do not describe it as saved. Drafts stay local. See CLAUDE.md for the shared operating rules.
