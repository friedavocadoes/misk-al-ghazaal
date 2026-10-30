"use client";
/* eslint-disable @next/next/no-img-element -- Admin source-artwork previews, lazy loaded. */
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Reorder, useDragControls, MotionConfig } from "motion/react";
import {
  ArrowDown,
  ArrowUp,
  Film,
  GripVertical,
  Loader2,
  Pencil,
  Power,
  Search,
  Trash2,
} from "lucide-react";
import {
  type AdminBanner,
  BANNER_PLACEMENTS,
  bannerIsVideo,
} from "@/lib/banner-config";
import { toast } from "./admin-form";
import {
  setBannerEnabled,
  reorderBanners,
  moveToBin,
} from "@/app/admin/banners/actions";

function BannerRow({
  row,
  index,
  total,
  locked,
  canDrag,
  onDragEnd,
  onMove,
  onToggle,
  onDelete,
}: {
  row: AdminBanner;
  index: number;
  total: number;
  locked: boolean;
  canDrag: boolean;
  onDragEnd: () => void;
  onMove: (direction: number) => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const controls = useDragControls();
  const thumb = bannerIsVideo(row.src) ? row.fallback : row.src;
  return (
    <Reorder.Item
      value={row}
      dragListener={false}
      dragControls={controls}
      onDragEnd={onDragEnd}
      layout="position"
      className={`banner-list-row ${row.is_active ? "" : "is-disabled"}`}
    >
      <button
        type="button"
        className="banner-drag-handle"
        disabled={locked || !canDrag}
        aria-label={`Drag ${row.title || "banner"} to reorder`}
        onPointerDown={(e) => {
          if (!locked && canDrag) controls.start(e);
        }}
      >
        <GripVertical size={19} />
      </button>
      <span className="banner-order" title="Display order">
        {row.sort}
      </span>
      <Link
        href={`/admin/banners/${row.id}`}
        className="banner-row-thumb"
        tabIndex={-1}
        aria-hidden="true"
      >
        {thumb ? (
          <img src={thumb} alt="" loading="lazy" draggable={false} />
        ) : (
          <Film size={24} />
        )}
      </Link>
      <div className="banner-row-content">
        <Link href={`/admin/banners/${row.id}`} className="banner-row-title">
          {row.title || "Untitled banner"}
        </Link>
        <div className="banner-row-labels">
          <span className={`banner-state ${row.is_active ? "is-live" : ""}`}>
            {row.is_active ? "Enabled" : "Disabled"}
          </span>
          <span>{bannerIsVideo(row.src) ? "Video" : "Image"}</span>
          <span>
            {row.mobile_src
              ? "Separate mobile artwork"
              : "Same artwork on all screens"}
          </span>
        </div>
        <p title={row.href || ""}>{row.href || "No destination link"}</p>
      </div>
      <div className="banner-row-actions">
        <div className="banner-move-buttons">
          <button
            type="button"
            disabled={locked || !canDrag || index === 0}
            onClick={() => onMove(-1)}
            aria-label={`Move ${row.title || "banner"} up`}
          >
            <ArrowUp size={14} />
          </button>
          <button
            type="button"
            disabled={locked || !canDrag || index === total - 1}
            onClick={() => onMove(1)}
            aria-label={`Move ${row.title || "banner"} down`}
          >
            <ArrowDown size={14} />
          </button>
        </div>
        <button
          type="button"
          className="banner-quiet"
          disabled={locked}
          onClick={onToggle}
        >
          <Power size={14} />
          {row.is_active ? "Disable" : "Enable"}
        </button>
        <Link className="banner-quiet" href={`/admin/banners/${row.id}`}>
          <Pencil size={14} />
          <span>Edit</span>
        </Link>
        <button
          className="banner-delete"
          type="button"
          disabled={locked}
          onClick={onDelete}
          aria-label={`Delete ${row.title || "banner"}`}
        >
          <Trash2 size={15} />
        </button>
      </div>
    </Reorder.Item>
  );
}

export function BannerWorkspace({
  initialRows,
  slot,
}: {
  initialRows: AdminBanner[];
  slot: AdminBanner["slot"];
}) {
  const router = useRouter(),
    [rows, setRows] = useState(initialRows),
    [query, setQuery] = useState(""),
    [pending, setPending] = useState(false);
  const latest = useRef(initialRows),
    confirmed = useRef(initialRows),
    lock = useRef(false);
  function update(next: AdminBanner[]) {
    latest.current = next;
    setRows(next);
  }
  const visible = rows.filter((row) =>
    `${row.title || ""} ${row.title_ar || ""} ${row.href || ""}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  async function persistOrder(next: AdminBanner[]) {
    if (lock.current || query.trim()) return;
    const old = confirmed.current,
      ids = next.map((row) => row.id);
    if (ids.join() === old.map((row) => row.id).join()) return;
    lock.current = true;
    setPending(true);
    update(next.map((row, i) => ({ ...row, sort: i + 1 })));
    try {
      await reorderBanners(
        slot,
        ids,
        old.map((row) => row.id),
      );
      confirmed.current = latest.current;
      toast("Banner order saved");
      router.refresh();
    } catch (e) {
      update(old);
      toast(e instanceof Error ? e.message : "Could not save order", "bad");
      router.refresh();
    } finally {
      lock.current = false;
      setPending(false);
    }
  }
  async function toggle(row: AdminBanner) {
    if (lock.current) return;
    lock.current = true;
    setPending(true);
    const old = latest.current;
    update(
      old.map((r) => (r.id === row.id ? { ...r, is_active: !r.is_active } : r)),
    );
    try {
      await setBannerEnabled(row.id, !row.is_active);
      confirmed.current = latest.current;
      toast(row.is_active ? "Banner disabled" : "Banner enabled");
      router.refresh();
    } catch (e) {
      update(old);
      toast(
        e instanceof Error ? e.message : "Could not update visibility",
        "bad",
      );
    } finally {
      lock.current = false;
      setPending(false);
    }
  }
  async function remove(row: AdminBanner) {
    if (
      lock.current ||
      !confirm(
        slot === "navigation"
          ? "Permanently delete this menu banner and its unused artwork?"
          : "Move this banner to the recycle bin?",
      )
    )
      return;
    lock.current = true;
    setPending(true);
    try {
      const form = new FormData();
      form.set("id", row.id);
      await moveToBin(form);
      update(latest.current.filter((r) => r.id !== row.id));
      confirmed.current = latest.current;
      toast("Banner removed");
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not remove banner", "bad");
    } finally {
      lock.current = false;
      setPending(false);
    }
  }
  return (
    <section className="banner-workspace-panel">
      <div className="banner-list-toolbar">
        <div>
          <h2>{BANNER_PLACEMENTS[slot].label}</h2>
          <p>
            {rows.filter((r) => r.is_active).length} enabled ·{" "}
            {rows.filter((r) => !r.is_active).length} disabled
          </p>
        </div>
        <label className="banner-search">
          <Search size={16} />
          <input
            aria-label="Search banners in this placement"
            value={query}
            disabled={pending}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search this placement…"
          />
        </label>
      </div>
      <div className="banner-order-help" role="status" aria-live="polite">
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Saving changes…
          </>
        ) : query.trim() ? (
          "Clear search to rearrange banners."
        ) : (
          "Drag the handle to rearrange. Order numbers save automatically. Arrow buttons work with keyboard or touch."
        )}
      </div>
      {visible.length ? (
        <MotionConfig reducedMotion="user">
          <Reorder.Group
            axis="y"
            values={rows}
            onReorder={(next) => {
              if (!lock.current && !query.trim()) update(next);
            }}
            className="banner-order-list"
          >
            {visible.map((row) => (
              <BannerRow
                key={row.id}
                row={row}
                index={rows.findIndex((r) => r.id === row.id)}
                total={rows.length}
                locked={pending}
                canDrag={!query.trim()}
                onDragEnd={() => void persistOrder(latest.current)}
                onMove={(direction) => {
                  const next = [...rows],
                    i = next.findIndex((r) => r.id === row.id);
                  [next[i], next[i + direction]] = [
                    next[i + direction],
                    next[i],
                  ];
                  void persistOrder(next);
                }}
                onToggle={() => void toggle(row)}
                onDelete={() => void remove(row)}
              />
            ))}
          </Reorder.Group>
        </MotionConfig>
      ) : (
        <div className="banner-empty">
          <Film size={28} />
          <h3>
            {query ? "No matching banners" : "No banners in this placement"}
          </h3>
          <p>
            {query
              ? "Try another heading or destination."
              : "Add artwork to get started. Other banner types stay in their own tabs."}
          </p>
        </div>
      )}
    </section>
  );
}
