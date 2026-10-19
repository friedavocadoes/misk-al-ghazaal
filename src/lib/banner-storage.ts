import type { SupabaseClient } from "@supabase/supabase-js";

/** Remove only unreferenced banner artwork, including references kept in the bin. */
export async function cleanupBannerArt(db: SupabaseClient, urls: string[]) {
  for (const url of new Set(urls.filter(Boolean))) {
    const [primary, fallback] = await Promise.all([
      db.from("banners").select("id", { count: "exact", head: true }).eq("src", url),
      db.from("banners").select("id", { count: "exact", head: true }).eq("fallback", url),
    ]);
    if (primary.error || fallback.error) throw primary.error || fallback.error;
    if (primary.count || fallback.count) continue;
    const { data: users, error: readError } = await db.from("homepage_sections").select("config");
    if (readError) throw readError;
    if (JSON.stringify(users).includes(url)) continue;
    const path = url.split("/storage/v1/object/public/banners/")[1]?.split("?")[0];
    if (path) {
      const { error: failure } = await db.storage.from("banners").remove([decodeURIComponent(path)]);
      if (failure) throw failure;
    }
  }
}
