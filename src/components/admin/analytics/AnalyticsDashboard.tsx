"use client";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { format, startOfMonth, endOfMonth, subDays, subMonths } from "date-fns";
import { ArrowDownUp, ArrowUpRight, Check, Copy, Download, Link2, RefreshCw } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SurveyFeedback } from "./SurveyFeedback";
import { LocationAnalytics } from "./LocationAnalytics";
import { useSuggest } from "@/components/search/use-suggest";
import { formatAED } from "@/lib/utils";
import { csvCell } from "@/lib/analytics/shared";
import { ANALYTICS_SECTIONS, type AnalyticsSection, type DashboardData, type CustomerData, type LocationReport, type ProductMetric } from "@/lib/analytics/dashboard";

const chartLoading=()=> <div className="h-72 animate-pulse rounded-lg bg-sand/40"/>;
const Timeline=dynamic(()=>import("./AnalyticsCharts").then(m=>m.TimelineChart),{ssr:false,loading:chartLoading});
const Bots=dynamic(()=>import("./AnalyticsCharts").then(m=>m.BotCharts),{ssr:false,loading:chartLoading});
const Survey=dynamic(()=>import("./AnalyticsCharts").then(m=>m.SurveyChart),{ssr:false,loading:chartLoading});
const LABELS:Record<AnalyticsSection,string>={overview:"Overview",traffic:"Traffic & bots",locations:"Countries & cities",products:"Product interest",acquisition:"Acquisition",feedback:"Why no buy?",customers:"Customer data"};
function dates(preset:string){
 const today=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Dubai"}).format(new Date());const now=new Date(today+"T12:00:00Z");
 let start=now,end=now;
 if(preset==="7")start=subDays(now,6);else if(preset==="30")start=subDays(now,29);else if(preset==="month")start=startOfMonth(now);else if(preset==="lastmonth"){start=startOfMonth(subMonths(now,1));end=endOfMonth(subMonths(now,1));}
 return {start:format(start,"yyyy-MM-dd"),end:format(end,"yyyy-MM-dd")};
}
const pretty=(value:number)=>Number(value).toLocaleString("en-US",{maximumFractionDigits:2});
function Growth({value,previous}:{value:number;previous:number|undefined}){
 if(previous===undefined)return null;
 const change=previous ? (value-previous)/previous*100 : value ? null : 0;
 return <span className={`text-[10px] ${change!==null&&change<0?"text-[#9c5746]":"text-[#52735f]"}`}>{change===null?"New":`${change>=0?"+":""}${change.toFixed(1)}%`} <span className="text-fog">vs previous period</span></span>;
}
function Panel({title,children,action}:{title:string;children:ReactNode;action?:ReactNode}){return <Card className="min-w-0"><CardHeader className="flex flex-wrap items-center justify-between gap-3"><CardTitle>{title}</CardTitle>{action}</CardHeader><CardContent>{children}</CardContent></Card>;}
function downloadCsv(name:string,columns:string[],rows:unknown[][]){const blob=new Blob(["\uFEFF"+[columns,...rows].map(r=>r.map(csvCell).join(",")).join("\r\n")],{type:"text/csv;charset=utf-8"});const href=URL.createObjectURL(blob);const a=document.createElement("a");a.href=href;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(href),1000);}

