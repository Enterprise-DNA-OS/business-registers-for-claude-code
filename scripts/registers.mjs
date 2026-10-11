#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import { getDb, REPO_ROOT } from "./lib/db.mjs";
import { parseCsv, pick } from "./lib/csv.mjs";
import { table } from "./lib/format.mjs";

export const HELP = {
  registers: "List every register and record count.",
  records: "List records, optionally --register, --status or --owner.",
  record: "Read one --record with custom fields, links, notes and reviews.",
  fields: "Show the fields and types for --register.",
  search: "Find --text across titles and custom field values.",
  attention:
    "Show overdue, unassigned, blocked, stale and privacy review work.",
  workload: "Count open, overdue, waiting and review work by owner.",
  calendar: "Show dated open records in the next --days (default 30).",
  dependencies: "Show incomplete dependencies across registers.",
  duplicates: "Find repeated names inside a register for human review.",
  "data-quality": "Find missing required fields and invalid typed values.",
  "retention-review":
    "Show personal records with missing or past retention review dates, including holds.",
  compliance:
    "Check privacy record controls with sources and business-policy labels.",
  rollup: "Sum a numeric --field in --register by owner and status.",
  history:
    "Show the last 100 changes, without copying personal values into the journal.",
  "add-register":
    "Create --name, with --country, --personal-data, --purpose and --app-entity.",
  "set-policy":
    "Set privacy and review policy on --register with --personal-data, --purpose, --country, --app-entity or --review-days.",
  "add-field":
    "Add --name of --type=text|number|date|boolean|choice to --register; --required optional.",
  add: "Create --title in --register, with --owner, --due and --values as a JSON object.",
  update:
    "Change --record with --title, --owner, --due, --retain-until or --values (JSON merge).",
  "set-status":
    "Set --record --status=open|active|waiting|done|archived; done checks dependencies and fields.",
  link: "Link --record to --to with --kind=depends-on|related; dependency cycles are refused.",
  review:
    "Record accuracy review of --record with --note and optional --next date.",
  hold: "Set --record --held=true|false --reason; a hold is not deletion or compliance certification.",
  log: "Add a factual --note to --record.",
  import:
    "Import airtable --file=<CSV> --register=<name> [--id-column=<column>] [--dry-run].",
  export: "Write all records, definitions and history to --out=<JSON>.",
  "weekly-review":
    "Draft the Monday review from attention, workload, data-quality and compliance.",
  "draft-handover":
    "Draft one --record and its dependencies, notes and review trail.",
  help: "List commands and flags.",
};
const sources = {
  NZ9: "https://www.privacy.org.nz/privacy-principles/9/",
  AU11: "https://www.oaic.gov.au/privacy/australian-privacy-principles-guidelines/chapter-11-app-11-security-of-personal-information",
};
export function parse(args) {
  const pos = [],
    o = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (!a.startsWith("--")) {
      pos.push(a);
      continue;
    }
    const eq = a.indexOf("=");
    if (eq >= 0) o[a.slice(2, eq)] = a.slice(eq + 1);
    else if (args[i + 1] && !args[i + 1].startsWith("--"))
      o[a.slice(2)] = args[++i];
    else o[a.slice(2)] = true;
  }
  return { cmd: pos[0] || "help", o: { ...o, _pos: pos.slice(1) } };
}
const required = (o, k) => {
  if (o[k] === undefined || o[k] === true || String(o[k]).trim() === "")
    throw Error(`Missing --${k}`);
  return String(o[k]).trim();
};
export function date(v) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(String(v)) ||
    Number.isNaN(Date.parse(v)) ||
    new Date(v).toISOString().slice(0, 10) !== v
  )
    throw Error(`Invalid calendar date: ${v}`);
  return v;
}
function bool(v) {
  if (v === true || v === "true") return true;
  if (v === false || v === "false") return false;
  throw Error("Boolean must be true or false");
}
function object(v) {
  const x = typeof v === "string" ? JSON.parse(v) : v;
  if (!x || Array.isArray(x) || typeof x !== "object")
    throw Error("Expected a JSON object");
  return x;
}
const slug = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "record";
function integer(v, min = 1, max = 3650) {
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max)
    throw Error(`Expected integer ${min}..${max}`);
  return n;
}
export async function resolve(db, kind, needle, reg = null) {
  if (!needle || needle === true)
    throw Error(`Missing --${kind === "records" ? "record" : "register"}`);
  const col = kind === "records" ? "title" : "name";
  let rows = await db.query(
    `select * from registers.${kind} where (id::text=$1 or lower(${col})=lower($1)) ${reg ? "and register_id=$2" : ""} order by ${col},id`,
    reg ? [String(needle), reg] : [String(needle)],
  );
  if (!rows.length)
    rows = await db.query(
      `select * from registers.${kind} where (starts_with(id::text,$1) or strpos(lower(${col}),lower($1))>0) ${reg ? "and register_id=$2" : ""} order by ${col},id`,
      reg ? [String(needle), reg] : [String(needle)],
    );
  if (rows.length !== 1)
    throw Error(
      `${rows.length ? "Ambiguous" : "No matching"} ${kind}: ${needle}${rows.length ? "\n" + rows.map((r) => `${r.id}  ${r[col]}`).join("\n") : ""}`,
    );
  return rows[0];
}
async function record(db, o) {
  let g = null;
  if (o.register) g = (await resolve(db, "registers", o.register)).id;
  return resolve(db, "records", required(o, "record"), g);
}
async function fields(db, id) {
  return db.query(
    "select * from registers.fields where register_id=$1 order by name",
    [id],
  );
}
function valueIssue(f, v) {
  if (v === undefined || v === null || v === "")
    return f.required ? "Required field is empty" : null;
  if (f.kind === "text" && typeof v !== "string") return "Expected text";
  if (f.kind === "number" && (typeof v !== "number" || !Number.isFinite(v)))
    return "Expected finite number";
  if (f.kind === "boolean" && typeof v !== "boolean") return "Expected boolean";
  if (f.kind === "date") {
    try {
      date(v);
    } catch {
      return "Expected YYYY-MM-DD calendar date";
    }
  }
  if (f.kind === "choice" && !f.options.includes(v))
    return "Not in allowed choices";
  return null;
}
async function validate(db, reg, vals, complete = false) {
  const defs = await fields(db, reg);
  for (const key of Object.keys(vals))
    if (!defs.some((f) => f.name === key))
      throw Error(`Unknown field: ${key}. Add its definition first.`);
  for (const f of defs) {
    const issue = valueIssue(f, vals[f.name]);
    if (issue && (complete || issue !== "Required field is empty"))
      throw Error(`${f.name}: ${issue}`);
  }
}
export const READS = {
  registers: async (db) =>
    db.query(
      "select g.id,g.name,g.country,g.personal_data,g.purpose,count(r.id)::int as records from registers.registers g left join registers.records r on r.register_id=g.id group by g.id order by g.name",
    ),
  records: async (db, o) => {
    let id = null;
    if (o.register) id = (await resolve(db, "registers", o.register)).id;
    return db.query(
      "select id,register,title,owner,status,due_on,review_due_on,blockers from registers.record_overview where ($1::uuid is null or register_id=$1) and ($2::text is null or status=$2) and ($3::text is null or lower(owner)=lower($3)) order by register,due_on nulls last,title",
      [id, o.status || null, o.owner || null],
    );
  },
  fields: async (db, o) =>
    fields(db, (await resolve(db, "registers", required(o, "register"))).id),
  search: async (db, o) =>
    db.query(
      "select id,register,title,owner,status from registers.record_overview where strpos(lower(title||' '||values::text),lower($1))>0 order by register,title",
      [required(o, "text")],
    ),
  attention: async (db) =>
    db.query(
      "select register,title,owner,issue,detail from registers.attention order by issue,register,title",
    ),
  workload: async (db) =>
    db.query(
      "select * from registers.workload order by overdue desc,open_records desc,owner",
    ),
  calendar: async (db, o) =>
    db.query(
      "select register,title,owner,due_on,(due_on-current_date)::int as days_until from registers.record_overview where status not in ('done','archived') and due_on between current_date and current_date+$1::int order by due_on,title",
      [integer(o.days || 30)],
    ),
  dependencies: async (db) =>
    db.query(
      "select g.name as register,r.title as waiting_record,d.title as waiting_for,d.owner as blocker_owner,d.status as blocker_status,d.due_on from registers.links l join registers.records r on r.id=l.from_id join registers.records d on d.id=l.to_id join registers.registers g on g.id=r.register_id where l.kind='depends-on' and r.status not in ('done','archived') and d.status not in ('done','archived') order by g.name,r.title,d.title",
    ),
  duplicates: async (db) =>
    db.query(
      "select g.name as register,lower(trim(r.title)) as title,count(*)::int as copies,string_agg(r.id::text,', ') as ids from registers.records r join registers.registers g on g.id=r.register_id group by g.name,lower(trim(r.title)) having count(*)>1 order by g.name",
    ),
  "data-quality": async (db) => {
    const rows = await db.query(
      "select r.id,g.name as register,r.title,r.values,f.name,f.kind,f.required,f.options from registers.records r join registers.registers g on g.id=r.register_id join registers.fields f on f.register_id=r.register_id order by g.name,r.title,f.name",
    );
    return rows.flatMap((r) => {
      const issue = valueIssue(r, r.values[r.name]);
      return issue
        ? [
            {
              id: r.id,
              register: r.register,
              title: r.title,
              field: r.name,
              issue,
            },
          ]
        : [];
    });
  },
  "retention-review": async (db) =>
    db.query(
      "select g.name as register,r.title,r.retain_until,r.legal_hold,r.hold_reason,g.country,g.app_entity from registers.records r join registers.registers g on g.id=r.register_id where g.personal_data and (r.retain_until is null or r.retain_until<current_date or r.legal_hold) order by r.retain_until nulls first,r.title",
    ),
  compliance: async (db) =>
    db.query(
      "select register,title,rule,basis,finding,source from registers.compliance order by rule,register,title",
    ),
  rollup: async (db, o) => {
    const g = await resolve(db, "registers", required(o, "register"));
    const f = (await fields(db, g.id)).find(
      (f) => f.name === required(o, "field"),
    );
    if (!f || f.kind !== "number")
      throw Error("Rollup requires a defined number field");
    return db.query(
      "select coalesce(nullif(owner,''),'Unassigned') as owner,status,count(*)::int as records,sum(case when jsonb_typeof(values->$2)='number' then (values->>$2)::numeric else null end) as total from registers.records where register_id=$1 group by owner,status order by owner,status",
      [g.id, f.name],
    );
  },
  history: async (db) =>
    db.query(
      "select entity,entity_id,action,actor,changed_keys,created_at from registers.audit order by created_at desc,id limit 100",
    ),
  record: async (db, o) => {
    const r = await record(db, o);
    return {
      record: r,
      links: await db.query(
        "select l.kind,r.title as related_record,r.status,l.from_id,l.to_id from registers.links l join registers.records r on r.id=case when l.from_id=$1 then l.to_id else l.from_id end where l.from_id=$1 or l.to_id=$1 order by l.kind,r.title",
        [r.id],
      ),
      notes: await db.query(
        "select actor,note,created_at from registers.notes where record_id=$1 order by created_at",
        [r.id],
      ),
      reviews: await db.query(
        "select actor,note,reviewed_on,next_due from registers.reviews where record_id=$1 order by reviewed_on",
        [r.id],
      ),
    };
  },
};
async function transaction(db, actor, fn, dry = false) {
  await db.exec("BEGIN");
  try {
    await db.query("select set_config('registers.actor',$1,true)", [actor]);
    const result = await fn();
    await db.exec(dry ? "ROLLBACK" : "COMMIT");
    return result;
  } catch (e) {
    await db.exec("ROLLBACK");
    throw e;
  }
}
async function importAirtable(db, o) {
  if (o._pos?.[0] !== "airtable")
    throw Error("Use import airtable --file=<CSV> --register=<name>");
  const file = required(o, "file"),
    name = required(o, "register"),
    text = fs.readFileSync(file, "utf8"),
    rows = parseCsv(text);
  if (!rows.length) throw Error("CSV contains no records");
  const headers = Object.keys(rows[0]),
    idCol = o["id-column"] || headers[0],
    titleCol = o["title-column"] || headers[0];
  for (const col of [
    idCol,
    titleCol,
    o["owner-column"],
    o["due-column"],
    o["status-column"],
  ].filter(Boolean))
    if (!headers.includes(col)) throw Error(`Missing CSV column: ${col}`);
  const keys = new Set();
  for (const r of rows) {
    const k = r[idCol].trim();
    if (!k || keys.has(k))
      throw Error(
        `Blank or duplicate import key ${k}; export a unique identifier and use --id-column`,
      );
    keys.add(k);
    if (!r[titleCol].trim()) throw Error("Blank title");
  }
  const found = await db.query(
    "select * from registers.registers where lower(name)=lower($1)",
    [name],
  );
  let g = found[0];
  if (!g)
    g = (
      await db.query(
        "insert into registers.registers(name,description) values($1,$2) returning *",
        [
          name,
          "Imported Airtable grid view. Configure personal-data purpose and review policy before use.",
        ],
      )
    )[0];
  for (const name of headers)
    await db.query(
      "insert into registers.fields(register_id,name,kind) values($1,$2,'text') on conflict(register_id,name) do nothing",
      [g.id, name],
    );
  let added = 0,
    updated = 0,
    unchanged = 0;
  for (const row of rows) {
    const vals = { ...row };
    await validate(db, g.id, vals);
    const existing = (
      await db.query(
        "select * from registers.records where register_id=$1 and external_id=$2",
        [g.id, row[idCol].trim()],
      )
    )[0];
    const due =
      o["due-column"] && row[o["due-column"]]
        ? date(row[o["due-column"]])
        : null;
    const status = o["status-column"]
      ? row[o["status-column"]].trim().toLowerCase()
      : "open";
    if (!["open", "active", "waiting", "done", "archived"].includes(status))
      throw Error(
        `Unknown status ${status}; leave --status-column off to preserve source text and triage it after import`,
      );
    if (existing) {
      const same =
        JSON.stringify(Object.entries(existing.source_values).sort()) ===
        JSON.stringify(Object.entries(row).sort());
      if (same) {
        unchanged++;
        continue;
      }
      if (!o.update)
        throw Error(
          `Source changed for ${row[idCol]}; compare with export, then pass --update to replace imported values`,
        );
      // Re-import updates source fields only. Local ownership, review, due dates and workflow stay intact.
      await db.query(
        "update registers.records set title=$2,values=$3,source_values=$4 where id=$1",
        [
          existing.id,
          row[titleCol],
          JSON.stringify({ ...existing.values, ...row }),
          JSON.stringify(row),
        ],
      );
      updated++;
    } else {
      if (status === "done") await validate(db, g.id, vals, true);
      await db.query(
        "insert into registers.records(register_id,external_id,title,owner,due_on,status,values,source_values) values($1,$2,$3,$4,$5,$6,$7,$8)",
        [
          g.id,
          row[idCol].trim(),
          row[titleCol],
          o["owner-column"] ? row[o["owner-column"]] : "",
          due,
          status,
          JSON.stringify(vals),
          JSON.stringify(row),
        ],
      );
      added++;
    }
  }
  await db.query(
    "insert into registers.imports(register_id,file_name,sha256,row_count,actor) values($1,$2,$3,$4,$5)",
    [
      g.id,
      path.basename(file),
      createHash("sha256").update(text).digest("hex"),
      rows.length,
      required(o, "actor"),
    ],
  );
  return {
    register: g.name,
    added,
    updated,
    unchanged,
    dry_run: Boolean(o["dry-run"]),
    notes:
      "All CSV fields preserved as text. Formula results and linked labels remain text. Attachments are references only. Set privacy policy before use.",
  };
}
export async function execute(db, cmd, o = {}) {
  if (cmd === "help")
    return Object.entries(HELP).map(([command, description]) => ({
      command,
      description,
    }));
  if (READS[cmd]) return READS[cmd](db, o);
  if (cmd === "export") {
    const out = path.resolve(required(o, "out"));
    const result = {
      format: "business-registers/v1",
      exported_at: new Date().toISOString(),
    };
    await db.exec("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    try {
      for (const t of [
        "registers",
        "fields",
        "records",
        "links",
        "reviews",
        "notes",
        "imports",
        "audit",
      ])
        result[t] = await db.query(`select * from registers.${t} order by id`);
      await db.exec("COMMIT");
    } catch (e) {
      await db.exec("ROLLBACK");
      throw e;
    }
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, JSON.stringify(result, null, 2) + "\n", {
      flag: "wx",
    });
    return { file: out, records: result.records.length };
  }
  if (cmd === "weekly-review" || cmd === "draft-handover") {
    const data =
      cmd === "weekly-review"
        ? {
            attention: await READS.attention(db, o),
            workload: await READS.workload(db, o),
            "data-quality": await READS["data-quality"](db, o),
            compliance: await READS.compliance(db, o),
          }
        : await READS.record(db, o);
    const dir = path.join(process.env.OUTPUT_DIR || REPO_ROOT, "drafts");
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(
      dir,
      `${cmd}-${new Date().toISOString().slice(0, 10)}-${randomUUID().slice(0, 8)}.md`,
    );
    fs.writeFileSync(
      file,
      `# ${cmd === "weekly-review" ? "Weekly register review" : "Record handover"}\n\nDraft only. No message sent.\n\n${render(data)}\n`,
      { flag: "wx" },
    );
    return { file };
  }
  if (!HELP[cmd]) throw Error(`Unknown command ${cmd}. Run help.`);
  const actor = required(o, "actor");
  return transaction(
    db,
    actor,
    async () => {
      if (cmd === "import") return importAirtable(db, o);
      if (cmd === "add-register")
        return (
          await db.query(
            "insert into registers.registers(name,description,country,personal_data,purpose,app_entity,review_days) values($1,$2,$3,$4,$5,$6,$7) returning *",
            [
              required(o, "name"),
              o.description || "",
              o.country || "NZ",
              o["personal-data"] === undefined
                ? false
                : bool(o["personal-data"]),
              o.purpose || "",
              o["app-entity"] === undefined ? false : bool(o["app-entity"]),
              integer(o["review-days"] || 30),
            ],
          )
        )[0];
      if (cmd === "set-policy") {
        const g = await resolve(db, "registers", required(o, "register"));
        return (
          await db.query(
            "update registers.registers set personal_data=$2,purpose=$3,country=$4,app_entity=$5,review_days=$6 where id=$1 returning *",
            [
              g.id,
              o["personal-data"] === undefined
                ? g.personal_data
                : bool(o["personal-data"]),
              o.purpose === undefined ? g.purpose : String(o.purpose),
              o.country || g.country,
              o["app-entity"] === undefined
                ? g.app_entity
                : bool(o["app-entity"]),
              o["review-days"] === undefined
                ? g.review_days
                : integer(o["review-days"]),
            ],
          )
        )[0];
      }
      if (cmd === "add-field") {
        const g = await resolve(db, "registers", required(o, "register"));
        const kind = required(o, "type");
        let options = [];
        if (kind === "choice") {
          options = JSON.parse(required(o, "options"));
          if (
            !Array.isArray(options) ||
            options.length < 1 ||
            options.some((v) => typeof v !== "string" || !v.trim()) ||
            new Set(options).size !== options.length
          )
            throw Error("Choices require a nonempty unique JSON string array");
        }
        return (
          await db.query(
            "insert into registers.fields(register_id,name,kind,required,options) values($1,$2,$3,$4,$5) returning *",
            [
              g.id,
              required(o, "name"),
              kind,
              o.required === undefined ? false : bool(o.required),
              JSON.stringify(options),
            ],
          )
        )[0];
      }
      if (cmd === "add") {
        const g = await resolve(db, "registers", required(o, "register"));
        const vals = o.values ? object(o.values) : {};
        await validate(db, g.id, vals);
        return (
          await db.query(
            "insert into registers.records(register_id,title,owner,due_on,retain_until,values,review_due_on) values($1,$2,$3,$4,$5,$6,current_date+$7::int) returning *",
            [
              g.id,
              required(o, "title"),
              o.owner || "",
              o.due ? date(o.due) : null,
              o["retain-until"] ? date(o["retain-until"]) : null,
              JSON.stringify(vals),
              g.review_days,
            ],
          )
        )[0];
      }
      const r = await record(db, o);
      if (cmd === "update") {
        const vals = o.values ? { ...r.values, ...object(o.values) } : r.values;
        await validate(db, r.register_id, vals, r.status === "done");
        return (
          await db.query(
            "update registers.records set title=$2,owner=$3,due_on=$4,retain_until=$5,values=$6 where id=$1 returning *",
            [
              r.id,
              o.title === undefined ? r.title : required(o, "title"),
              o.owner === undefined ? r.owner : String(o.owner),
              o.due === undefined
                ? r.due_on
                : o.due === "none"
                  ? null
                  : date(o.due),
              o["retain-until"] === undefined
                ? r.retain_until
                : o["retain-until"] === "none"
                  ? null
                  : date(o["retain-until"]),
              JSON.stringify(vals),
            ],
          )
        )[0];
      }
      if (cmd === "set-status") {
        const status = required(o, "status");
        if (!["done", "archived"].includes(status)) {
          const deps = await db.query(
            "select d.title from registers.links l join registers.records d on d.id=l.from_id where l.to_id=$1 and l.kind='depends-on' and d.status='done'",
            [r.id],
          );
          if (deps.length)
            throw Error(
              "Reopen completed dependents first: " +
                deps.map((x) => x.title).join(", "),
            );
        }
        if (status === "done") {
          await validate(db, r.register_id, r.values, true);
          const [{ n }] = await db.query(
            "select count(*)::int as n from registers.links l join registers.records d on d.id=l.to_id where l.from_id=$1 and l.kind='depends-on' and d.status not in ('done','archived')",
            [r.id],
          );
          if (n) throw Error(`${n} incomplete dependencies prevent completion`);
        }
        return (
          await db.query(
            "update registers.records set status=$2 where id=$1 returning *",
            [r.id, status],
          )
        )[0];
      }
      if (cmd === "link") {
        const to = await resolve(db, "records", required(o, "to"));
        const kind = o.kind || "related";
        if (kind === "depends-on") {
          if (r.status === "done" && !["done", "archived"].includes(to.status))
            throw Error(
              "Reopen the dependent record before adding an incomplete dependency",
            );
          const cycles = await db.query(
            "with recursive chain(id) as (select $1::uuid union select l.to_id from registers.links l join chain c on l.from_id=c.id where l.kind='depends-on') select id from chain where id=$2",
            [to.id, r.id],
          );
          if (cycles.length) throw Error("Dependency cycle refused");
        }
        return (
          await db.query(
            "insert into registers.links(from_id,to_id,kind) values($1,$2,$3) returning *",
            [r.id, to.id, kind],
          )
        )[0];
      }
      if (cmd === "review") {
        const g = (
          await db.query("select * from registers.registers where id=$1", [
            r.register_id,
          ])
        )[0];
        const [{ today, next: defaultNext }] = await db.query(
          "select current_date::text as today,(current_date+$1::int)::text as next",
          [g.review_days],
        );
        const next = o.next ? date(o.next) : defaultNext;
        if (next <= today) throw Error("Next review must be after today");
        const rev = (
          await db.query(
            "insert into registers.reviews(record_id,actor,note,reviewed_on,next_due) values($1,$2,$3,$4,$5) returning *",
            [r.id, actor, required(o, "note"), today, next],
          )
        )[0];
        await db.query(
          "update registers.records set reviewed_on=$2,review_due_on=$3 where id=$1",
          [r.id, today, next],
        );
        return rev;
      }
      if (cmd === "hold")
        return (
          await db.query(
            "update registers.records set legal_hold=$2,hold_reason=$3 where id=$1 returning *",
            [r.id, bool(o.held), required(o, "reason")],
          )
        )[0];
      if (cmd === "log")
        return (
          await db.query(
            "insert into registers.notes(record_id,actor,note) values($1,$2,$3) returning *",
            [r.id, actor, required(o, "note")],
          )
        )[0];
    },
    Boolean(o["dry-run"]),
  );
}
export function render(result) {
  if (Array.isArray(result)) {
    if (!result.length) return "(none)";
    const cols = Object.keys(result[0]);
    return table(
      result.map((r) =>
        Object.fromEntries(
          Object.entries(r).map(([k, v]) => [
            k,
            v && typeof v === "object" ? JSON.stringify(v) : v,
          ]),
        ),
      ),
      cols.map((key) => ({
        key,
        label: key.replaceAll("_", " "),
        width:
          key === "description" || key === "finding" || key === "detail"
            ? 110
            : 52,
      })),
    );
  }
  if (result && typeof result === "object")
    return Object.entries(result)
      .map(
        ([k, v]) => `${k}:\n${typeof v === "object" ? render(v) : (v ?? "")}`,
      )
      .join("\n\n");
  return String(result ?? "");
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  const { cmd, o } = parse(process.argv.slice(2));
  let db;
  try {
    db = await getDb();
    const result = await execute(db, o.help ? "help" : cmd, o);
    console.log(o.json ? JSON.stringify(result, null, 2) : render(result));
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  } finally {
    if (db) await db.close();
  }
}
