import { redirect, notFound } from "next/navigation";
import { getAdminSession } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminForm, ActionButton } from "@/components/admin/admin-form";
import { deleteBlog } from "../actions";
import { BlogEditor } from "@/components/admin/blog-editor";
export default async function Edit({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const s = await getAdminSession(true);
  if (!s || !["super_admin", "content_editor"].includes(s.role))
    redirect("/admin/login");
  const { id } = await params;
  const db = await createClient();
  const { data: categories } = await db
    .from("blog_categories")
    .select("id,name")
    .order("name");
  const { data: post } =
    id === "new"
      ? { data: null }
      : await db.from("blog_posts").select("*").eq("id", id).single();
  if (id !== "new" && !post) notFound();
  return (
    <>
      <AdminNav email={s.email} role={s.role} />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="mb-8 text-3xl">{post ? "Edit blog" : "New blog"}</h1>
        {categories?.length ? (
          <BlogEditor post={post || undefined} categories={categories} />
        ) : (
          <p>Create a category in Blogs before adding a post.</p>
        )}
        {post && (
          <details className="mt-10 border-t border-ink/10 pt-6">
            <summary className="cursor-pointer text-red-700">
              Delete blog
            </summary>
            <p className="my-4 text-sm">
              Permanently remove this blog and its unshared uploaded images?
            </p>
            <AdminForm action={deleteBlog}>
              <input type="hidden" name="id" value={id} />
              <ActionButton danger>Delete blog permanently</ActionButton>
            </AdminForm>
          </details>
        )}
      </main>
    </>
  );
}
