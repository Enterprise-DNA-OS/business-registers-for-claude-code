# Why no front end

Your business registers are records, links, review dates and rules. A coding agent reads them and runs the CLI. Claude Code, Codex, OpenCode and Cursor use the same database and instructions.

`npm run view` renders read-only HTML snapshots. `npm run docs` renders review packs and record handovers. They are private working files, not a hosted app. The business name, logo and colours live in `brand.json`. No browser action changes a record.

Airtable provides collaborative grid editing, forms, interfaces, mobile access and automation integrations. This base does not recreate those experiences. There is no drag and drop, public form intake, offline mobile synchronisation, hosted login or notification service. Exported formula results and link labels need reviewed conversion before they behave like live calculations and relationships.

The free base serves an operator who wants to manage work through an agent and keep the records in a database they own. If the work requires many users editing screens or a public form, Enterprise DNA scopes those interfaces and connections in the custom version. A change does not become a promise of complete Airtable feature parity.

Local operation uses PGlite. A shared installation uses PostgreSQL through DATABASE_URL. PGlite expects one writer process at a time. Files and exports are sensitive if their records are sensitive. Hosting, access control and backups belong in the installation plan.
