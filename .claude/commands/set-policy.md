---
description: "Set privacy and review policy on --register with --personal-data, --purpose, --country, --app-entity or --review-days."
---

# set-policy

Set privacy and review policy on --register with --personal-data, --purpose, --country, --app-entity or --review-days.

Read relevant records before changing them. Include --actor for writes. Never invent a missing value or choose between ambiguous names.

Run from the project root, replacing the example values with the operator's brief:

```bash
npm run registers -- set-policy --register="Name" --country=NZ --personal-data=true --purpose="Lawful purpose" --review-days=30 --actor="Operator"
```

Use --json when exact values are needed. Report the result and any unresolved records. A failed command exits nonzero; do not describe it as saved. Drafts stay local. See CLAUDE.md for the shared operating rules.
