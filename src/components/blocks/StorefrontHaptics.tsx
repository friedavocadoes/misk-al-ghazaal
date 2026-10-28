"use client";
import { useEffect } from "react";
import { WebHaptics } from "web-haptics";
import { connectHaptics,HAPTIC_PATTERNS,hapticsEnabled,type HapticKind } from "@/lib/haptics";
import { installIOSHapticTaps, needsIOSHapticTap } from "@/lib/ios-haptic-taps";

export function StorefrontHaptics(){
 useEffect(()=>{
  const engine=new WebHaptics({debug:false,showSwitch:false});
  const iosDirectTap=typeof navigator!=="undefined"&&needsIOSHapticTap(navigator);
  const disconnectIOS=installIOSHapticTaps(()=>{
   try{return hapticsEnabled(localStorage.getItem("misk-haptics"),matchMedia("(prefers-reduced-motion: reduce)").matches);}catch{return false;}
  });
  let lastTouch=0,lastFeedback=0;
  const play=(kind:HapticKind)=>{
   const now=Date.now();let preference:string|null=null;
   // iOS native ticks come from actual switch taps, never duplicate synthetic patterns.
   if(iosDirectTap)return;
   try{preference=localStorage.getItem("misk-haptics");}catch{}
   if(document.hidden||now-lastTouch>60000||(now-lastFeedback<65&&!["order","success","error"].includes(kind))||!hapticsEnabled(preference,matchMedia("(prefers-reduced-motion: reduce)").matches))return;
   lastFeedback=now;void engine.trigger(HAPTIC_PATTERNS[kind]).catch(()=>{});
  };
  const disconnect=connectHaptics(play);
  const pointer=(event:PointerEvent)=>{if(event.isTrusted&&(event.pointerType==="touch"||event.pointerType==="pen"))lastTouch=Date.now();};
  // Bubble after React handlers: explicit business feedback wins over a generic tick.
  const click=(event:MouseEvent)=>{
   if(!event.isTrusted||!(event.target instanceof Element))return;
   if((event as MouseEvent&{pointerType?:string}).pointerType==="touch")lastTouch=Date.now();
   const target=event.target.closest<HTMLElement>("[data-haptic],button,a[href],[role=tab],[role=radio],[role=switch],input[type=checkbox],input[type=radio]");
   if(target?.closest('label[for^="web-haptics-"]'))return;
   if(!target||target.closest('[data-haptic="none"]')||target.matches(":disabled,[aria-disabled=true]"))return;
   const requested=target.dataset.haptic;
   if(requested&&Object.hasOwn(HAPTIC_PATTERNS,requested))play(requested as HapticKind);
   else play(target.matches('[role=tab],[role=radio],[role=switch],input[type=checkbox],input[type=radio]')?"selection":"tick");
  };
  const change=(event:Event)=>{if(event.isTrusted&&event.target instanceof HTMLSelectElement)play("selection");else if(event.isTrusted&&event.target instanceof HTMLInputElement&&event.target.type==="range")play("step");};
  const stop=()=>{try{engine.cancel();}catch{}};
  const visibility=()=>{if(document.hidden)stop();};
  window.addEventListener("pointerdown",pointer,{capture:true,passive:true});document.addEventListener("click",click);document.addEventListener("change",change);
  document.addEventListener("visibilitychange",visibility);window.addEventListener("pagehide",stop);window.addEventListener("haptics-preference",stop);
  return()=>{disconnectIOS();disconnect();engine.destroy();window.removeEventListener("pointerdown",pointer,true);document.removeEventListener("click",click);document.removeEventListener("change",change);document.removeEventListener("visibilitychange",visibility);window.removeEventListener("pagehide",stop);window.removeEventListener("haptics-preference",stop);};
 },[]);
 return null;
}
