# Bring Airtable records across

The supported starting point is Airtable's own grid-view CSV export. [Airtable's export guide](https://support.airtable.com/articles/5189551686-getting-started-with-airtable-views), checked 11 October 2026, says each table exports separately, only visible field values are included, and filters limit the rows exported. Record comments, field descriptions, base guides and extension-only content are not included. Attachments export as filenames and temporary URLs, not downloaded files.

1. In each table, make a grid view with no filters and show every field you need. Keep your original base while testing.
2. Use the view menu and choose Download CSV. Save each file separately.
3. Choose a stable unique key. The first column is used by default. If it contains duplicate names, include a unique identifier field and use `--id-column`. The importer never guesses which identical name you meant.
4. Download attachments separately before their URLs expire. This importer preserves their CSV text but does not retrieve files or reuse the temporary URLs as a permanent archive.
5. Migrate the empty local database and import one exported file in a single command:

```bash
npm run migrate
npm run registers -- import airtable --file="exports/Client work.csv" --register="Client work" --id-column="Record ID" --title-column=Name --owner-column=Owner --due-column="Due date" --status-column=Status --actor="Migration operator" --dry-run
```

Remove `--dry-run` to save. A dry run rolls back the records, definitions and import journal together. The included file in `examples/airtable/Client work.csv` is a synthetic fixture using the documented CSV shape, not a captured customer export.

The optional owner, due and status mappings populate operational fields. Dates must be YYYY-MM-DD. Status mappings accept open, active, waiting, done and archived. Leave those flags off when your exported formats differ: every original value stays in the custom fields and source copy for a reviewed conversion. Formula and lookup results arrive as values, never executable formulas. Linked-record values remain labels; rebuild links explicitly after matching unique records. Interfaces, automations, permissions, revision history and attachments need separate reconstruction.

Every column initially becomes a text field. Existing typed registers reject incompatible imports instead of changing types. Empty values, embedded commas, quoted lines, Unicode and BOM headers are supported. Malformed CSV, blank keys and duplicate keys fail the whole import. Existing records with an identical source row are skipped. Changed rows require `--update`; this replaces their imported field values while preserving local ownership, workflow, due dates and review controls. Do an export first and compare the result. Repeated imports do not duplicate records, although each saved import records a run.

After import, set the register's privacy policy, add the typed fields your calculations require, map dependencies, review data-quality findings, and compare source and destination counts. Import each additional table with the same command and its own register name. There is no claim of a one-file full-base export.

```bash
npm run registers -- set-policy --register="Client work" --country=NZ --personal-data=true --purpose="Deliver commissioned client research" --actor="Migration operator"
npm run registers -- data-quality
npm run registers -- export --out=exports/verified-migration.json
```

Export writes every register, field definition, record, source value, relation, note, review and journal entry as JSON. The export is portable data; restoration should be tested with a reviewed migration before replacing a live database. It refuses to overwrite an existing file. CSV formula text is never executed by this system; take care if opening exported values in a spreadsheet.
