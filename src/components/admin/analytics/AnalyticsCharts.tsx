"use client";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Report } from "@/lib/analytics/dashboard";
import { REASON_LABELS } from "@/lib/analytics/dashboard";
const GOLD="#a8874d",INK="#343e3d",BOT="#c7bdb0";
export function TimelineChart({report,previous,mode,bots}:{report:Report;previous:Report|null;mode:"viewers"|"revenue";bots:string}) {
 const data=report.daily.map((d,i)=>({day:d.day.slice(5),current:mode==="revenue"?d.revenue:bots==="only"?d.bots:bots==="all"?d.real+d.bots:d.real,previous:previous?.daily[i] ? mode==="revenue"?previous.daily[i].revenue:bots==="only"?previous.daily[i].bots:bots==="all"?previous.daily[i].real+previous.daily[i].bots:previous.daily[i].real:undefined}));
 return <div className="h-72 w-full min-w-0"><ResponsiveContainer><AreaChart data={data} margin={{left:0,right:15,top:15,bottom:0}}>
  <defs><linearGradient id="analytics-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={GOLD} stopOpacity={.3}/><stop offset="100%" stopColor={GOLD} stopOpacity={.02}/></linearGradient></defs>
  <CartesianGrid vertical={false} stroke="#e8e3da"/><XAxis dataKey="day" fontSize={10} tickLine={false} axisLine={false}/><YAxis fontSize={10} width={48} tickLine={false} axisLine={false}/><Tooltip/><Legend wrapperStyle={{fontSize:11}}/>
  <Area type="monotone" dataKey="current" name={mode==="revenue"?"Revenue (AED)":"Viewers"} stroke={GOLD} fill="url(#analytics-area)" strokeWidth={2} isAnimationActive={false}/>
  {previous&&<Area type="monotone" dataKey="previous" name="Previous period" stroke={INK} strokeDasharray="4 4" fill="transparent" isAnimationActive={false}/>}
 </AreaChart></ResponsiveContainer></div>;
}
export function BotCharts({report}:{report:Report}){
 const data=[{name:"Real visitors",value:report.kpis.real_viewers},{name:"Automated",value:report.kpis.bot_viewers}];
 return <div><div className="h-56"><ResponsiveContainer><PieChart><Pie data={data} dataKey="value" nameKey="name" innerRadius={58} outerRadius={82} paddingAngle={3} isAnimationActive={false}>{data.map((d,i)=><Cell key={d.name} fill={i?BOT:INK}/>)}</Pie><Tooltip/><Legend wrapperStyle={{fontSize:11}}/></PieChart></ResponsiveContainer></div>
  <div className="h-40"><ResponsiveContainer><BarChart data={report.daily}><XAxis dataKey="day" tickFormatter={v=>String(v).slice(5)} fontSize={9} tickLine={false}/><Tooltip/><Bar dataKey="real" name="Real visitors" stackId="traffic" fill={INK} isAnimationActive={false}/><Bar dataKey="bots" name="Automated" stackId="traffic" fill={BOT} isAnimationActive={false}/></BarChart></ResponsiveContainer></div>
  <div className="mt-4 flex flex-wrap gap-2">{report.bots.map(b=><span key={b.reason} className="rounded-full bg-sand px-3 py-1 text-[10px]">{b.reason.replaceAll("_"," ")} · {b.count}</span>)}</div>
 </div>;
}
export function SurveyChart({report}:{report:Report}){
 const data=report.surveys.map(s=>({...s,label:REASON_LABELS[s.reason]??s.reason}));
 return data.length?<div className="h-64"><ResponsiveContainer><BarChart data={data} layout="vertical" margin={{left:0,right:15}}><XAxis type="number" allowDecimals={false} fontSize={10}/><YAxis dataKey="label" type="category" width={130} fontSize={10} tickLine={false} axisLine={false}/><Tooltip/><Bar dataKey="count" name="Responses" fill={GOLD} radius={[0,4,4,0]} isAnimationActive={false}/></BarChart></ResponsiveContainer></div>:<p className="py-12 text-center text-sm text-fog">Feedback will appear after shoppers respond.</p>;
}
