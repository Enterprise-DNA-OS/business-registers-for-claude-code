---
description: "Create --name, with --country, --personal-data, --purpose and --app-entity."
---

# add-register

Create --name, with --country, --personal-data, --purpose and --app-entity.

Read relevant records before changing them. Include --actor for writes. Never invent a missing value or choose between ambiguous names.

Run from the project root, replacing the example values with the operator's brief:

```bash
npm run registers -- add-register --name="Name" --country=NZ --personal-data=false --purpose="Purpose" --actor="Operator"
```

Use --json when exact values are needed. Report the result and any unresolved records. A failed command exits nonzero; do not describe it as saved. Drafts stay local. See CLAUDE.md for the shared operating rules.
