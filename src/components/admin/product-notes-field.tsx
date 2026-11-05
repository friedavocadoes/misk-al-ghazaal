"use client";
import { useEffect, useRef, useState } from "react";
type Assignment = { note_id: string; kind: string; position: number };
export function ProductNotesField({
  notes,
  initial,
}: {
  notes: {
    id: string;
    name: string;
    name_ar?: string | null;
    color: string;
    is_active?: boolean;
  }[];
  initial: Assignment[];
}) {
  const [query, setQuery] = useState(""),
    [picked, setPicked] = useState<string[]>([]),
    [assigned, setAssigned] = useState(initial);
  const root = useRef<HTMLDivElement>(null),
    previous = useRef(JSON.stringify(initial));
  useEffect(() => {
    const value = JSON.stringify(assigned);
    if (previous.current !== value) {
      previous.current = value;
      root.current
        ?.querySelector("input")
        ?.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }, [assigned]);
  const assign = (kind: string) => {
    setAssigned((old) => [
      ...old.filter((a) => !picked.includes(a.note_id)),
      ...picked.map((id, i) => ({
        note_id: id,
        kind,
        position: old.length + i,
      })),
    ]);
    setPicked([]);
  };
  const move = (id: string, direction: number) =>
    setAssigned((old) => {
      const item = old.find((a) => a.note_id === id);
      if (!item) return old;
      const tier = old
        .filter((a) => a.kind === item.kind)
        .sort((a, b) => a.position - b.position);
      const from = tier.findIndex((a) => a.note_id === id),
        to = from + direction;
      if (to < 0 || to >= tier.length) return old;
      [tier[from], tier[to]] = [tier[to], tier[from]];
      return old.map((a) =>
        a.kind === item.kind
          ? { ...a, position: tier.findIndex((t) => t.note_id === a.note_id) }
          : a,
      );
    });
  return (
    <div ref={root} className="space-y-4">
      <input
        type="hidden"
        name="note_ids"
        value={notes.map((n) => n.id).join(",")}
      />
      {assigned.map((a) => (
        <span key={a.note_id}>
          <input type="hidden" name={`kind_${a.note_id}`} value={a.kind} />
          <input type="hidden" name={`pos_${a.note_id}`} value={a.position} />
        </span>
      ))}
      <div className="grid gap-3 md:grid-cols-3">
        {["top", "heart", "base"].map((kind) => (
          <section key={kind} className="rounded-xl border bg-white p-4">
            <h3 className="mb-3 font-medium capitalize">
              {kind === "top" ? "Top · opening" : kind}{" "}
              <span className="text-fog">
                {assigned.filter((a) => a.kind === kind).length}
              </span>
            </h3>
            <div className="flex flex-wrap gap-2">
              {assigned
                .filter((a) => a.kind === kind)
                .sort((a, b) => a.position - b.position)
                .map((a) => (
                  <span
                    key={a.note_id}
                    className="flex items-center rounded-full border"
                  >
                    <button
                      type="button"
                      title="Remove note"
                      onClick={() =>
                        setAssigned((old) =>
                          old.filter((x) => x.note_id !== a.note_id),
                        )
                      }
                      className="rounded-full border px-3 py-2 text-xs"
                    >
                      {notes.find((n) => n.id === a.note_id)?.name} ×
                    </button>
                    <button
                      type="button"
                      aria-label={`Move ${notes.find((n) => n.id === a.note_id)?.name} earlier`}
                      onClick={() => move(a.note_id, -1)}
                      className="px-2 py-2"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      aria-label={`Move ${notes.find((n) => n.id === a.note_id)?.name} later`}
                      onClick={() => move(a.note_id, 1)}
                      className="px-2 py-2"
                    >
                      ↓
                    </button>
                  </span>
                ))}
            </div>
          </section>
        ))}
      </div>
      <input
        aria-label="Search product notes"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Find notes to assign…"
        className="w-full rounded-lg border p-3"
      />
      <div className="flex flex-wrap items-center gap-2">
        <span>{picked.length} selected</span>
        {["top", "heart", "base"].map((kind) => (
          <button
            key={kind}
            disabled={!picked.length}
            type="button"
            onClick={() => assign(kind)}
            className="rounded border bg-white px-4 py-2 disabled:opacity-40"
          >
            Assign to {kind}
          </button>
        ))}
      </div>
      <div className="grid max-h-72 gap-2 overflow-auto rounded-xl border p-3 sm:grid-cols-2 lg:grid-cols-3">
        {notes
          .filter(
            (n) =>
              `${n.name} ${n.name_ar ?? ""}`
                .toLowerCase()
                .includes(query.toLowerCase()) &&
              (n.is_active !== false ||
                assigned.some((a) => a.note_id === n.id)),
          )
          .map((n) => (
            <label
              key={n.id}
              className="flex items-center gap-2 rounded-lg border bg-white p-3"
            >
              <input
                type="checkbox"
                checked={picked.includes(n.id)}
                onChange={(e) =>
                  setPicked(
                    e.target.checked
                      ? [...picked, n.id]
                      : picked.filter((id) => id !== n.id),
                  )
                }
              />
              <span
                className="size-2 rounded-full"
                style={{ background: n.color }}
              />
              {n.name}
              <small className="ml-auto text-fog">
                {assigned.find((a) => a.note_id === n.id)?.kind}
              </small>
            </label>
          ))}
      </div>
    </div>
  );
}
