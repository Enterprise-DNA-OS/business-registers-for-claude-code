---
description: "List records, optionally --register, --status or --owner."
---

# records

List records, optionally --register, --status or --owner.

Read relevant records before changing them. Include --actor for writes. Never invent a missing value or choose between ambiguous names.

Run from the project root, replacing the example values with the operator's brief:

```bash
npm run registers -- records [--register="Name"] [--status=active] [--owner="Name"]
```

Use --json when exact values are needed. Report the result and any unresolved records. A failed command exits nonzero; do not describe it as saved. Drafts stay local. See CLAUDE.md for the shared operating rules.
