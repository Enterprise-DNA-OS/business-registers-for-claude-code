import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { getDb, REPO_ROOT } from "./lib/db.mjs";
import { migrate } from "./migrate.mjs";
import { seed } from "./seed.mjs";
import { execute, HELP, READS, parse, date, render } from "./registers.mjs";
import { parseCsv } from "./lib/csv.mjs";
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "registers-test-"));
process.env.DATA_DIR = path.join(tmp, "db");
process.env.OUTPUT_DIR = tmp;
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || "";
const seen = new Set();
let db;
const run = async (cmd, o = {}) => {
  seen.add(cmd);
  return execute(db, cmd, { actor: "Test operator", ...o });
};
const rejects = (cmd, o, re) => assert.rejects(() => run(cmd, o), re);
const fixture = path.join(REPO_ROOT, "examples/airtable/Client work.csv");
const child = (file, args = []) => {
  const r = spawnSync(
    process.execPath,
    [path.join(REPO_ROOT, "scripts", file), ...args],
    { cwd: REPO_ROOT, env: process.env, encoding: "utf8" },
  );
  assert.equal(r.status, 0, r.stderr || r.stdout);
  return r.stdout;
};
try {
  db = await getDb();
  if (db.mode === "postgres") {
    const r = await db.query("select to_regnamespace('registers') as existing");
    assert.equal(
      r[0].existing,
      null,
      "TEST_DATABASE_URL must point to a fresh disposable database",
    );
  }
  assert.equal((await migrate(db)).ran.length, 1);
  assert.equal((await migrate(db)).ran.length, 0);
  await seed(db);
  const count = async () =>
    (await db.query("select count(*)::int as n from registers.records"))[0].n;
  assert.equal(await count(), 8);
  const journalBefore = (
    await db.query("select count(*)::int as n from registers.audit")
  )[0].n;
  await seed(db);
  assert.equal(await count(), 8);
  assert.equal(
    (await db.query("select count(*)::int as n from registers.audit"))[0].n,
    journalBefore,
  );
  for (const cmd of Object.keys(READS)) {
    const o =
      cmd === "fields"
        ? { register: "Client services" }
        : cmd === "search"
          ? { text: "Kauri" }
          : cmd === "rollup"
            ? { register: "Client services", field: "Hours" }
            : cmd === "record"
              ? { record: "Participant interview 014" }
              : {};
    const data = await run(cmd, o);
    assert(data !== undefined, cmd);
    assert.equal(typeof render(data), "string");
  }
  const att = await run("attention");
  for (const issue of [
    "OVERDUE",
    "UNASSIGNED",
    "BLOCKED",
    "STALE",
    "RETENTION-REVIEW",
    "ACCURACY-REVIEW",
  ])
    assert(
      att.some((r) => r.issue === issue),
      issue,
    );
  assert.equal((await run("dependencies")).length, 2);
  assert.equal((await run("data-quality")).length, 1);
  assert.equal(
    (
      await run("rollup", { register: "Client services", field: "Hours" })
    ).reduce((s, r) => s + Number(r.total), 0),
    48,
  );
  await rejects(
    "rollup",
    { register: "Client services", field: "Client" },
    /number field/,
  );
  await rejects("record", { record: "Kauri" }, /Ambiguous/);
  await rejects("record", { record: "does not exist" }, /No matching/);
  assert.equal(
    (await run("record", { record: "pArTiCiPaNt InTeRvIeW 014" })).record.owner,
    "Ben",
  );
  assert.equal(
    (await run("record", { record: "30000000-0000-4000-8000-000000000004" }))
      .record.title,
    "Participant interview 014",
  );
  const g = await run("add-register", {
    name: "Workshop",
    country: "AU",
    "personal-data": true,
    "app-entity": true,
    purpose: "Run booked research workshops",
  });
  await run("set-policy", {
    register: "Workshop",
    "review-days": 14,
    purpose: "Coordinate booked workshops and retain attendance evidence",
  });
  for (const f of [
    { name: "Hours", type: "number", required: true },
    { name: "Accepted", type: "boolean" },
    { name: "Review date", type: "date" },
    { name: "Band", type: "choice", options: '["small","large"]' },
  ])
    await run("add-field", { register: "Workshop", ...f });
  await rejects(
    "add-field",
    { register: "Workshop", name: "Bad choice", type: "choice", options: "[]" },
    /Choices/,
  );
  const r = await run("add", {
    register: "Workshop",
    title: "Wellington workshop",
    owner: "Mere",
    values:
      '{"Hours":2,"Accepted":false,"Review date":"2026-10-12","Band":"small"}',
  });
  await rejects(
    "add",
    { register: "Workshop", title: "Bad number", values: '{"Hours":"2"}' },
    /finite number/,
  );
  await rejects(
    "add",
    {
      register: "Workshop",
      title: "Bad date",
      values: '{"Review date":"2026-02-30"}',
    },
    /calendar date/,
  );
  await rejects(
    "add",
    { register: "Workshop", title: "Bad field", values: '{"Surprise":1}' },
    /Unknown field/,
  );
  await rejects(
    "add",
    { register: "Workshop", title: "Bad choice", values: '{"Band":"tiny"}' },
    /allowed choices/,
  );
  const updated = await run("update", {
    record: r.id,
    values: '{"Hours":3}',
    due: "2026-10-20",
    "retain-until": "2026-12-01",
  });
  assert.equal(updated.values.Hours, 3);
  assert.equal(updated.values.Accepted, false);
  assert(updated.updated_at >= r.updated_at);
  await rejects(
    "update",
    { record: r.id, due: "2026-02-31" },
    /Invalid calendar/,
  );
  await run("log", {
    record: r.id,
    note: "Coordinator confirmed attendance privately.",
  });
  assert.equal((await run("record", { record: r.id })).notes.length, 1);
  await run("link", {
    record: r.id,
    to: "Kauri customer report",
    kind: "depends-on",
  });
  await rejects(
    "link",
    { record: "Kauri source reconciliation", to: r.id, kind: "depends-on" },
    /cycle/,
  );
  await rejects(
    "set-status",
    { record: r.id, status: "done" },
    /incomplete dependencies/,
  );
  await rejects(
    "set-status",
    { record: "Kauri follow-up", status: "done" },
    /Required field/,
  );
  await run("set-status", {
    record: "Kauri source reconciliation",
    status: "done",
  });
  await run("set-status", { record: "Kauri customer report", status: "done" });
  await run("set-status", { record: r.id, status: "done" });
  await rejects(
    "set-status",
    { record: "Kauri customer report", status: "active" },
    /Reopen completed dependents/,
  );
  await rejects(
    "link",
    { record: r.id, to: "Harbour transcript sign-off", kind: "depends-on" },
    /Reopen/,
  );
  await rejects(
    "update",
    { record: r.id, values: '{"Hours":null}' },
    /Required/,
  );
  await rejects(
    "set-status",
    { record: r.id, status: "nonsense" },
    /check constraint/,
  );
  await run("review", {
    record: "Participant interview 014",
    note: "Participant confirmed details.",
  });
  assert(
    !(await run("compliance")).some(
      (r) =>
        r.title === "Participant interview 014" && r.rule === "ACCURACY-REVIEW",
    ),
  );
  await rejects(
    "review",
    { record: r.id, note: "bad date", next: "2000-01-01" },
    /after today/,
  );
  await run("hold", {
    record: "Participant interview 008",
    held: true,
    reason: "Documented dispute preservation review",
  });
  assert(
    !(await run("compliance")).some(
      (r) =>
        r.title === "Participant interview 008" &&
        r.rule === "RETENTION-REVIEW",
    ),
  );
  assert(
    (await run("retention-review")).some(
      (r) => r.title === "Participant interview 008" && r.legal_hold,
    ),
  );
  await run("hold", {
    record: "Participant interview 008",
    held: false,
    reason: "Preservation review ended",
  });
  assert(
    (await run("compliance")).some(
      (r) =>
        r.title === "Participant interview 008" &&
        r.rule === "RETENTION-REVIEW",
    ),
  );
  const au = await run("add", {
    register: "Workshop",
    title: "AU privacy review",
    owner: "Mere",
    values: '{"Hours":0}',
  });
  assert(
    (await run("compliance")).some(
      (r) => r.title === au.title && r.basis === "AU APP 11.2",
    ),
  );
  await run("set-policy", { register: "Workshop", "app-entity": false });
  assert(
    !(await run("compliance")).some(
      (r) => r.title === au.title && r.basis === "AU APP 11.2",
    ),
  );
  // Import guarantees: rollback includes register/field creation, no row duplication, controlled updates.
  const imp = {
    _pos: ["airtable"],
    file: fixture,
    register: "Imported client work",
    "id-column": "Record ID",
    "title-column": "Name",
    "owner-column": "Owner",
    "due-column": "Due date",
    "status-column": "Status",
  };
  const before = await count();
  const dry = await run("import", { ...imp, "dry-run": true });
  assert.equal(dry.added, 2);
  assert.equal(await count(), before);
  assert.equal(
    (
      await db.query(
        "select * from registers.registers where name='Imported client work'",
      )
    ).length,
    0,
  );
  const imported = await run("import", imp);
  assert.equal(imported.added, 2);
  assert.equal((await run("import", imp)).unchanged, 2);
  assert.equal(await count(), before + 2);
  const importedRecord = (
    await run("record", { record: "Quarterly insight report" })
  ).record;
  assert.equal(importedRecord.owner, "Aroha");
  assert.equal(
    importedRecord.values.Notes,
    "First interview complete, awaiting review",
  );
  assert(importedRecord.values.Attachments.includes("example.invalid"));
  assert(
    (
      await run("record", { record: "Interview schedule" })
    ).record.values.Notes.includes("\n"),
  );
  const changed = path.join(tmp, "changed.csv");
  fs.writeFileSync(
    changed,
    fs
      .readFileSync(fixture, "utf8")
      .replace("First interview complete", "Interview corrected"),
  );
  await rejects("import", { ...imp, file: changed }, /Source changed/);
  await run("update", { record: importedRecord.id, owner: "Local owner" });
  assert.equal(
    (await run("import", { ...imp, file: changed, update: true })).updated,
    1,
  );
  assert.equal(
    (await run("record", { record: importedRecord.id })).record.owner,
    "Local owner",
  );
  const bad = path.join(tmp, "bad.csv");
  fs.writeFileSync(bad, "Name,Due\nFirst,2026-10-20\nSecond,not-a-date\n");
  const b = await count();
  await rejects(
    "import",
    {
      _pos: ["airtable"],
      file: bad,
      register: "Rollback me",
      "due-column": "Due",
    },
    /Invalid calendar/,
  );
  assert.equal(await count(), b);
  assert.equal(
    (
      await db.query(
        "select * from registers.registers where name='Rollback me'",
      )
    ).length,
    0,
  );
  fs.writeFileSync(bad, "Name,Hours\nDuplicate,1\nDuplicate,2\n");
  await rejects(
    "import",
    { _pos: ["airtable"], file: bad, register: "Duplicate CSV" },
    /duplicate import key/,
  );
  assert.throws(() => parseCsv("Name,Name\na,b"), /unique/);
  assert.throws(() => parseCsv("Name,Other\na"), /expected 2/);
  assert.throws(() => parseCsv('Name\n"unterminated'), /unclosed/);
  assert.equal(
    parseCsv('\uFEFFName,Note\r\n"Kōwhai","a ""quote"""\r\n')[0].Note,
    'a "quote"',
  );
  await rejects(
    "add",
    { register: "Workshop", title: "No actor", actor: "" },
    /Missing --actor/,
  );
  await assert.rejects(
    () => db.query("update registers.audit set actor='tampered'"),
    /append-only/,
  );
  const ex = path.join(tmp, "export.json");
  await run("export", { out: ex });
  const backup = JSON.parse(fs.readFileSync(ex));
  assert.equal(backup.records.length, await count());
  assert.equal(backup.format, "business-registers/v1");
  assert(backup.links.length >= 3);
  assert(backup.audit.length > 20);
  await rejects("export", { out: ex }, /EEXIST/);
  for (const [cmd, o] of [
    ["weekly-review", {}],
    ["draft-handover", { record: r.id }],
  ]) {
    const d = await run(cmd, o);
    assert(fs.readFileSync(d.file, "utf8").includes("Draft only"));
  }
  await run("help");
  assert.deepEqual(
    [...seen].sort(),
    Object.keys(HELP).sort(),
    "every command exercised",
  );
  assert.deepEqual(
    parse(["records", "--register", "Client services", "--json"]).o,
    { register: "Client services", json: true, _pos: [] },
  );
  assert.throws(() => date("2026-02-29"), /Invalid/);
  await db.close();
  db = null;
  const json = JSON.parse(child("registers.mjs", ["records", "--json"]));
  assert(json.length > 8);
  const err = spawnSync(
    process.execPath,
    [
      path.join(REPO_ROOT, "scripts/registers.mjs"),
      "record",
      "--record=Participant",
    ],
    { env: process.env, encoding: "utf8" },
  );
  assert.equal(err.status, 1);
  assert(err.stderr.includes("Ambiguous"));
  assert(err.stderr.includes("30000000-"));
  child("view.mjs");
  child("docs.mjs");
  const view = fs.readFileSync(path.join(tmp, "views/week.html"), "utf8");
  assert(view.includes("Harbour Research"));
  assert(!view.includes("<form"));
  assert(fs.readdirSync(path.join(tmp, "docs-out/record-handover")).length > 8);
  // Output escapes data before placing it in HTML.
  const { esc } = await import("./lib/render.mjs");
  assert.equal(esc("<script>"), "&lt;script&gt;");
  console.log(
    `PASS: ${seen.size} CLI commands; repeatable migration/seed, transactions, dependency rules, typed values, privacy scopes, CSV edge cases, export, drafts and branded HTML.`,
  );
} finally {
  if (db) await db.close();
  fs.rmSync(tmp, { recursive: true, force: true });
}
