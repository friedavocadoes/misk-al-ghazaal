import * as React from "react";
import { cn } from "@/lib/utils";
export function Table({className,...props}:React.TableHTMLAttributes<HTMLTableElement>){return <div className="w-full overflow-x-auto"><table className={cn("w-full text-left text-xs",className)} {...props}/></div>;}
export function TableHeader(props:React.HTMLAttributes<HTMLTableSectionElement>){return <thead {...props}/>;}
export function TableBody(props:React.HTMLAttributes<HTMLTableSectionElement>){return <tbody {...props}/>;}
export function TableRow({className,...props}:React.HTMLAttributes<HTMLTableRowElement>){return <tr className={cn("border-b border-ink/10 transition hover:bg-sand/30",className)} {...props}/>;}
export function TableHead({className,...props}:React.ThHTMLAttributes<HTMLTableCellElement>){return <th className={cn("whitespace-nowrap p-3 font-medium text-fog",className)} {...props}/>;}
export function TableCell({className,...props}:React.TdHTMLAttributes<HTMLTableCellElement>){return <td className={cn("p-3",className)} {...props}/>;}
