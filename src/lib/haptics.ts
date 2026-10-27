import type { Vibration } from "web-haptics";
export const HAPTIC_PATTERNS = {
 tick:[{duration:8,intensity:.25}], selection:[{duration:12,intensity:.32}],
 open:[{duration:12,intensity:.3},{delay:36,duration:9,intensity:.18}],
 close:[{duration:9,intensity:.2}], step:[{duration:10,intensity:.3},{delay:24,duration:7,intensity:.18}],
 add:[{duration:12,intensity:.3},{delay:45,duration:14,intensity:.4}],
 // Two accents, not a continuous buzz: lift and landing of the 1.25s flight.
 flight:[{duration:12,intensity:.3},{delay:1222,duration:16,intensity:.4}],
 success:[{duration:16,intensity:.35},{delay:45,duration:22,intensity:.5}],
 error:[{duration:13,intensity:.35},{delay:55,duration:13,intensity:.35}],
 order:[{duration:24,intensity:.5},{delay:70,duration:35,intensity:.75},{delay:105,duration:18,intensity:.35}],
} satisfies Record<string,Vibration[]>;
export type HapticKind=keyof typeof HAPTIC_PATTERNS;
type Sink=(kind:HapticKind)=>void;
let sink:Sink|null=null;
/** No provider/device support means a silent no-op, never a blocked action. */
export function haptic(kind:HapticKind){try{sink?.(kind);}catch{/* Feedback must never break commerce. */}}
export function connectHaptics(next:Sink){sink=next;return()=>{if(sink===next)sink=null;};}
export function hapticsEnabled(preference:string|null,reducedMotion:boolean){return preference!=="off"&&(preference==="on"||!reducedMotion);}