function AdLinkBuilder(){
 const [origin,setOrigin]=useState("");useEffect(()=>{queueMicrotask(()=>setOrigin(location.origin));},[]);
 const [productSearch,setProductSearch]=useState("");const {items:productSuggestions}=useSuggest(productSearch,"store");
 const [destination,setDestination]=useState("/");const [source,setSource]=useState("instagram");const [medium,setMedium]=useState("cpc");const [campaign,setCampaign]=useState("");const [copied,setCopied]=useState(false);const [error,setError]=useState("");
 const link=useMemo(()=>{if(!origin)return "";try{const url=new URL(destination,origin);if(url.origin!==origin||!/^https?:$/.test(url.protocol))return "";for(const [key,value] of [["utm_source",source],["utm_medium",medium],["utm_campaign",campaign]]){if(value.trim())url.searchParams.set(key,value.trim());else url.searchParams.delete(key);}return url.toString();}catch{return "";}},[destination,source,medium,campaign,origin]);
 return <Dialog><DialogTrigger asChild><Button variant="outline" size="sm"><Link2/>Generate ad link</Button></DialogTrigger><DialogContent>
  <DialogTitle className="text-xl">A link you can measure</DialogTitle><DialogDescription className="mt-2 text-xs leading-6 text-fog">Use a store page or product URL. Analytics keeps both the first and latest campaign touch.</DialogDescription>
  <div className="mt-5 grid gap-3">
    <label className="grid gap-2 text-xs">Choose a page<Select aria-label="Choose ad destination page" value="" onChange={e=>{if(e.target.value)setDestination(e.target.value);}}><option value="">Choose a destination…</option><option value="/">Home</option><option value="/collection/all">All collections</option><option value="/find-your-scent">Find your scent</option><option value="/posts">Blogs</option><option value="/private-label">Private label</option><option value="/pages/contact">Connect</option></Select></label>
    <label className="grid gap-2 text-xs">Or find a product<input value={productSearch} onChange={e=>setProductSearch(e.target.value)} placeholder="Search by product name" className="rounded-lg border border-ink/15 p-3"/></label>
    {productSearch.trim().length>=2&&<div className="max-h-40 overflow-y-auto rounded-lg border border-ink/10">{productSuggestions.slice(0,6).map(product=><button key={product.id} type="button" className="block w-full px-3 py-2 text-start text-xs hover:bg-sand" onClick={()=>{setDestination(`/product/${product.slug}`);setProductSearch("");}}>{product.title}</button>)}</div>}
  </div>
  <div className="mt-5 grid gap-4">{[["Destination",destination,setDestination,"/product/your-product"],["Source",source,setSource,"instagram"],["Medium",medium,setMedium,"cpc, reel, bio"],["Campaign",campaign,setCampaign,"winter-collection"]].map(([label,value,setter,placeholder])=><label className="grid gap-2 text-xs" key={String(label)}>{String(label)}<input className="rounded-lg border border-ink/15 p-3" value={String(value)} onChange={e=>(setter as (value:string)=>void)(e.target.value)} placeholder={String(placeholder)} maxLength={500}/></label>)}</div>
  <p className="mt-5 break-all rounded-lg bg-sand/50 p-3 text-xs leading-6">{link||"Enter a valid URL on this store’s domain."}</p>
  <Button className="mt-4 w-full" disabled={!link||!source.trim()} onClick={async()=>{try{await navigator.clipboard.writeText(link);setCopied(true);setError("");}catch{setError("Copy the generated URL above.");}}}>{copied?<Check/>:<Copy/>}{copied?"Copied":"Copy tracking URL"}</Button>{error&&<p role="status" className="mt-2 text-xs">{error}</p>}
 </DialogContent></Dialog>;
}

