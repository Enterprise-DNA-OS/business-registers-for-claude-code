# Business Registers for Claude Code

The open-source business register system that is just a database and Claude Code. Built by Enterprise DNA. Works with Claude Code, Codex, OpenCode or Cursor.

| Do it yourself | We customise it | We run it for you |
|---|---|---|
| Free, MIT. Install it and own the records. | Your fields, your review rules, your Airtable records brought across. | Installed and operated through Omni by Enterprise DNA. One setup fee, then a retainer. |
| [Quick start](#quick-start) | [Get your version built](https://enterprisedna.co/omni/book/?offer=replace-software&utm_campaign=airtable&utm_medium=readme) | [Talk to Sam](https://enterprisedna.co/omni/book/?offer=replace-software&utm_campaign=airtable&utm_medium=readme) |

## What it does

Keep client work, evidence, research participants or your own operational registers in one database. Give each register custom typed fields. Link records across registers, name the owner, record due dates and keep a review trail. Ask what is late, what is blocking completion and what needs a privacy review.

Airtable Business lists US$45 per user per month billed annually, or US$540 per paid user per year. Enterprise Scale is quoted privately. [Vendor pricing](https://airtable.com/pricing), checked 11 October 2026. This base removes its own software licence and seat charges. Hosting, agent subscriptions and managed service still have costs.

This is an operator's database with recurring work recipes. It does not recreate Airtable's interactive application builder. [What the free base covers](docs/why-no-front-end.md).

## Quick start

Node 20 or later. No separate database installation is needed for the local demo.

```bash
git clone https://github.com/Enterprise-DNA-OS/business-registers-for-claude-code.git
cd business-registers-for-claude-code
npm install
npm run demo
npm test
npm run view
npm run docs
```

Open the folder in your coding agent and ask: "What is late and who is blocking it?" The demo is fictional Harbour Research. It includes an overdue client report, unassigned follow-up, cross-register evidence blockers and overdue privacy reviews. Dates are relative to the day you first seed. Seeding again preserves existing rows.

For a shared PostgreSQL database, set DATABASE_URL in a private .env file and run npm run migrate. Do not seed a live customer installation. Configure access and backups before moving real records. Local PGlite expects one writer at a time.

## Weekly rituals

1. Triage overdue and unassigned work with /attention.
2. Unblock delivery with /dependencies and /record.
3. Check the week's dates and capacity with /calendar and /workload.
4. Review required fields, personal data and retention with /data-quality, /compliance and /retention-review.
5. Produce /weekly-review and /draft-handover. Both stay in drafts/ and send nothing.

Completion refuses incomplete dependencies and missing required fields. Dependency cycles are refused. Changes run in a transaction with an actor label and a journal entry. Reopening a prerequisite of completed work requires reopening the completed dependents first.

## Commands

32 slash command recipes: 30 CLI commands and two authoring recipes. Every CLI command accepts --json. Writes require --actor. Record matching accepts case-insensitive names and unique id prefixes; ambiguity lists candidates and exits 1.

| Command | Result |
|---|---|
| /registers | List every register and record count. |
| /records | List records, optionally --register, --status or --owner. |
| /record | Read one --record with custom fields, links, notes and reviews. |
| /fields | Show the fields and types for --register. |
| /search | Find --text across titles and custom field values. |
| /attention | Show overdue, unassigned, blocked, stale and privacy review work. |
| /workload | Count open, overdue, waiting and review work by owner. |
| /calendar | Show dated open records in the next --days (default 30). |
| /dependencies | Show incomplete dependencies across registers. |
| /duplicates | Find repeated names inside a register for human review. |
| /data-quality | Find missing required fields and invalid typed values. |
| /retention-review | Show personal records with missing or past retention review dates, including holds. |
| /compliance | Check privacy record controls with sources and business-policy labels. |
| /rollup | Sum a numeric --field in --register by owner and status. |
| /history | Show the last 100 changes, without copying personal values into the journal. |
| /add-register | Create --name, with --country, --personal-data, --purpose and --app-entity. |
| /set-policy | Set privacy and review policy on --register with --personal-data, --purpose, --country, --app-entity or --review-days. |
| /add-field | Add --name of --type=text or number or date or boolean or choice to --register; --required optional. |
| /add | Create --title in --register, with --owner, --due and --values as a JSON object. |
| /update | Change --record with --title, --owner, --due, --retain-until or --values (JSON merge). |
| /set-status | Set --record --status=open or active or waiting or done or archived; done checks dependencies and fields. |
| /link | Link --record to --to with --kind=depends-on or related; dependency cycles are refused. |
| /review | Record accuracy review of --record with --note and optional --next date. |
| /hold | Set --record --held=true or false --reason; a hold is not deletion or compliance certification. |
| /log | Add a factual --note to --record. |
| /import | Import airtable --file=<CSV> --register=<name> [--id-column=<column>] [--dry-run]. |
| /export | Write all records, definitions and history to --out=<JSON>. |
| /weekly-review | Draft the Monday review from attention, workload, data-quality and compliance. |
| /draft-handover | Draft one --record and its dependencies, notes and review trail. |
| /help | List commands and flags. |
| /customise | Add a field or change a rule through a tested migration. |
| /new-view | Add a branded read-only report. |

## Ten questions to ask before building another dashboard

These answers are implemented today. They combine your operational rules across registers. Airtable can also be customised; this list is not a claim that its platform cannot express these questions.

| Question | CLI command |
|---|---|
| Which overdue promises are waiting on evidence in another register? | `dependencies` |
| Who has the most overdue work across all our registers? | `workload` |
| Which records have no owner and need assigning today? | `attention` |
| Which active records have not changed in a month? | `attention` |
| Which participant records are due for an accuracy check? | `compliance` |
| Which personal records have no retention review date? | `retention-review` |
| Which retained records are on a documented hold? | `retention-review` |
| Where are required custom fields still missing? | `data-quality` |
| How many estimated hours sit with each owner at each stage? | `rollup --register="Client services" --field=Hours` |
| What did an operator change, and when? | `history` |

## Your first hour: ten things to ask for

1. Put our business name and logo on the reports.
2. Show everything overdue across our registers.
3. Explain which source record is blocking the Kauri report.
4. Assign the unowned follow-up to Mere.
5. List records with missing required fields.
6. Show personal records due for retention review.
7. Record the evidence from a completed accuracy check.
8. Add a required service line field through a migration.
9. Add a read-only view of overdue work by owner.
10. Test our Airtable CSV without saving any records.

## Bring Airtable records across

```bash
npm run registers -- import airtable --file="examples/airtable/Client work.csv" --register="Client work" --id-column="Record ID" --title-column=Name --owner-column=Owner --due-column="Due date" --status-column=Status --actor="Migration operator" --dry-run
```

Remove --dry-run to save. Import each exported grid view separately. Every visible CSV column is preserved as text. Formula results and linked labels need reviewed reconstruction; attachment files must be downloaded separately. Identical imports do not duplicate records. Changed source rows require --update. Configure privacy classification before using imported records. [Full switching guide](docs/replace-airtable.md).

Export all definitions, records, links and history with:

```bash
npm run registers -- export --out=exports/registers-backup.json
```

## Documents and views

npm run docs renders a register review pack for each register and a record handover for each record, including dependencies and review evidence. npm run view renders the week and governance as read-only HTML. Set the name, logo and colours in brand.json. Print these private working documents to PDF from your browser. They do not host an app or change records.

## Privacy and record controls

/compliance checks scoped NZ accuracy and retention prompts and AU APP-entity retention prompts. Business-defined dates are labelled as policies. A hold is shown in /retention-review and does not prove the retention is lawful. Archiving retains personal information. Read [the rules and their primary sources](docs/compliance.md) before interpreting findings or planning disposal.

## Validation

npm test creates temporary data, migrates twice, seeds twice and exercises every CLI command. It tests atomic imports, malformed CSV, duplicate keys, date and type failures, name ambiguity, dependency cycles, completion guards, review and retention scope, export coverage, drafts and escaped branded HTML. CI runs on Linux and Windows, with a separate PostgreSQL job. The workflows report their own execution result; local verification is PGlite on Linux.

## Architecture

- supabase/migrations: plain PostgreSQL migrations, also executed by PGlite.
- scripts/registers.mjs: the domain CLI and tested actions.
- .claude/commands: recurring job recipes, shared by every coding agent.
- CLAUDE.md and AGENTS.md: operating instructions and routing.
- views.json, documents.json and brand.json: private report definitions and branding.

MIT licence. Copyright 2026 Enterprise DNA. Airtable is a trademark of its owner. This independent project is not affiliated with Airtable.
