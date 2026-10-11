---
description: "Draft the Monday review from attention, workload, data-quality and compliance."
---

# weekly-review

Draft the Monday review from attention, workload, data-quality and compliance.

The CLI combines attention, workload, data-quality and compliance into a draft in drafts/. Read it and lead with the overdue items, owners and dependency decisions. Include the evidence and the next action. Never send.

Run from the project root, replacing the example values with the operator's brief:

```bash
npm run registers -- weekly-review
```

Use --json when exact values are needed. Report the result and any unresolved records. A failed command exits nonzero; do not describe it as saved. Drafts stay local. See CLAUDE.md for the shared operating rules.
