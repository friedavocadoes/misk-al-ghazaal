"use server";
import sharp from "sharp";
import { cleanupBannerArt } from "@/lib/banner-storage";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { revalidateHome } from "@/lib/revalidate";
import { logAdmin } from "@/lib/audit";
import {
  isBannerPlacement,
  bannerIsVideo,
  BANNER_PLACEMENTS,
} from "@/lib/banner-config";
const text = (fd: FormData, k: string) =>
  String(fd.get(k) ?? "").trim() || null;
function refresh(id?: string) {
  revalidatePath("/admin/banners");
  if (id) revalidatePath(`/admin/banners/${id}`);
  else revalidatePath("/admin/banners/[id]", "page");
  revalidateHome();
}
function validMediaUrl(url: string) {
  return /^(\/(?!\/)|https:\/\/)/.test(url);
}

export async function setBannerEnabled(id: string, enabled: boolean) {
  const session = await getAdminSession();
  if (session?.role !== "super_admin") throw new Error("Not authorized");
  if (typeof enabled !== "boolean") throw new Error("Invalid visibility");
  const db = await createClient();
  const { data, error } = await db
    .from("banners")
    .update({ is_active: enabled })
    .eq("id", id)
    .is("deleted_at", null)
    .select("id,title,slot")
    .single();
  if (error || !data) throw new Error(error?.message || "Banner not found");
  await logAdmin(db, session, {
    category: "banners",
    action: "update",
    entity: "banner",
    entityId: id,
    summary: `${enabled ? "Enabled" : "Disabled"} banner “${data.title || "Untitled"}”`,
    details: { is_active: enabled, slot: data.slot },
  });
  refresh(id);
}

export async function reorderBanners(
  slot: string,
  ids: string[],
  expected: string[],
) {
  const session = await getAdminSession();
  if (session?.role !== "super_admin") throw new Error("Not authorized");
  if (
    !isBannerPlacement(slot) ||
    !Array.isArray(ids) ||
    !Array.isArray(expected) ||
    ids.length > 1000 ||
    ids.some((id) => typeof id !== "string")
  )
    throw new Error("Invalid banner order");
  const db = await createClient();
  const { error } = await db.rpc("reorder_banners", {
    p_slot: slot,
    p_ids: ids,
    p_expected: expected,
  });
  if (error) throw new Error(error.message);
  await logAdmin(db, session, {
    category: "banners",
    action: "update",
    entity: "banner_order",
    summary: `Reordered ${slot} banners`,
    details: { slot, ids },
  });
  refresh();
}

export async function saveBanner(form: FormData) {
  const session = await getAdminSession();
  if (session?.role !== "super_admin") throw new Error("Not authorized");
  const id = String(form.get("id") || "");
  const db = await createClient();
  // Ordering/visibility/media are independent controls; saving copy cannot overwrite them.
  const { data: row, error: readError } = await db
    .from("banners")
    .select("slot")
    .eq("id", id)
    .is("deleted_at", null)
    .single();
  if (readError || !row) throw new Error("Banner not found");
  const { error } = await db
    .from("banners")
    .update({
      alt: text(form, "alt") || "",
      title: text(form, "title"),
      title_ar: text(form, "title_ar"),
      eyebrow: text(form, "eyebrow"),
      eyebrow_ar: text(form, "eyebrow_ar"),
      desc: text(form, "desc"),
      desc_ar: text(form, "desc_ar"),
      cta: text(form, "cta"),
      cta_ar: text(form, "cta_ar"),
      href: text(form, "href"),
      fit: form.get("fit") === "contain" ? "contain" : "cover",
      focal: text(form, "focal"),
    })
    .eq("id", id)
    .is("deleted_at", null);
  if (error) throw new Error(error.message);
  await logAdmin(db, session, {
    category: "banners",
    action: "update",
    entity: "banner",
    entityId: id,
    summary: `Updated banner “${text(form, "title") || "Untitled"}”`,
    details: { slot: row.slot },
  });
  refresh(id);
}

