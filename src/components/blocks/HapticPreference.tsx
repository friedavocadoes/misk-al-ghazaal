"use client";
import { useSyncExternalStore } from "react";
import { hapticsEnabled } from "@/lib/haptics";
function enabled(){try{return hapticsEnabled(localStorage.getItem("misk-haptics"),matchMedia("(prefers-reduced-motion: reduce)").matches);}catch{return false;}}
function subscribe(callback:()=>void){window.addEventListener("haptics-preference",callback);window.addEventListener("storage",callback);return()=>{window.removeEventListener("haptics-preference",callback);window.removeEventListener("storage",callback);};}
export function HapticPreference({locale}:{locale:string}){
 const on=useSyncExternalStore(subscribe,enabled,()=>false);
 return <button type="button" data-haptic="none" aria-pressed={on} className="mx-3 mt-3 text-[10px] normal-case tracking-normal underline underline-offset-4" onClick={()=>{try{localStorage.setItem("misk-haptics",on?"off":"on");}catch{}window.dispatchEvent(new Event("haptics-preference"));}}>{locale==="ar"?`الاستجابة اللمسية: ${on?"مفعّلة":"متوقفة"}`:`Touch feedback: ${on?"On":"Off"}`}</button>;
}
