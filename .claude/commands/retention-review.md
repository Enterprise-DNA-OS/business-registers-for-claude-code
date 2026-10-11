---
description: "Show personal records with missing or past retention review dates, including holds."
---

# retention-review

Show personal records with missing or past retention review dates, including holds.

Read docs/compliance.md. Show the source and scope of each finding. A review date is a business policy, not a statutory deadline. Never call a record flag proof of compliance or breach. Never delete or send anything.

Run from the project root, replacing the example values with the operator's brief:

```bash
npm run registers -- retention-review
```

Use --json when exact values are needed. Report the result and any unresolved records. A failed command exits nonzero; do not describe it as saved. Drafts stay local. See CLAUDE.md for the shared operating rules.
