const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
function load(file, mocks) {
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }).outputText,
    { exports, require: (n) => (n in mocks ? mocks[n] : require(n)), process },
  );
  return exports;
}
const blogs = load("src/lib/blogs.ts", {
  "server-only": {},
  react: { cache: (f) => f },
  "./supabase/public": {},
});
test("blog paste sanitation preserves semantic formatting and removes executable content", () => {
  const html = blogs.cleanBlog(
    '<h2>Notes</h2><p><strong>Bold</strong> and <em>italic</em></p><table><tr><td>A</td></tr></table><script>alert(1)</script><img src="https://example.com/a.webp" onerror="evil()"><a href="javascript:evil()">Bad</a>',
  );
  assert.match(html, /<strong>Bold/);
  assert.match(html, /<table>/);
  assert.doesNotMatch(html, /script|onerror|javascript/);
});
test("duplicate headings get unique stable contents anchors and body H1 becomes H2", () => {
  const { content, toc } = blogs.blogContent(
    "<h1>Notes</h1><h2>Notes</h2><h3>Heart</h3>",
  );
  assert.equal(toc.length, 3);
  assert.equal(new Set(toc.map((x) => x.id)).size, 3);
  assert.doesNotMatch(content, /<h1/);
  assert.match(content, /id="section-3"/);
});
test("content editors are denied ordinary admin entry points and allowed only explicit content entry points", async () => {
  const a = load("src/lib/admin-auth.ts", {
    "@/lib/supabase/keys": { isSupabaseConfigured: () => true },
    "@/lib/supabase/server": {
      createClient: async () => ({
        auth: {
          getUser: async () => ({
            data: { user: { id: "editor", email: "editor@example.com" } },
          }),
        },
        from: () => ({
          select: () => ({
            eq: () => ({
              single: async () => ({ data: { role: "content_editor" } }),
            }),
          }),
        }),
      }),
    },
  });
  assert.equal(await a.getAdminSession(), null);
  assert.equal((await a.getAdminSession(true)).role, "content_editor");
  assert.equal(a.canManageCatalog("content_editor"), false);
});

test("styled pasted headings retain formatting and enter the contents list", () => {
  const { content, toc } = blogs.blogContent(
    '<h2 style="text-align:center">Discover</h2><h4>Details</h4>',
  );
  assert.equal(toc.length, 2);
  assert.match(content, /style="text-align:center"/);
  assert.match(content, /id="section-1"/);
});
