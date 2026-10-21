"use client";
import type { ReactNode } from "react";
import type { Note, ProductNote } from "@/lib/types";
import type { Locale } from "@/i18n/routing";
import { tx } from "@/lib/i18n";
import { TooltipCard } from "@/components/ui/tooltip-card";
import { NoteGlyph } from "@/components/ui/note-glyphs";
export function NoteTooltip({ note, locale, children, className }: { note: Note & { kind?: ProductNote["kind"] }; locale: Locale; children: ReactNode; className?: string }) {
 const name = tx(note.name, note.nameAr, locale);
 const stages = locale === "ar" ? {top:"البداية",heart:"القلب",base:"القاعدة"} : {top:"Opening notes",heart:"Heart notes",base:"Base notes"};
 const fallback = locale === "ar" ? {top:"الانطباع الأول للعطر.",heart:"شخصية العطر في قلب التوليفة.",base:"النوتات التي تبقى معك."} : {top:"The first impression of the fragrance.",heart:"The character at the centre of the fragrance.",base:"The notes that linger with you."};
 return <TooltipCard content={<div className="note-tooltip-inner" dir={locale === "ar" ? "rtl" : "ltr"}>
   <div className="flex items-center gap-4"><span className="rounded-xl bg-sand/50 p-2"><NoteGlyph glyph={note.glyph} className="size-12" /></span><div><p className="text-[9px] uppercase tracking-widest text-gold">{note.kind ? stages[note.kind] : locale === "ar" ? "نوتة عطرية" : "Scent note"}</p><h4 className="mt-1 text-lg font-medium text-ink">{name}</h4></div></div>
   <p className="mt-4 text-xs leading-6 text-espresso">{tx(note.description ?? "", note.descriptionAr, locale) || (note.kind ? fallback[note.kind] : locale === "ar" ? "اكتشف هذه النوتة في العينة." : "Explore this scent in your sample.")}</p>
 </div>}><button type="button" aria-label={name} className={className}>{children}</button></TooltipCard>;
}
