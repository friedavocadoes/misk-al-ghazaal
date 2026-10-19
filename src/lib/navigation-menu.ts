import { cache } from "react";
import { getLineups, getRituals, getNotes, getNoteUsage } from "@/lib/store";
import { getShopMenu, type ShopMenuColumn } from "@/lib/site";
import { tx } from "@/lib/i18n";
import type { Locale } from "@/i18n/routing";

export const getNavigationMenu = cache(async (locale: Locale): Promise<ShopMenuColumn[]> => {
  const [lineups, rituals, notes, counts] = await Promise.all([getLineups(), getRituals(), getNotes(), getNoteUsage()]);
  const popular = notes.slice().sort((a,b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0) || a.name.localeCompare(b.name)).slice(0,8);
  const ar = locale === "ar";
  return [
    { heading: ar ? "العطور" : "Fragrances", href: "/collection/all", links: [
      { label: ar ? "له" : "For Him", href: "/collection/for-him" },
      { label: ar ? "لها" : "For Her", href: "/collection/for-her" },
      ...lineups.map(l => ({ label: tx(l.title,l.titleAr,locale), href: `/collection/all?lineup=${encodeURIComponent(l.slug)}` })),
      ...rituals.map(r => ({ label: tx(r.title,r.titleAr,locale), href: `/collection/all?ritual=${encodeURIComponent(r.id)}` })),
    ] },
    { heading: ar ? "العائلات العطرية" : "Scent Family", href: "/find-your-scent", links: popular.map(n => ({ label: ar ? `عطور ${tx(n.name,n.nameAr,locale)}` : `${n.name} perfumes`, href: `/collection/all?note=${encodeURIComponent(n.slug)}` })) },
    getShopMenu(locale)[2],
  ];
});
