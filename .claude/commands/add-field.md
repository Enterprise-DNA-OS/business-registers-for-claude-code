---
description: "Add --name of --type=text|number|date|boolean|choice to --register; --required optional."
---

# add-field

Add --name of --type=text|number|date|boolean|choice to --register; --required optional.

Read relevant records before changing them. Include --actor for writes. Never invent a missing value or choose between ambiguous names.

Run from the project root, replacing the example values with the operator's brief:

```bash
npm run registers -- add-field --register="Name" --name="Field" --type=text --actor="Operator"
```

Use --json when exact values are needed. Report the result and any unresolved records. A failed command exits nonzero; do not describe it as saved. Drafts stay local. See CLAUDE.md for the shared operating rules.
