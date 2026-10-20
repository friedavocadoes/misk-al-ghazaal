"use client";

import { useState, type CSSProperties } from "react";
import { ArrowUpRight, Plus } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { NoteGlyph } from "@/components/ui/note-glyphs";
import { tx } from "@/lib/i18n";
import type { ProductNote } from "@/lib/types";
import type { Locale } from "@/i18n/routing";

export function NoteDiscovery({ notes, locale }: { notes: ProductNote[]; locale: Locale }) {
  const [selected, setSelected] = useState<string | null>(null);
  if (!notes.length) return null;
  const ar = locale === "ar";
  const stages = {
    top: [ar ? "البداية" : "Opening", ar ? "الانطباع الأول للعطر." : "The first impression of the fragrance."],
    heart: [ar ? "القلب" : "Heart", ar ? "شخصية العطر في قلب التوليفة." : "The character at the centre of the fragrance."],
    base: [ar ? "الأثر" : "Trail", ar ? "النوتات التي تبقى معك." : "The notes that linger with you."],
  };
  // One representative of each stage before filling remaining spaces.
  const featured = [...new Map([
    ...(["top", "heart", "base"] as const).flatMap(kind => notes.filter(n => n.kind === kind).slice(0, 1)),
    ...notes,
  ].map(n => [`${n.id}-${n.kind}`, n])).values()].slice(0, 3);
  const active = featured.find(n => `${n.id}-${n.kind}` === selected);
  return <div className="note-discovery">
    <div className="note-discovery-heading">
      <span>{ar ? "اكتشف التوليفة" : "Meet the notes"}</span>
      <Link href="#fragrance-notes">{ar ? "التوليفة كاملة" : "Full composition"} <ArrowUpRight size={13} /></Link>
    </div>
    <div className="note-discovery-tiles">
      {featured.map(n => {
        const key = `${n.id}-${n.kind}`;
        return <button key={key} type="button" aria-expanded={selected === key} aria-controls="note-discovery-detail"
          className="note-discovery-tile" data-active={selected === key}
          style={{ "--note-color": /^#[0-9a-f]{3,8}$/i.test(n.color) ? n.color : "#b29760" } as CSSProperties}
          onClick={() => setSelected(selected === key ? null : key)}>
          <span className="note-discovery-stage">{stages[n.kind][0]}</span>
          <NoteGlyph glyph={n.glyph} className="size-12 sm:size-14" />
          <span className="note-discovery-name">{tx(n.name, n.nameAr, locale)}</span>
          <Plus size={12} className="note-discovery-plus" />
        </button>;
      })}
    </div>
    <div id="note-discovery-detail" className="note-discovery-detail" aria-live="polite">
      {active ? <p key={selected}><strong>{tx(active.name, active.nameAr, locale)}</strong> — {tx(active.description ?? "", active.descriptionAr, locale) || stages[active.kind][1]}</p> :
        <p>{ar ? "المس نوتة لتتعرف عليها." : "Tap a note to explore its character."}</p>}
    </div>
  </div>;
}
