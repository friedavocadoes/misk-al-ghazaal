"use client";
import { ArrowUpRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { tx } from "@/lib/i18n";
import type { ProductNote } from "@/lib/types";
import type { Locale } from "@/i18n/routing";
import { NoteTooltip } from "./NoteTooltip";
export function NoteDiscovery({ notes, locale }: { notes: ProductNote[]; locale: Locale }) {
 if (!notes.length) return null;
 const order = ["top", "heart", "base"] as const;
 const label = locale === "ar" ? {top:"البداية",heart:"القلب",base:"القاعدة"} : {top:"Top",heart:"Heart",base:"Base"};
 return <div data-lens-sharp className="note-discovery">
  <div className="note-discovery-heading"><span>{locale === "ar" ? "النوتات العطرية" : "Notes at a glance"}</span><Link href="#fragrance-notes">{locale === "ar" ? "التوليفة كاملة" : "Full composition"}<ArrowUpRight size={13}/></Link></div>
  <div className="brief-note-lines">{order.map(kind => { const items=notes.filter(n=>n.kind===kind); return items.length ? <div key={kind}><span className="brief-note-tier">{label[kind]}</span><div className="brief-note-group">{items.map(n=><NoteTooltip key={`${n.id}-${kind}`} note={n} locale={locale} className="brief-note-trigger"><span className="brief-note-color" style={{backgroundColor:n.color}}/><span>{tx(n.name,n.nameAr,locale)}</span></NoteTooltip>)}</div></div>:null; })}</div>
 </div>;
}
