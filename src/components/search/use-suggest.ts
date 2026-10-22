"use client";

import { useEffect, useState } from "react";
import { createSearchIndex, type SearchDocument } from "@/lib/search-index";
type Index=ReturnType<typeof createSearchIndex>;
const indexes=new Map<string,{at:number; promise:Promise<Index>}>();
function load(scope:"store"|"admin") {
  const hit=indexes.get(scope);
  if(hit && Date.now()-hit.at<60_000)return hit.promise;
  const promise=fetch(`/api/search/index?scope=${scope}`,{cache:"no-cache"}).then(async r=>{
    if(!r.ok)throw new Error("Search unavailable");
    const body=await r.json() as {items:SearchDocument[]};
    return createSearchIndex(body.items);
  }).catch(error=>{indexes.delete(scope);throw error;});
  indexes.set(scope,{at:Date.now(),promise});
  return promise;
}
/** Download one compact catalog, then search locally without a request per key. */
export function useSuggest(query:string, scope:"store"|"admin"="store") {
  const [state,setState]=useState<{query:string;items:SearchDocument[];loading:boolean;error:boolean}>({query:"",items:[],loading:false,error:false});
  useEffect(()=>{ void load(scope).catch(()=>{}); },[scope]);
  useEffect(()=>{
    let current=true;
    const trimmed=query.trim();
    if(trimmed.length<2)return;
    // Microtask keeps ready-index keystrokes immediate and avoids effects resetting state synchronously.
    void load(scope).then(engine=>{if(current)setState({query,items:engine.search(trimmed,8),loading:false,error:false});})
      .catch(()=>{if(current)setState({query,items:[],loading:false,error:true});});
    return ()=>{current=false;};
  },[query,scope]);
  if(query.trim().length<2)return {items:[],loading:false,error:false};
  return state.query===query ? state : {items:[],loading:true,error:false};
}

const MAX_RECENTS = 6;

export function getRecents(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(arr) ? arr.filter((s): s is string => typeof s === "string").slice(0, MAX_RECENTS) : [];
  } catch {
    return [];
  }
}

export function pushRecent(key: string, q: string) {
  const clean = q.trim();
  if (clean.length < 2) return;
  try {
    localStorage.setItem(key, JSON.stringify([clean, ...getRecents(key).filter((s) => s !== clean)].slice(0, MAX_RECENTS)));
  } catch {
    /* private mode — recents just don't persist */
  }
}
