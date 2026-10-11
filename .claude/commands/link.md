---
description: "Link --record to --to with --kind=depends-on|related; dependency cycles are refused."
---

# link

Link --record to --to with --kind=depends-on|related; dependency cycles are refused.

Read both records first. A depends-on link is directional: --record waits for --to. Cycles are refused. Match unique names or ids.

Run from the project root, replacing the example values with the operator's brief:

```bash
npm run registers -- link --record="Dependent name or id" --to="Prerequisite name or id" --kind=depends-on --actor="Operator"
```

Use --json when exact values are needed. Report the result and any unresolved records. A failed command exits nonzero; do not describe it as saved. Drafts stay local. See CLAUDE.md for the shared operating rules.