export async function saveBannerMedia(
  id: string,
  device: "desktop" | "mobile",
  src: string,
  poster: string,
) {
  const session = await getAdminSession();
  if (session?.role !== "super_admin") throw new Error("Not authorized");
  if (
    !["desktop", "mobile"].includes(device) ||
    (!src && device === "desktop") ||
    [src, poster].some((url) => url && !validMediaUrl(url))
  )
    throw new Error("Invalid banner artwork");
  const db = await createClient();
  const { data: before, error: readError } = await db
    .from("banners")
    .select("slot,src,fallback,mobile_src,mobile_fallback")
    .eq("id", id)
    .is("deleted_at", null)
    .single();
  if (readError || !before) throw new Error("Banner not found");
  if (before.slot !== "hero" && bannerIsVideo(src))
    throw new Error("This placement supports images only.");
  const { error } = await db
    .from("banners")
    .update(
      device === "mobile"
        ? { mobile_src: src, mobile_fallback: poster }
        : { src, fallback: poster },
    )
    .eq("id", id)
    .is("deleted_at", null);
  if (error) throw new Error(error.message);
  await logAdmin(db, session, {
    category: "banners",
    action: "update",
    entity: "banner_artwork",
    entityId: id,
    summary: `Updated ${device} banner artwork`,
    details: { device, slot: before.slot },
  });
  refresh(id);
  try {
    await cleanupBannerArt(
      db,
      device === "mobile"
        ? [before.mobile_src, before.mobile_fallback]
        : [before.src, before.fallback],
    );
  } catch {
    console.error("Banner saved; unused artwork cleanup failed", {
      id,
      device,
    });
  }
}
export async function createBanner(formData: FormData) {
  const s = await getAdminSession();
  if (s?.role !== "super_admin") throw new Error("Not authorized");
  const supabase = await createClient();
  const slot = formData.get("slot");
  if (!isBannerPlacement(slot) || !BANNER_PLACEMENTS[slot].enabled)
    throw new Error("Choose a banner placement.");
  let src = String(formData.get("src") ?? "").trim();
  if (!src || !validMediaUrl(src))
    throw new Error("Upload banner artwork first.");
  if (slot !== "hero" && bannerIsVideo(src))
    throw new Error("This placement supports images only.");
  const separate = formData.get("separate_mobile") === "on";
  const mobile = String(formData.get("mobile_src") ?? "").trim();
  if (separate && (!mobile || !validMediaUrl(mobile)))
    throw new Error(
      "Upload the separate mobile artwork or choose the same artwork.",
    );
  if (slot !== "hero" && bannerIsVideo(mobile))
    throw new Error("This placement supports images only.");
  const { data: last, error: orderError } = await supabase
    .from("banners")
    .select("sort")
    .eq("slot", slot)
    .is("deleted_at", null)
    .order("sort", { ascending: false })
    .limit(1);
  if (orderError) throw new Error(orderError.message);

  const heroId = String(formData.get("hero_id") ?? "");
  if (heroId && formData.get("slot") === "navigation") {
    const { data: hero, error: lookupError } = await supabase
      .from("banners")
      .select("src")
      .eq("id", heroId)
      .eq("slot", "hero")
      .is("deleted_at", null)
      .single();
    if (lookupError || !hero) throw new Error("Hero image not found.");
    let bytes: Buffer;
    const path = hero.src.split("/storage/v1/object/public/banners/")[1];
    if (path) {
      const { data, error } = await supabase.storage
        .from("banners")
        .download(decodeURIComponent(path));
      if (error || !data) throw new Error("Could not copy hero artwork.");
      bytes = Buffer.from(await data.arrayBuffer());
    } else if (hero.src.startsWith("/") && !hero.src.includes("..")) {
      const { readFile } = await import("node:fs/promises");
      const { join } = await import("node:path");
      bytes = await readFile(join(process.cwd(), "public", hero.src));
    } else
      throw new Error(
        "Upload this hero artwork directly to create a menu banner.",
      );
    const output = await sharp(bytes, { limitInputPixels: 40_000_000 })
      .rotate()
      .webp({ lossless: true })
      .toBuffer();
    const copyPath = `navigation-${crypto.randomUUID()}.webp`;
    const { error } = await supabase.storage
      .from("banners")
      .upload(copyPath, output, { contentType: "image/webp" });
    if (error) throw error;
    src = supabase.storage.from("banners").getPublicUrl(copyPath)
      .data.publicUrl;
  }
  const { error } = await supabase.from("banners").insert({
    slot: String(formData.get("slot") ?? "hero"),
    sort: (last?.[0]?.sort ?? 0) + 1,
    is_active: formData.get("is_active") !== "false",
    src,
    mobile_src:
      formData.get("separate_mobile") === "on"
        ? String(formData.get("mobile_src") || "")
        : "",
    mobile_fallback:
      formData.get("separate_mobile") === "on"
        ? String(formData.get("mobile_fallback") || "")
        : "",
    fallback: text(formData, "fallback") ?? "",
    alt: String(formData.get("alt") ?? formData.get("title") ?? "Banner"),
    title: text(formData, "title"),
    title_ar: text(formData, "title_ar"),
    eyebrow: text(formData, "eyebrow"),
    eyebrow_ar: text(formData, "eyebrow_ar"),
    desc: text(formData, "desc"),
    desc_ar: text(formData, "desc_ar"),
    cta: text(formData, "cta"),
    cta_ar: text(formData, "cta_ar"),
    href: text(formData, "href"),
    fit: formData.get("fit") === "contain" ? "contain" : "cover",
    focal: text(formData, "focal"),
  });
  if (error)
    throw new Error(
      error.code === "23514"
        ? "Enable navigation banners by applying supabase/migration_navigation_banners.sql in Supabase SQL Editor."
        : error.message,
    );
  await logAdmin(supabase, s, {
    category: "banners",
    action: "create",
    entity: "banner",
    label: `[${String(formData.get("slot") ?? "hero")}] ${String(formData.get("title") ?? "")}`,
    summary: `Created banner “${String(formData.get("title") ?? "untitled")}” (${formData.get("slot")})`,
    details: {
      slot: String(formData.get("slot") ?? "hero"),
      title: String(formData.get("title") ?? ""),
    },
  });
  refresh();
}

