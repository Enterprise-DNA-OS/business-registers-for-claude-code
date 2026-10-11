---
description: "Add fields, rules or calculations in plain language, with a migration and a test."
---

# Make it theirs

Read CLAUDE.md, the relevant records, fields and docs/compliance.md. Translate the request into a concrete rule and show the affected records before changing live data.

For a new custom field, write the next numbered file in supabase/migrations. Insert a field definition for the named register using INSERT ... SELECT, with an explicit type and required flag. A new required field needs a reviewed backfill before existing completed records can satisfy it. Do not edit an applied migration. For renamed stages or changed database columns, update the database checks, CLI validation, reports, import mapping and command recipes together.

Run npm test against temporary data. Apply the reviewed migration with npm run migrate and inspect the new fields and affected records. Run the relevant commands again. Commit the change on main with the requested business outcome in the message. Never infer a legal deadline; cite its primary source or label it business policy. Changes that discard data or face customers need the operator's explicit approval.

Existing typed values are not coerced silently. A text-to-number conversion needs a migration that reports or rejects invalid values before changing the field definition. Keep originals in source_values until the approved retention policy allows disposal.