export function AnalyticsDashboard({section,canExport}:{section:AnalyticsSection;canExport:boolean}){
 const query=useSearchParams();const router=useRouter();const path=usePathname();const initial=dates("month");
 const start=query.get("start")??initial.start,end=query.get("end")??initial.end,bots=query.get("bots")??"real",compare=query.get("compare")!=="false",attribution=query.get("attribution")??"last";
 const [locations,setLocations]=useState<LocationReport|null>(null);
 const [data,setData]=useState<DashboardData|null>(null);const [customers,setCustomers]=useState<CustomerData|null>(null);const [error,setError]=useState("");const [loading,setLoading]=useState(true);const [refresh,setRefresh]=useState(0);const [mode,setMode]=useState<"viewers"|"revenue">("viewers");
 const [productFilter,setProductFilter]=useState("all");const [productQuery,setProductQuery]=useState("");const [sort,setSort]=useState<{key:keyof ProductMetric;desc:boolean}>({key:"views",desc:true});
 const [customerSearch,setCustomerSearch]=useState(query.get("q")??"");const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const params=useMemo(()=>{const p=new URLSearchParams(query.toString());p.set("start",start);p.set("end",end);p.set("bots",bots);p.set("compare",String(compare));p.set("attribution",attribution);return p;},[query,start,end,bots,compare,attribution]);
 const requestKey=params.toString();
 function update(values:Record<string,string>){const p=new URLSearchParams(requestKey);for(const [key,value] of Object.entries(values))p.set(key,value);router.replace(`${path}?${p}`,{scroll:false});}
 useEffect(()=>{
  const controller=new AbortController();let live=true;
  const run=async()=>{setLoading(true);setError("");try{const url=new URLSearchParams(requestKey);if(section==="customers")url.set("kind","customers");else if(section==="locations")url.set("kind","locations");const r=await fetch(`/api/admin/analytics?${url}`,{cache:"no-store",signal:controller.signal});const value=await r.json();if(!r.ok)throw new Error(value.error??"Unable to load analytics");if(live){if(section==="customers")setCustomers(value as CustomerData);else if(section==="locations")setLocations(value as LocationReport);else setData(value as DashboardData);}}catch(e){if(live)setError(e instanceof Error?e.message:"Unable to load analytics");}finally{if(live)setLoading(false);}};
  void run();return()=>{live=false;controller.abort();};
 },[requestKey,section,refresh]);
 useEffect(()=>{const timer=setInterval(()=>{if(document.visibilityState==="visible")setRefresh(v=>v+1);},60000);return()=>clearInterval(timer);},[]);
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
 const report=data?.current;const previous=compare?data?.previous:null;
 const productRows=useMemo(()=>{
  const rows=(report?.products??[]).filter(p=>(!productQuery||`${p.product_name} ${p.product_id}`.toLowerCase().includes(productQuery.toLowerCase()))&&(productFilter!=="interest"||(p.cart_adds>0&&p.cart_no_buy_count>0)));
  return rows.sort((a,b)=>{const x=a[sort.key],y=b[sort.key];return (typeof x==="number"&&typeof y==="number"?x-y:String(x).localeCompare(String(y)))*(sort.desc?-1:1);});
 },[report,productQuery,productFilter,sort]);
 function sortBy(key:keyof ProductMetric){setSort(old=>({key,desc:old.key===key?!old.desc:key!=="product_name"}));}
 const columns:[keyof ProductMetric,string][]=[["product_name","Product"],["views","Views"],["cart_adds","Cart adds"],["cart_no_buy_count","Cart drop-offs"],["purchases","Units ordered"],["conversion_rate","View-to-buy %"],["total_revenue","Revenue AED"]];
 return <div className="analytics-shell">
  <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] uppercase tracking-[.2em] text-gold">First-party intelligence</p><h1 className="mt-2 text-3xl font-light tracking-tight">{LABELS[section]}</h1><p className="mt-2 text-xs text-fog">Dubai time · AED · Revenue includes fully paid active orders only. Conversion tracks order placement.</p></div><AdLinkBuilder/></div>
  <nav className="analytics-section-nav" aria-label="Analytics sections">{ANALYTICS_SECTIONS.filter(s=>s!=="customers"||canExport).map(s=><Link key={s} href={`/admin/analytics${s==="overview"?"":"/"+s}?${requestKey}`} aria-current={s===section?"page":undefined}>{LABELS[s]}</Link>)}</nav>
  <div className="analytics-controls">
   <label>Date range<Select aria-label="Date range" value={query.get("preset")??"month"} onChange={e=>{if(e.target.value==="custom")update({preset:"custom"});else update({...dates(e.target.value),preset:e.target.value,offset:"0"});}}><option value="today">Today</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="month">This month</option><option value="lastmonth">Last month</option><option value="custom">Custom</option></Select></label>
   <label>From<input type="date" aria-label="Start date" value={start} onChange={e=>update({start:e.target.value,preset:"custom",offset:"0"})}/></label>
   <label>Through<input type="date" aria-label="End date" value={end} onChange={e=>update({end:e.target.value,preset:"custom",offset:"0"})}/></label>
   {section!=="customers"&&<><label>Traffic<Select aria-label="Bot traffic filter" value={bots} onChange={e=>update({bots:e.target.value})}><option value="real">Real users only</option><option value="all">Include bots</option><option value="only">Bots only</option></Select></label>{section!=="locations"&&<label className="analytics-check"><input type="checkbox" checked={compare} onChange={e=>update({compare:String(e.target.checked)})}/>Compare periods</label>}</>}
   <Button size="sm" variant="outline" onClick={()=>setRefresh(v=>v+1)} aria-label="Refresh analytics"><RefreshCw className={loading?"animate-spin":""}/></Button>
  </div>
  {error?<Card className="p-6" role="alert"><p className="font-medium">Analytics isn’t ready yet</p><p className="mt-2 text-sm text-fog">{error}</p><p className="mt-2 text-xs text-fog">If this is a new installation, run supabase/migration_analytics.sql. No historical traffic is fabricated.</p><Button className="mt-4" variant="outline" onClick={()=>setRefresh(v=>v+1)}>Retry</Button></Card>:loading&&!data&&!customers&&!locations?<div role="status" className="grid grid-cols-2 gap-4 lg:grid-cols-5">{Array.from({length:5},(_,i)=><div key={i} className="h-32 animate-pulse rounded-xl bg-sand/60"/>)}<span className="sr-only">Loading analytics</span></div>:null}
  {section!=="customers"&&section!=="locations"&&report&&!error&&<div className={loading?"opacity-65":""} aria-busy={loading}>
   <div className="analytics-kpis">
    {([{key:"viewers",label:bots==="only"?"Bot viewers":bots==="all"?"All viewers":"Real viewers",render:pretty},{key:"conversion_rate",label:"Viewer → customer",render:(n:number)=>`${pretty(n)}%`},{key:"revenue",label:"Paid order revenue",render:formatAED},{key:"dropoffs",label:"High-interest drop-offs",render:pretty}] as const).map(item=><Card key={item.key} className="p-5"><p className="text-[10px] uppercase tracking-wider text-fog">{item.label}</p><p className="my-3 text-2xl font-light">{item.render(report.kpis[item.key])}</p><Growth value={report.kpis[item.key]} previous={previous?.kpis[item.key]}/></Card>)}
    <Card className="p-5"><p className="text-[10px] uppercase tracking-wider text-fog">Bot share of traffic</p><p className="my-3 text-2xl font-light">{pretty(100*report.kpis.bot_viewers/Math.max(1,report.kpis.real_viewers+report.kpis.bot_viewers))}%</p><Growth value={100*report.kpis.bot_viewers/Math.max(1,report.kpis.real_viewers+report.kpis.bot_viewers)} previous={previous ? 100*previous.kpis.bot_viewers/Math.max(1,previous.kpis.real_viewers+previous.kpis.bot_viewers) : undefined}/><button type="button" className="mt-2 block text-[10px] underline" onClick={()=>update({bots:bots==="real"?"all":"real"})}>{bots==="real"?"Excluded · include bots":"Change to real users only"}</button></Card>
   </div>
   {(section==="overview"||section==="traffic")&&<div className="analytics-chart-grid">
    <Panel title={mode==="viewers"?"People behind the visits":"Revenue over time"} action={<Tabs value={mode} onValueChange={v=>setMode(v as "viewers"|"revenue")}><TabsList><TabsTrigger value="viewers">Viewers</TabsTrigger><TabsTrigger value="revenue">Revenue</TabsTrigger></TabsList></Tabs>}><Timeline report={report} previous={previous??null} mode={mode} bots={bots}/></Panel>
    <Panel title="Human & automated traffic"><p className="mb-2 text-[10px] text-fog">All detected traffic, regardless of the selected bot filter.</p><Bots report={report}/></Panel>
   </div>}
   {section==="overview"&&<div className="analytics-chart-grid"><Panel title="From curiosity to checkout"><div className="space-y-5 pt-4">{report.funnel.map((f,i)=><div key={f.name}><div className="mb-2 flex items-center justify-between text-xs"><span>{f.name}</span><strong>{pretty(f.value)}</strong></div><div className="h-5 overflow-hidden rounded bg-sand"><div className="h-full rounded bg-[#8a7858]" style={{width:`${Math.min(100,f.value/Math.max(1,report.funnel[0]?.value??0)*100)}%`,opacity:1-i*.12}}/></div></div>)}</div><p className="mt-5 text-[10px] leading-5 text-fog">Stage counts are distinct sessions with that action. A session can enter mid-funnel. Cart abandonment: {pretty(report.kpis.abandonment_rate)}% within this date range.</p></Panel><Panel title="What held shoppers back?"><Survey report={report}/><Link className="mt-3 inline-flex gap-2 text-xs underline" href={`/admin/analytics/feedback?${requestKey}`}>Read feedback<ArrowUpRight size={13}/></Link></Panel></div>}
   {section==="products"&&<Panel title="Product performance & interest" action={<Button size="sm" variant="outline" onClick={()=>downloadCsv("product-interest.csv",columns.map(c=>c[1]),productRows.map(p=>columns.map(([key])=>p[key])))}><Download/>Export table</Button>}>
    <div className="mb-5 flex flex-wrap gap-2">{[["all","All products"],["views","Best selling by views"],["interest","High interest / no buy"]].map(([key,label])=><button key={key} type="button" className="analytics-pill" aria-pressed={productFilter===key} onClick={()=>{setProductFilter(key);setSort({key:key==="interest"?"cart_no_buy_count":"views",desc:true});}}>{label}</button>)}<input className="min-w-0 rounded-lg border border-ink/15 px-3 py-2 text-xs" aria-label="Search product metrics" placeholder="Find a product" value={productQuery} onChange={e=>setProductQuery(e.target.value)}/></div>
    <Table><TableHeader><TableRow>{columns.map(([key,label])=><TableHead key={key} aria-sort={sort.key===key?sort.desc?"descending":"ascending":"none"}><button className="flex items-center gap-2" onClick={()=>sortBy(key)}>{label}<ArrowDownUp size={12}/></button></TableHead>)}</TableRow></TableHeader><TableBody>{productRows.map(p=><TableRow key={p.product_id}><TableCell><Link href={`/product/${encodeURIComponent(p.product_id)}`} className="font-medium underline-offset-4 hover:underline">{p.product_name||p.product_id}</Link></TableCell>{columns.slice(1).map(([key])=><TableCell key={key}>{pretty(Number(p[key]))}</TableCell>)}</TableRow>)}</TableBody></Table>
    {!productRows.length&&<p className="py-10 text-center text-sm text-fog">No product events in this selection.</p>}<p className="mt-4 text-[10px] leading-5 text-fog">Up to 500 products. Product revenue includes merchandise value from fully paid active orders, before discounts and shipping. Drop-offs are sessions with a cart add in this period and no recorded purchase, including later purchases.</p>
   </Panel>}
   {section==="acquisition"&&<Panel title="Traffic sources & campaigns" action={<Select aria-label="Attribution model" value={attribution} onChange={e=>update({attribution:e.target.value})}><option value="first">First touch</option><option value="last">Last touch</option></Select>}><p className="mb-5 text-xs leading-6 text-fog">Revenue attribution is shown below. ROI needs campaign spend, which this store does not collect.</p><Table><TableHeader><TableRow>{["Source / medium / campaign","Referrer","Viewers","Cart adds","Customers","Conversion %","Revenue AED"].map(c=><TableHead key={c}>{c}</TableHead>)}</TableRow></TableHeader><TableBody>{report.acquisition.map((a,i)=><TableRow key={`${a.source}:${a.medium}:${a.campaign}:${a.referrer_domain}`} className={i===0&&a.customers>0?"bg-[#eaf0e9]":""}><TableCell><span className="block font-medium">{a.source} / {a.medium}</span><span className="mt-1 block text-fog">{a.campaign||"No campaign"}</span>{i===0&&a.customers>0&&<Badge variant="outline" className="mt-2">Top customer source</Badge>}</TableCell><TableCell>{a.referrer_domain}</TableCell>{[a.visitors,a.cart_adds,a.customers,a.conversion_rate,a.revenue].map((v,n)=><TableCell key={n}>{pretty(v)}</TableCell>)}</TableRow>)}</TableBody></Table>{!report.acquisition.length&&<p className="py-10 text-center text-sm text-fog">Sources appear as visits arrive.</p>}<p className="mt-4 text-[10px] text-fog">Up to 500 source groups. Viewers are distinct visitors; conversion uses sessions.</p></Panel>}
   {section==="feedback"&&<SurveyFeedback report={report}/>}
   {section==="feedback"&&<Panel title="What held shoppers back?"><Survey report={report}/></Panel>}
   {!report.kpis.sessions&&<p role="status" className="mt-6 text-center text-sm text-fog">No tracked sessions for this period. Tracking starts after the migration is installed.</p>}
  </div>}
  {section==="locations"&&locations&&!error&&<div aria-busy={loading} className={loading?"pointer-events-none opacity-65":""}><LocationAnalytics report={locations} country={query.get("country")??""} emirate={query.get("emirate")??""} city={query.get("city")??""} onFilter={update}/></div>}
  {section==="customers"&&canExport&&<Panel title="Customer directory" action={<Button asChild size="sm" variant="outline"><a href={`/api/admin/analytics/export?${requestKey}`}><Download/>Export Excel CSV</a></Button>}>
   <p className="mb-5 text-xs leading-6 text-fog">All shopper accounts. Activity and order figures use the chosen date range. Active time measures foreground interaction, not time in a background tab. Guest visits remain anonymous.</p>
   <div className="mb-5 flex flex-wrap gap-3"><input value={customerSearch} aria-label="Search customers" placeholder="Email, name or phone" className="min-w-0 rounded-lg border border-ink/15 px-3 py-2 text-xs" onChange={e=>{const value=e.target.value;setCustomerSearch(value);if(timer.current)clearTimeout(timer.current);timer.current=setTimeout(()=>update({q:value,offset:"0"}),300);}}/><Select aria-label="Promotion consent filter" value={query.get("promo")??"all"} onChange={e=>update({promo:e.target.value,offset:"0"})}><option value="all">All promotion preferences</option><option value="yes">Promotions enabled</option><option value="no">Promotions disabled</option></Select></div>
   <Table><TableHeader><TableRow>{["Customer","Phone / saved address","Active time","Sessions","Orders / AED","Email preferences"].map(c=><TableHead key={c}>{c}</TableHead>)}</TableRow></TableHeader><TableBody>{customers?.rows.map(c=><TableRow key={c.id}><TableCell><strong className="block">{c.full_name||"Unnamed shopper"}</strong><span className="mt-1 block">{c.email}</span></TableCell><TableCell><span>{c.phone||"—"}</span><p className="mt-1 max-w-xs break-words text-[10px] text-fog">{c.default_address?JSON.stringify(c.default_address):"No saved address"}</p></TableCell><TableCell>{Math.floor(c.active_seconds/60)}m {c.active_seconds%60}s</TableCell><TableCell>{c.sessions}</TableCell><TableCell>{c.orders} / {pretty(c.spent)}</TableCell><TableCell>Promo: {c.promo_opt_in?"On":"Off"}<br/>Orders: {c.order_updates_opt_in?"On":"Off"}</TableCell></TableRow>)}</TableBody></Table>
   <div className="mt-5 flex items-center justify-between gap-3 text-xs"><span>{customers?.total??0} customers</span><span className="flex gap-2"><Button size="sm" variant="outline" disabled={loading||Number(query.get("offset")??0)<=0} onClick={()=>update({offset:String(Math.max(0,Number(query.get("offset")??0)-100))})}>Previous</Button><Button size="sm" variant="outline" disabled={loading||Number(query.get("offset")??0)+100>=(customers?.total??0)} onClick={()=>update({offset:String(Number(query.get("offset")??0)+100)})}>Next</Button></span></div>
  </Panel>}
 </div>;
}
