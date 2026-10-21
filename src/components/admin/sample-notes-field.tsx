"use client";
import { useState } from "react";
export function SampleNotesField({
  notes,
  selected,
}: {
  notes: { id: string; name: string }[];
  selected: string[];
}) {
  const [query, setQuery] = useState("");
  const [ids, setIds] = useState(selected);
  return (
    <fieldset className="rounded border p-4">
      <legend>Fragrance notes · {ids.length} selected</legend>
      <input
        aria-label="Search fragrance notes"
        placeholder="Search notes…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mb-3 w-full border p-2"
      />
      {ids.map((id) => (
        <input key={id} type="hidden" name="note_ids" value={id} />
      ))}
      <div className="grid max-h-60 gap-2 overflow-auto sm:grid-cols-2">
        {notes
          .filter((n) => n.name.toLowerCase().includes(query.toLowerCase()))
          .map((n) => (
            <label key={n.id} className="flex gap-2 p-2">
              <input
                type="checkbox"
                checked={ids.includes(n.id)}
                onChange={(e) =>
                  setIds(
                    e.target.checked
                      ? [...ids, n.id]
                      : ids.filter((id) => id !== n.id),
                  )
                }
              />
              {n.name}
            </label>
          ))}
      </div>
      <p className="mt-3 text-xs text-fog">
        Select as many notes as you need from the library.
      </p>
    </fieldset>
  );
}
