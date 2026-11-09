import { readFile, readdir, writeFile } from "node:fs/promises";

const directory = new URL("../supabase/", import.meta.url);
const manifest = JSON.parse(await readFile(new URL("bootstrap-order.json", directory), "utf8"));
const args = process.argv.slice(2);
const demo = args.includes("--with-demo");
const list = args.includes("--list");
const output = args.indexOf("--output");
const destination = output === -1 ? undefined : args[output + 1];

if ((output !== -1 && (!destination || destination.startsWith("-") || list)) ||
    args.some((arg, index) => (output === -1 || index !== output + 1) && !["--with-demo", "--list", "--output"].includes(arg))) {
  console.error("Usage: node scripts/build-supabase-bootstrap.mjs [--with-demo] [--list | --output FILE]");
  process.exit(1);
}

const known = [...manifest.migrations, ...manifest.catalogData];
const actual = (await readdir(directory)).filter((name) => /^migration_.*\.sql$/.test(name));
if (new Set(known).size !== known.length || known.length !== actual.length ||
    actual.some((name) => !known.includes(name))) {
  throw new Error("Update supabase/bootstrap-order.json to cover each migration exactly once.");
}

const steps = [manifest.schema, ...(demo ? [manifest.demoSeed] : []), ...manifest.migrations];
if (list) {
  console.log(steps.map((name, index) => `${String(index + 1).padStart(2, "0")}. supabase/${name}`).join("\n"));
} else {
  const statements = await Promise.all(steps.map(async (name, index) =>
    `-- Step ${index + 1}: supabase/${name}\n${(await readFile(new URL(name, directory), "utf8")).trimEnd()}\n`
  ));
  const sql = `-- Fresh Supabase projects only. Stop on the first error.\n\n${statements.join("\n")}`;
  if (destination) await writeFile(destination, sql, { flag: "wx" });
  else process.stdout.write(sql);
}