export async function moveToBin(formData: FormData) {
  const s = await getAdminSession();
  if (s?.role !== "super_admin") throw new Error("Not authorized");
  const supabase = await createClient();
  const { data: doomed, error: readError } = await supabase
    .from("banners")
    .select("slot, title, src, fallback, mobile_src, mobile_fallback")
    .eq("id", String(formData.get("id")))
    .single();
  if (readError || !doomed) throw new Error("Banner not found");
  const d = (doomed ?? {}) as { slot?: string; title?: string | null };
  if (doomed?.slot === "navigation") {
    const { error } = await supabase
      .from("banners")
      .delete()
      .eq("id", String(formData.get("id")));
    if (error) throw error;
    refresh();
    await logAdmin(supabase, s, {
      category: "banners",
      action: "delete",
      entity: "banner",
      entityId: String(formData.get("id")),
      summary: "Deleted menu banner and unused artwork",
    });
    try {
      await cleanupBannerArt(supabase, [
        doomed.src,
        doomed.fallback,
        doomed.mobile_src,
        doomed.mobile_fallback,
      ]);
    } catch {
      console.error("Banner deleted; unused artwork cleanup failed", {
        id: String(formData.get("id")),
      });
    }
    return;
  }
  const { error } = await supabase
    .from("banners")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", String(formData.get("id")));
  if (error) throw new Error(error.message);
  await logAdmin(supabase, s, {
    category: "banners",
    action: "delete",
    entity: "banner",
    entityId: String(formData.get("id")),
    label: d.title ?? `[${d.slot ?? "?"}]`,
    summary: `Moved banner “${d.title ?? String(formData.get("id"))}” to the bin`,
    details: { id: String(formData.get("id")), slot: d.slot ?? null },
  });
  refresh();
}
