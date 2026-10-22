import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
export function Card({className,...props}:HTMLAttributes<HTMLDivElement>){return <div className={cn("rounded-xl border border-ink/10 bg-white text-ink shadow-sm",className)} {...props}/>;}
export function CardHeader({className,...props}:HTMLAttributes<HTMLDivElement>){return <div className={cn("p-5 pb-3",className)} {...props}/>;}
export function CardTitle({className,...props}:HTMLAttributes<HTMLHeadingElement>){return <h2 className={cn("text-base font-medium",className)} {...props}/>;}
export function CardContent({className,...props}:HTMLAttributes<HTMLDivElement>){return <div className={cn("p-5 pt-0",className)} {...props}/>;}
