"use client";
import { useState } from "react";
import { Card,CardContent,CardHeader,CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { REASON_LABELS,type Report } from "@/lib/analytics/dashboard";
import { SURVEY_TRIGGER_LABELS,type SurveyTrigger } from "@/lib/analytics/survey-policy";
import { formatAED } from "@/lib/utils";
export function SurveyFeedback({report}:{report:Report}){
 const [trigger,setTrigger]=useState("all"),[search,setSearch]=useState("");
 const activity=report.survey_activity;
 const responses=(report.responses??[]).filter(r=>(trigger==="all"||r.trigger===trigger)&&(!search||`${r.product_name??""} ${r.custom_comment??""} ${r.cart_items.map(i=>i.product_name).join(" ")}`.toLowerCase().includes(search.toLowerCase())));
 return <div className="mt-6 space-y-5">
  {!activity&&<p className="rounded-lg bg-amber-50 p-4 text-xs">Run migration_survey_experience.sql to enable contextual feedback reporting.</p>}
  <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[["Feedback opportunities",activity?.opportunities??0],["Invitations shown",activity?.shown??0],["Answers saved",activity?.responses??0],["Invitation response rate",activity?.shown?`${((activity.responded_shown??0)/activity.shown*100).toFixed(1)}%`:"—"]].map(([label,value])=><Card key={label} className="p-5"><p className="text-xs text-fog">{label}</p><p className="mt-3 text-2xl font-light">{value}</p></Card>)}</div>
  <Card><CardHeader><CardTitle>Where the feedback comes from</CardTitle></CardHeader><CardContent><div className="space-y-3">{(report.survey_contexts??[]).map(c=><div key={`${c.survey_type}:${c.trigger}`}><div className="mb-2 flex items-center justify-between text-xs"><span>{SURVEY_TRIGGER_LABELS[c.trigger as SurveyTrigger]??"Earlier survey"}<span className="ms-2 text-fog">{c.survey_type}</span></span><strong>{c.count}</strong></div><div className="h-3 rounded bg-sand"><div className="h-full rounded bg-[#9a8054]" style={{width:`${c.count/Math.max(1,activity?.responses??0)*100}%`}}/></div></div>)}</div><p className="mt-4 text-[10px] leading-5 text-fog">All responses for the selected dates and bot filter. {activity?.dismissed??0} dismissals. Invitations stay collapsed until the shopper opens them. Cooldowns intentionally reduce invitations. Response rate counts answers after an invitation in this period; older records may represent expanded prompts.</p></CardContent></Card>
  <Card><CardHeader><CardTitle>Every answer, with its context</CardTitle></CardHeader><CardContent>
   <div className="mb-5 flex flex-wrap gap-3"><Select aria-label="Feedback trigger" value={trigger} onChange={e=>setTrigger(e.target.value)}><option value="all">All moments</option>{Object.entries(SURVEY_TRIGGER_LABELS).map(([key,label])=><option key={key} value={key}>{label}</option>)}</Select><input className="min-w-0 rounded-lg border border-ink/15 p-3 text-xs" value={search} onChange={e=>setSearch(e.target.value)} aria-label="Search feedback" placeholder="Product or comment"/></div>
   <div className="grid max-h-[680px] gap-4 overflow-y-auto md:grid-cols-2">{responses.map(r=><article key={r.id} className="rounded-xl border border-ink/10 p-4"><p className="text-[10px] uppercase tracking-wide text-gold">{SURVEY_TRIGGER_LABELS[r.trigger as SurveyTrigger]??"Earlier survey"}</p><h3 className="mt-2 text-sm font-medium">{REASON_LABELS[r.reason]??r.reason}</h3>{r.custom_comment&&<p className="mt-3 text-xs leading-6">“{r.custom_comment}”</p>}<p className="mt-3 text-xs">{r.product_name??r.cart_items.map(i=>`${i.product_name} × ${i.quantity}`).join(" · ")}</p><p className="mt-2 text-[10px] text-fog">{r.survey_type==="product"?"Product value":"Bag snapshot"}: {formatAED(r.cart_total)} · {new Date(r.created_at).toLocaleString("en-GB",{timeZone:"Asia/Dubai"})}</p></article>)}</div>
   {!responses.length&&<p className="py-10 text-center text-sm text-fog">No answers match this selection.</p>}<p className="mt-4 text-[10px] text-fog">Latest 100 responses, including answers without written comments.</p>
  </CardContent></Card>
 </div>;
}
