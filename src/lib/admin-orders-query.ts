import { ORDER_STATUSES } from "./order-status";
import { PAYMENT_METHODS, PAYMENT_STATUSES } from "./admin-orders-model";
import { uuid } from "./analytics/shared";

export function ordersQuery(params:URLSearchParams,pageSize=50) {
 const status=params.get("status")??"",payment=params.get("payment")??"",method=params.get("method")??"";
 if(status&&![...ORDER_STATUSES,"packed"].includes(status as typeof ORDER_STATUSES[number]))throw Error("Invalid order status");
 if(payment&&!PAYMENT_STATUSES.includes(payment as typeof PAYMENT_STATUSES[number]))throw Error("Invalid payment status");
 if(method&&!PAYMENT_METHODS.includes(method as typeof PAYMENT_METHODS[number]))throw Error("Invalid payment method");
 const date=(value:string|null,end=false)=>{
  if(!value)return null;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value))throw Error("Invalid date");
  const d=new Date(value+"T00:00:00+04:00");
  if(!Number.isFinite(+d)||new Date(+d+14400000).toISOString().slice(0,10)!==value)throw Error("Invalid date");
  return new Date(+d+(end?86400000:0)).toISOString();
 };
 const start=date(params.get("start")),end=date(params.get("end"),true);
 if(start&&end&&start>=end)throw Error("End date must follow start date");
 const ids=params.get("ids")?.split(",").filter(Boolean);
 if(ids&&(ids.length>200||ids.some(id=>!uuid(id))))throw Error("Invalid order selection");
 return {search_text:(params.get("q")??"").trim().slice(0,100),filter_status:status,filter_payment:payment,filter_method:method,
 start_date:start,end_date:end,page_offset:Math.max(0,Math.min(100000,Math.floor(Number(params.get("offset"))||0))),page_size:pageSize,
 sort_order:["oldest","total_high","total_low"].includes(params.get("sort")??"")?params.get("sort"):"newest",selected_ids:ids?.length?ids:null};
}
