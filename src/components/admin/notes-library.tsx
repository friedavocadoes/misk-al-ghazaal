"use client";
import { useState, type ReactNode } from "react";
import { NoteGlyph } from "@/components/ui/note-glyphs";
import { AdminForm, ActionButton } from "./admin-form";

export function NotesLibrary({
  notes,
  editors,
  bulkAction,
  quickAction,
}: {
  notes: {
    id: string;
    name: string;
    name_ar?: string | null;
    slug: string;
    glyph: string | null;
    is_active?: boolean;
  }[];
  editors: ReactNode[];
  bulkAction: (fd: FormData) => Promise<void>;
  quickAction: (fd: FormData) => Promise<void>;
}) {
  const [query, setQuery] = useState(""),
    [status, setStatus] = useState("all"),
    [selected, setSelected] = useState<string[]>([]),
    [editing, setEditing] = useState<string | null>(null);
  const visible = notes.filter(
    (n) =>
      `${n.name} ${n.name_ar ?? ""} ${n.slug}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (status === "all" || (n.is_active !== false) === (status === "active")),
  );
  return (
    <div className="mt-6 space-y-5">
      <details className="rounded-xl border bg-white p-5">
        <summary className="cursor-pointer font-medium">
          Quick add several notes
        </summary>
        <p className="my-3 text-xs text-fog">
          One name per line. Slugs are generated automatically. Add artwork and
          definitions afterwards.
        </p>
        <AdminForm action={quickAction} resetOnSuccess success="Notes added">
          <textarea
            name="names"
            required
            rows={5}
            aria-label="New note names"
            placeholder={"Vetiver\nPink pepper\nNeroli"}
            className="w-full rounded border p-3"
          />
          <ActionButton className="mt-3">Create notes</ActionButton>
        </AdminForm>
      </details>
      <div className="flex flex-wrap items-center gap-3">
        <input
          aria-label="Search notes"
          placeholder="Search notes…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="min-w-48 flex-1 rounded-lg border bg-white p-3"
        />
        <select
          aria-label="Note status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border bg-white p-3"
        >
          <option value="all">All notes</option>
          <option value="active">Enabled</option>
          <option value="disabled">Disabled</option>
        </select>
        <span className="text-sm text-fog">{visible.length} notes</span>
      </div>
      <AdminForm
        action={async (fd) => {
          await bulkAction(fd);
          setSelected([]);
        }}
        success="Library updated"
        className="flex flex-wrap items-center gap-3 rounded-lg border bg-white p-3"
      >
        {selected.map((id) => (
          <input key={id} type="hidden" name="ids" value={id} />
        ))}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={
              visible.length > 0 &&
              visible.every((n) => selected.includes(n.id))
            }
            onChange={(e) =>
              setSelected(
                e.target.checked
                  ? [...new Set([...selected, ...visible.map((n) => n.id)])]
                  : selected.filter((id) => !visible.some((n) => n.id === id)),
              )
            }
          />
          Select visible
        </label>
        <span className="text-xs text-fog">{selected.length} selected</span>
        <select
          name="operation"
          aria-label="Bulk action"
          className="rounded border p-2"
        >
          <option value="disable">Disable</option>
          <option value="enable">Enable</option>
          <option value="delete">Delete permanently</option>
        </select>
        <ActionButton
          disabled={!selected.length}
          onClick={(e) => {
            const form = e.currentTarget.form;
            if (
              form &&
              new FormData(form).get("operation") === "delete" &&
              !confirm(
                "Permanently delete selected notes and their product assignments?",
              )
            )
              e.preventDefault();
          }}
        >
          Apply
        </ActionButton>
      </AdminForm>
      {!visible.length && (
        <p className="py-12 text-center text-fog">No matching notes.</p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {visible.map((n) => (
          <article
            key={n.id}
            className={`rounded-xl border bg-white p-4 ${editing === n.id ? "col-span-full" : ""}`}
          >
            <div className="flex items-start justify-between">
              <input
                type="checkbox"
                aria-label={`Select ${n.name}`}
                checked={selected.includes(n.id)}
                onChange={(e) =>
                  setSelected(
                    e.target.checked
                      ? [...selected, n.id]
                      : selected.filter((id) => id !== n.id),
                  )
                }
              />
              <span className="text-xs text-fog">
                {n.is_active === false ? "Disabled" : "Enabled"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setEditing(editing === n.id ? null : n.id)}
              className="flex w-full flex-col items-center gap-3 py-5"
            >
              <NoteGlyph glyph={n.glyph} className="size-16" />
              <strong>{n.name}</strong>
              <small className="text-fog">{n.slug}</small>
              <span className="text-xs underline">
                {editing === n.id ? "Close editor" : "Edit note"}
              </span>
            </button>
            {editing === n.id && (
              <div className="border-t pt-4">
                {editors[notes.findIndex((note) => note.id === n.id)]}
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
