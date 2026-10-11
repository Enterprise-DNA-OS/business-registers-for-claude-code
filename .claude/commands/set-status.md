---
description: "Set --record --status=open|active|waiting|done|archived; done checks dependencies and fields."
---

# set-status

Set --record --status=open|active|waiting|done|archived; done checks dependencies and fields.

Read the record first. Completion refuses missing required fields and incomplete dependencies. Resolve the cause; never override the check with raw SQL. Archiving is not deletion.

Run from the project root, replacing the example values with the operator's brief:

```bash
npm run registers -- set-status --record="Name or id" --status=active --actor="Operator"
```

Use --json when exact values are needed. Report the result and any unresolved records. A failed command exits nonzero; do not describe it as saved. Drafts stay local. See CLAUDE.md for the shared operating rules.
