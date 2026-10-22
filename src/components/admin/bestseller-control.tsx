"use client";
import { useState } from "react";
export function BestsellerControl({mode,checked,automatic,score}:{mode:string;checked:boolean;automatic:boolean;score:number}) {
  const [selected,setSelected]=useState(mode),[tag,setTag]=useState(checked);
  return <div className="space-y-2 border border-gold/20 bg-gold-wash/20 p-3">
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_best_seller" checked={tag} onChange={e=>{setTag(e.target.checked);setSelected(e.target.checked?"pinned":"excluded");}} className="accent-[#8a6d2f]"/>Best seller</label>
    <select name="bestseller_mode" value={selected} onChange={e=>{setSelected(e.target.value);setTag(e.target.value==="pinned"||(e.target.value==="auto"&&automatic));}} className="w-full border border-ink/15 bg-white px-2 py-2 text-xs" aria-label="Bestseller policy"><option value="auto">Automatic · follows customer demand</option><option value="pinned">Pinned · always a bestseller</option><option value="excluded">Excluded · never auto-tag</option></select>
    <p className="text-[11px] text-ink/55">Demand score {score.toFixed(1)} · 30-day activity, weighted toward recent interest.</p>
  </div>;
}
