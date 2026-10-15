"use client";

import { useMemo, useState } from "react";
import { ImageUploader } from "./image-uploader";

/** Promo composer: Write (toolbar-assisted rich textarea) ↔ HTML tabs,
    live phone/pc preview, artwork upload inserting <img> at cursor. */
export function PromoEditor({
  initialSubject,
  initialPreheader,
  initialHtml,
}: {
  initialSubject: string;
  initialPreheader: string;
  initialHtml: string;
}) {
  const [subject, setSubject] = useState(initialSubject);
  const [preheader, setPreheader] = useState(initialPreheader);
  const [html, setHtml] = useState(initialHtml);
  const [tab, setTab] = useState<"write" | "html">("write");
  const [view, setView] = useState<"pc" | "phone">("pc");

  const doc = useMemo(
    () =>
      `<!doctype html><html><body style="margin:0;background:#faf7f1;font-family:Georgia,serif;color:#1c1917"><div style="max-width:560px;margin:0 auto;padding:32px 24px"><p style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#8a6d2f;margin:0">Misk Al Ghazaal</p><h1 style="font-size:28px;font-weight:400;margin:12px 0 4px">${escapeHtml(subject) || "Your subject"}</h1><p style="font-size:13px;color:#78716c;margin:0 0 20px">${escapeHtml(preheader)}</p><div style="border-top:1px solid #e9e1d2;padding-top:20px;font-size:15px;line-height:1.7">${html}</div><p style="margin-top:28px;font-size:12px;color:#78716c">Misk Al Ghazaal Perfumes · Mamzar Centre, Dubai · <a href="#" style="color:#8a6d2f">Unsubscribe</a></p></div></body></html>`,
    [subject, preheader, html],
  );

  const wrap = (before: string, after = "") => {
    const el = document.getElementById("promo-body") as HTMLTextAreaElement | null;
    if (!el) {
      setHtml((h) => `${h}${before}${after}`);
      return;
    }
    const { selectionStart: s, selectionEnd: e, value } = el;
    const sel = value.slice(s, e) || "text";
    const next = `${value.slice(0, s)}${before}${sel}${after}${value.slice(e)}`;
    setHtml(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + before.length, s + before.length + sel.length);
    });
  };

  return (
    <div className="grid gap-4">
      <label className="block">
        Subject
        <input
          name="subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="mt-1 w-full border border-ink/20 px-3 py-2"
        />
      </label>
      <label className="block">
        Preheader (inbox preview line)
        <input
          name="preheader"
          value={preheader}
          onChange={(e) => setPreheader(e.target.value)}
          className="mt-1 w-full border border-ink/20 px-3 py-2"
        />
      </label>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex border border-ink/20">
          {(["write", "html"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setTab(m)}
              className={`cursor-pointer px-4 py-1.5 text-sm ${tab === m ? "bg-ink text-white" : "text-ink/60"}`}
            >
              {m === "write" ? "Write" : "HTML"}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          <button type="button" onClick={() => wrap("<strong>", "</strong>")} className="cursor-pointer border border-ink/20 px-2 py-1 text-sm font-bold" title="Bold">B</button>
          <button type="button" onClick={() => wrap("<em>", "</em>")} className="cursor-pointer border border-ink/20 px-2 py-1 text-sm italic" title="Italic">I</button>
          <button
            type="button"
            onClick={() => {
              const href = window.prompt("Link URL (https://…)", "https://");
              if (href) wrap(`<a href="${href}" style="color:#8a6d2f">`, "</a>");
            }}
            className="cursor-pointer border border-ink/20 px-2 py-1 text-sm underline"
            title="Link"
          >
            Link
          </button>
          <button type="button" onClick={() => wrap("<h2 style=\"font-size:20px;font-weight:400\">", "</h2>")} className="cursor-pointer border border-ink/20 px-2 py-1 text-sm" title="Heading">H</button>
          <button type="button" onClick={() => wrap("<p>", "</p>")} className="cursor-pointer border border-ink/20 px-2 py-1 text-sm" title="Paragraph">¶</button>
        </div>
        <ImageUploader
          bucket="promo"
          prefix="promo"
          onUploaded={(url) =>
            setHtml((h) => `${h}<p><img src="${url}" style="width:100%;display:block" alt="" /></p>`)
          }
        />
      </div>

      {tab === "write" ? (
        <textarea
          id="promo-body"
          value={html}
          onChange={(e) => setHtml(e.target.value)}
          rows={14}
          dir="ltr"
          className="w-full border border-ink/20 px-3 py-2 font-mono text-[13px]"
        />
      ) : (
        <textarea
          name="body_html"
          value={html}
          onChange={(e) => setHtml(e.target.value)}
          rows={14}
          dir="ltr"
          className="w-full border border-ink/20 bg-ink px-3 py-2 font-mono text-[13px] text-green-200"
        />
      )}
      {/* Write-tab still posts the body under the expected field name. */}
      {tab === "write" && <input type="hidden" name="body_html" value={html} />}

      <div>
        <div className="flex items-center gap-2">
          <p className="text-xs uppercase tracking-[0.16em] text-ink/50">Preview</p>
          <div className="flex border border-ink/20">
            {(["pc", "phone"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setView(m)}
                className={`cursor-pointer px-3 py-1 text-xs ${view === m ? "bg-ink text-white" : "text-ink/60"}`}
              >
                {m === "pc" ? "PC" : "Phone"}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-2 flex justify-center border border-ink/10 bg-sand/40 p-4">
          <iframe
            title="promo preview"
            srcDoc={doc}
            className="border border-ink/20 bg-white"
            style={{ width: view === "pc" ? 560 : 320, height: 520 }}
          />
        </div>
      </div>
    </div>
  );
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
