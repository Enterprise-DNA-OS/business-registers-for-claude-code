---
description: "Import airtable --file=<CSV> --register=<name> [--id-column=<column>] [--dry-run]."
---

# import

Import airtable --file=<CSV> --register=<name> [--id-column=<column>] [--dry-run].

Read docs/replace-airtable.md first. Inspect the CSV headers and identify a stable unique key. Test with --dry-run, compare row counts, then remove that flag to save the authorised import. Never guess links or promise that attachments and formulas transferred.

Run from the project root, replacing the example values with the operator's brief:

```bash
npm run registers -- import airtable --file="exports/Records.csv" --register="Name" --actor="Migration operator" --dry-run
```

Use --json when exact values are needed. Report the result and any unresolved records. A failed command exits nonzero; do not describe it as saved. Drafts stay local. See CLAUDE.md for the shared operating rules.
