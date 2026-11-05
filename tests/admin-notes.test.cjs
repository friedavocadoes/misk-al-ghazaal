const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const source = fs.readFileSync("src/app/admin/notes/page.tsx", "utf8");
const ast = ts.createSourceFile(
  "page.tsx",
  source,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);
const functions = ast.statements
  .filter(
    (n) =>
      ts.isFunctionDeclaration(n) &&
      ["quickNotes", "bulkNotes"].includes(n.name?.text),
  )
  .map((n) => n.getText(ast))
  .join("\n");
const js = ts.transpileModule(functions, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
  },
}).outputText;
function fixture({ readError, writeError, denied = false } = {}) {
  const calls = [];
  const sb = {
    from(table) {
      const query = {
        select() {
          return query;
        },
        insert(rows) {
          calls.push(["insert", rows]);
          return Promise.resolve({ error: writeError });
        },
        delete() {
          calls.push(["delete"]);
          return query;
        },
        update(values) {
          calls.push(["update", values]);
          return query;
        },
        in(column, ids) {
          calls.push(["filter", table, column, ids]);
          return Promise.resolve({
            data:
              table === "notes"
                ? [{ id: "a", glyph: "/glyph.webp" }]
                : [{ product_id: "p" }],
            error: readError || writeError,
          });
        },
      };
      return query;
    },
  };
  const actions = new Function(
    "staff",
    "logAdmin",
    "refreshNotes",
    "purgeUnused",
    "DEFAULT_NOTE_GLYPH",
    `${js};return {quickNotes,bulkNotes}`,
  )(
    async () => {
      if (denied) throw Error("Forbidden");
      return { session: {}, sb };
    },
    async () => calls.push(["audit"]),
    async (_sb, ids) => calls.push(["refresh", ids]),
    async (_sb, glyph) => calls.push(["purge", glyph]),
    "/default.webp",
  );
  return { ...actions, calls };
}
test("batch creation generates slugs and inserts all names in one operation", async () => {
  const f = fixture(),
    fd = new FormData();
  fd.set("names", "Pink pepper\nNéroli\nAmber\nMusk\nOud");
  await f.quickNotes(fd);
  assert.deepEqual(
    f.calls.find((c) => c[0] === "insert")[1].map((n) => n.slug),
    ["pink-pepper", "neroli", "amber", "musk", "oud"],
  );
  assert.equal(f.calls.filter((c) => c[0] === "insert").length, 1);
  assert(f.calls.some((c) => c[0] === "audit"));
});
test("duplicate generated slugs fail before writing", async () => {
  const f = fixture(),
    fd = new FormData();
  fd.set("names", "Pink Pepper\npink-pepper");
  await assert.rejects(f.quickNotes(fd), /distinct/);
  assert.equal(f.calls.length, 0);
});
test("database duplicate errors preserve input and never report a refresh success", async () => {
  const f = fixture({ writeError: { code: "23505", message: "duplicate" } }),
    fd = new FormData();
  fd.set("names", "Amber");
  await assert.rejects(f.quickNotes(fd), /No notes were added/);
  assert(!f.calls.some((c) => c[0] === "refresh"));
});
test("bulk disable deduplicates IDs and retains assignments", async () => {
  const f = fixture(),
    fd = new FormData();
  fd.append("ids", "a");
  fd.append("ids", "a");
  fd.set("operation", "disable");
  await f.bulkNotes(fd);
  assert.deepEqual(f.calls.find((c) => c[0] === "update")[1], {
    is_active: false,
  });
  assert(!f.calls.some((c) => c[0] === "delete"));
  assert.deepEqual(f.calls.find((c) => c[0] === "refresh")[1], ["p"]);
  assert(
    f.calls.filter((c) => c[0] === "filter").every((c) => c[3].length === 1),
  );
});
test("bulk deletion cleans unreferenced glyphs only after a successful delete", async () => {
  const f = fixture(),
    fd = new FormData();
  fd.append("ids", "a");
  fd.set("operation", "delete");
  await f.bulkNotes(fd);
  assert(
    f.calls.findIndex((c) => c[0] === "delete") <
      f.calls.findIndex((c) => c[0] === "purge"),
  );
  assert.deepEqual(f.calls.find((c) => c[0] === "purge")[1], "/glyph.webp");
});
test("authorization failures prevent any database operation", async () => {
  const f = fixture({ denied: true }),
    fd = new FormData();
  fd.set("names", "Amber");
  await assert.rejects(f.quickNotes(fd), /Forbidden/);
  await assert.rejects(f.bulkNotes(fd), /Forbidden/);
  assert.equal(f.calls.length, 0);
});
test("bulk actions reject empty selections", async () => {
  const f = fixture(),
    fd = new FormData();
  fd.set("operation", "disable");
  await assert.rejects(f.bulkNotes(fd), /Select/);
  assert.equal(f.calls.length, 0);
});
