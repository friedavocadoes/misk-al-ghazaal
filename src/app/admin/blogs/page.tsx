import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminForm, ActionButton } from "@/components/admin/admin-form";
import { saveCategory } from "./actions";
export default async function BlogsAdmin() {
  const s = await getAdminSession(true);
  if (!s || !["super_admin", "content_editor"].includes(s.role))
    redirect("/admin/login");
  const db = await createClient();
  const [{ data: posts, error }, { data: categories }] = await Promise.all([
    db
      .from("blog_posts")
      .select("id,title,published,slug,blog_categories(name)")
      .order("updated_at", { ascending: false }),
    db.from("blog_categories").select("*").order("name"),
  ]);
  return (
    <>
      <AdminNav email={s.email} role={s.role} />
      <main className="mx-auto max-w-5xl space-y-8 px-6 py-10">
        <div className="flex justify-between">
          <h1 className="text-3xl">Blogs</h1>
          <Link
            href="/admin/blogs/new"
            className="rounded bg-ink px-5 py-3 text-white"
          >
            New blog
          </Link>
        </div>
        {error && (
          <p role="alert">
            Apply migration_blogs.sql to enable the blog publishing system.
          </p>
        )}
        <details className="rounded-xl border border-ink/10 bg-white p-5">
          <summary className="cursor-pointer">
            Categories ({categories?.length || 0})
          </summary>
          <ul className="my-5 space-y-2">
            {categories?.map((c) => (
              <li key={c.id}>
                {c.name} <span className="text-xs text-fog">/{c.slug}</span>
              </li>
            ))}
          </ul>
          <AdminForm action={saveCategory} className="flex flex-wrap gap-3">
            <input
              name="name"
              required
              placeholder="Category name"
              className="border p-3"
            />
            <input
              name="slug"
              placeholder="Slug (auto if blank)"
              className="border p-3"
            />
            <ActionButton>Create category</ActionButton>
          </AdminForm>
        </details>
        <ul className="divide-y border border-ink/10 bg-white">
          {posts?.map((p) => (
            <li key={p.id}>
              <Link
                href={`/admin/blogs/${p.id}`}
                className="flex justify-between gap-4 p-5"
              >
                <span>{p.title}</span>
                <span className="text-xs text-fog">
                  {p.published ? "Published" : "Draft"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
