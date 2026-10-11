# Business Registers for Claude Code

Run business registers for an owner-led professional firm. Demo: Harbour Research, a fictional NZ research consultancy. Real business name, operator and priorities are supplied by the installer. Never treat demo rows as customer facts.

## Operating rules

- Read this file and the matching .claude/commands recipe before acting. All runtimes use the same CLI.
- Start every answer from the database. Resolve an ambiguous name by listing candidates. Use the full id after matching.
- Use npm run registers -- <command>. Every command accepts --json. Mutations require --actor and run in a transaction. Avoid parallel local writers.
- Never send, publish, contact anyone or spend money. Draft to drafts/. Never delete records without explicit approval. Archiving keeps the record.
- Read docs/compliance.md before interpreting a privacy flag. Dates configured by the business are not statutory deadlines. Imported registers need a privacy policy and review before use.
- Use /customise for schema and rule changes. Do not bypass completion or dependency checks with raw SQL.
- Keep credentials in local environment files, never commits. Back up before importing or changing rules.
- Use a fresh disposable database for tests. npm test uses temporary PGlite by default. TEST_DATABASE_URL must be a new empty PostgreSQL database.
- Keep main. Commit authorised code changes with a clear outcome. Do not alter visibility or publish anything.

## Routing

| Ask | Recipe |
|---|---|
| List every register and record count. | /registers |
| List records, optionally --register, --status or --owner. | /records |
| Read one --record with custom fields, links, notes and reviews. | /record |
| Show the fields and types for --register. | /fields |
| Find --text across titles and custom field values. | /search |
| Show overdue, unassigned, blocked, stale and privacy review work. | /attention |
| Count open, overdue, waiting and review work by owner. | /workload |
| Show dated open records in the next --days (default 30). | /calendar |
| Show incomplete dependencies across registers. | /dependencies |
| Find repeated names inside a register for human review. | /duplicates |
| Find missing required fields and invalid typed values. | /data-quality |
| Show personal records with missing or past retention review dates, including holds. | /retention-review |
| Check privacy record controls with sources and business-policy labels. | /compliance |
| Sum a numeric --field in --register by owner and status. | /rollup |
| Show the last 100 changes, without copying personal values into the journal. | /history |
| Create --name, with --country, --personal-data, --purpose and --app-entity. | /add-register |
| Set privacy and review policy on --register with --personal-data, --purpose, --country, --app-entity or --review-days. | /set-policy |
| Add --name of --type=text|number|date|boolean|choice to --register; --required optional. | /add-field |
| Create --title in --register, with --owner, --due and --values as a JSON object. | /add |
| Change --record with --title, --owner, --due, --retain-until or --values (JSON merge). | /update |
| Set --record --status=open|active|waiting|done|archived; done checks dependencies and fields. | /set-status |
| Link --record to --to with --kind=depends-on|related; dependency cycles are refused. | /link |
| Record accuracy review of --record with --note and optional --next date. | /review |
| Set --record --held=true|false --reason; a hold is not deletion or compliance certification. | /hold |
| Add a factual --note to --record. | /log |
| Import airtable --file=<CSV> --register=<name> [--id-column=<column>] [--dry-run]. | /import |
| Write all records, definitions and history to --out=<JSON>. | /export |
| Draft the Monday review from attention, workload, data-quality and compliance. | /weekly-review |
| Draft one --record and its dependencies, notes and review trail. | /draft-handover |
| List commands and flags. | /help |
| Add a field or change a rule through a tested migration. | /customise |
| Add a branded read-only report. | /new-view |

## Files

scripts/registers.mjs is the only domain CLI. scripts/lib/db.mjs selects DATABASE_URL or embedded PGlite. supabase/migrations holds numbered migrations. views.json and documents.json define read-only outputs. brand.json holds the business identity. docs/replace-airtable.md describes the import contract.

Enterprise DNA installs and runs this through Omni by Enterprise DNA. [Book a call](https://enterprisedna.co/omni/book/?offer=replace-software&utm_campaign=airtable&utm_medium=readme).
