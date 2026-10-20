"use client";
import { useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { TextStyleKit } from "@tiptap/extension-text-style";
import TextAlign from "@tiptap/extension-text-align";
import { SafeImage } from "@/components/ui/safe-image";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { TableKit } from "@tiptap/extension-table";
import { AdminForm, ActionButton } from "./admin-form";
import { ImageUploader } from "./image-uploader";
import { saveBlog } from "@/app/admin/blogs/actions";
type Fields = {
  id?: string;
  title?: string;
  slug?: string;
  category_id?: string;
  content_html?: string;
  excerpt?: string;
  image?: string;
  mobile_image?: string;
  image_alt?: string;
  author?: string;
  published?: boolean;
  meta_title?: string;
  meta_description?: string;
};
export function BlogEditor({
  post = {},
  categories,
}: {
  post?: Fields;
  categories: { id: string; name: string }[];
}) {
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState(post.title || "");
  const [slug, setSlug] = useState(post.slug || "");
  const manual = useRef(!!post.id);
  const [image, setImage] = useState(post.image || "");
  const [mobile, setMobile] = useState(post.mobile_image || "");
  const [separate, setSeparate] = useState(!!post.mobile_image);
  const [html, setHtml] = useState(post.content_html || "");
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      TableKit,
      TextStyleKit,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    immediatelyRender: false,
    content: post.content_html || "",
    onUpdate: ({ editor }) => setHtml(editor.getHTML()),
  });
  const cls = "mt-1 w-full rounded border border-ink/20 bg-white p-3";
  return (
    <AdminForm action={saveBlog} className="space-y-7">
      <fieldset disabled={uploading} className="space-y-7">
        <input type="hidden" name="id" value={post.id || ""} />
        <div className="grid gap-5 md:grid-cols-2">
          <label>
            Title
            <input
              required
              name="title"
              value={title}
              className={cls}
              onChange={(e) => {
                setTitle(e.target.value);
                if (!manual.current)
                  setSlug(
                    e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9\u0600-\u06ff]+/g, "-")
                      .replace(/^-|-$/g, ""),
                  );
              }}
            />
          </label>
          <label>
            URL slug
            <input
              required
              name="slug"
              value={slug}
              className={cls}
              onChange={(e) => {
                manual.current = true;
                setSlug(e.target.value);
              }}
            />
          </label>
          <label>
            Category
            <select
              required
              name="category_id"
              defaultValue={post.category_id}
              className={cls}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Author
            <input
              name="author"
              defaultValue={post.author || "Misk Al Ghazaal"}
              className={cls}
            />
          </label>
        </div>
        <label className="block">
          Excerpt
          <textarea
            name="excerpt"
            defaultValue={post.excerpt}
            className={cls}
          />
        </label>
        <section className="rounded-xl border border-ink/10 bg-white p-5">
          <h2 className="mb-4 text-xl">Cover images</h2>
          <p className="mb-4 text-xs text-fog">
            Desktop: 1600 × 800. Mobile: 900 × 1100. Uploads convert to WebP.
          </p>
          <input type="hidden" name="image" value={image} />
          <ImageUploader
            onBusyChange={setUploading}
            bucket="blogs"
            prefix="cover"
            onUploaded={setImage}
          />
          {image && (
            <div className="mt-3">
              <SafeImage
                src={image}
                fallback=""
                alt="Cover preview"
                width={480}
                height={240}
                className="mb-3 max-h-48 w-full object-contain"
              />
              <span className="break-all text-xs">{image}</span>
              <button
                type="button"
                onClick={() => setImage("")}
                className="ms-3 text-red-700"
              >
                Remove image
              </button>
            </div>
          )}
          <label className="my-5 block">
            <input
              type="checkbox"
              name="separate"
              checked={separate}
              onChange={(e) => setSeparate(e.target.checked)}
            />{" "}
            Use a separate mobile cover
          </label>
          <input type="hidden" name="mobile_image" value={mobile} />
          {separate && (
            <>
              <ImageUploader
                onBusyChange={setUploading}
                bucket="blogs"
                prefix="mobile"
                onUploaded={setMobile}
              />
              {mobile && (
                <div>
                  <SafeImage
                    src={mobile}
                    fallback=""
                    alt="Mobile cover preview"
                    width={180}
                    height={220}
                    className="my-3 h-48 w-auto object-contain"
                  />
                  <button type="button" onClick={() => setMobile("")}>
                    Remove mobile cover
                  </button>
                </div>
              )}
            </>
          )}
          <label className="mt-5 block">
            Image description (alt text)
            <input
              name="image_alt"
              defaultValue={post.image_alt}
              className={cls}
            />
          </label>
        </section>
        <section>
          <h2 className="mb-3 text-xl">Blog content</h2>
          <p className="mb-3 text-xs text-fog">
            Paste from Word or Google Docs. Headings, lists, links, emphasis and
            tables are preserved. Use H2/H3 for the automatic table of contents.
          </p>
          <div className="flex flex-wrap gap-2 border border-ink/10 bg-white p-3">
            {[
              "Bold",
              "Italic",
              "Underline",
              "Left",
              "Center",
              "Right",
              "H2",
              "H3",
              "Bullet list",
              "Numbered list",
              "Quote",
              "Link",
              "Table",
              "Undo",
              "Redo",
            ].map((label) => (
              <button
                className="rounded border border-ink/15 px-3 py-2 text-xs"
                type="button"
                key={label}
                onClick={() => {
                  if (!editor) return;
                  const c = editor.chain().focus();
                  if (label === "Bold") c.toggleBold().run();
                  else if (label === "Italic") c.toggleItalic().run();
                  else if (label === "Underline") c.toggleUnderline().run();
                  else if (["Left", "Center", "Right"].includes(label))
                    c.setTextAlign(label.toLowerCase()).run();
                  else if (label === "H2" || label === "H3")
                    c.toggleHeading({ level: label === "H2" ? 2 : 3 }).run();
                  else if (label === "Bullet list") c.toggleBulletList().run();
                  else if (label === "Numbered list")
                    c.toggleOrderedList().run();
                  else if (label === "Quote") c.toggleBlockquote().run();
                  else if (label === "Table")
                    c.insertTable({
                      rows: 3,
                      cols: 3,
                      withHeaderRow: true,
                    }).run();
                  else if (label === "Link") {
                    const href = prompt(
                      "Link URL",
                      editor.getAttributes("link").href || "https://",
                    );
                    if (href !== null) {
                      if (!href) c.unsetLink().run();
                      else if (/^https?:\/\//i.test(href))
                        c.setLink({ href }).run();
                    }
                  } else if (label === "Undo") c.undo().run();
                  else c.redo().run();
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <EditorContent
            editor={editor}
            className="blog-prose min-h-80 border border-ink/10 bg-white p-6 [&_.tiptap]:min-h-72 [&_.tiptap]:outline-none"
          />
          <input type="hidden" name="content_html" value={html} />
          <div className="mt-3">
            <ImageUploader
              onBusyChange={setUploading}
              bucket="blogs"
              prefix="inline"
              onUploaded={(src) =>
                editor
                  ?.chain()
                  .focus()
                  .setImage({
                    src,
                    alt: prompt("Describe this image (alt text)") || "",
                  })
                  .run()
              }
            />
          </div>
        </section>
        <section className="rounded-xl border border-ink/10 p-5">
          <h2 className="mb-4 text-xl">SEO metadata</h2>
          <label className="block">
            Meta title
            <input
              name="meta_title"
              defaultValue={post.meta_title}
              className={cls}
            />
          </label>
          <label className="mt-4 block">
            Meta description
            <textarea
              name="meta_description"
              defaultValue={post.meta_description}
              className={cls}
            />
          </label>
          <p className="mt-3 text-xs text-fog">
            Blank fields use the title and excerpt. Canonical URL, social cards,
            BlogPosting schema and breadcrumb schema are generated
            automatically.
          </p>
        </section>
        <label className="block">
          <input
            type="checkbox"
            name="published"
            defaultChecked={post.published}
          />{" "}
          Publish this blog (unchecked saves a draft)
        </label>
        <ActionButton>
          {uploading ? "Uploading image…" : "Save blog"}
        </ActionButton>
      </fieldset>
    </AdminForm>
  );
}
