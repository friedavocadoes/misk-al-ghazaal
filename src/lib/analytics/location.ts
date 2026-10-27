/** Coarse IP geolocation supplied by the hosting edge, never browser GPS. */
export const EMIRATES = [
  {code:"AZ",name:"Abu Dhabi"}, {code:"DU",name:"Dubai"},
  {code:"SH",name:"Sharjah"}, {code:"AJ",name:"Ajman"},
  {code:"UQ",name:"Umm Al Quwain"}, {code:"RK",name:"Ras Al Khaimah"},
  {code:"FU",name:"Fujairah"},
] as const;

function text(value:string|null):string|null {
  if(!value)return null;
  try{value=decodeURIComponent(value);}catch{/* Some proxies supply plain text. */}
  return value.replace(/[\u0000-\u001f\u007f]/g,"").trim().slice(0,120)||null;
}
const key=(value:string)=>value.toLowerCase().replace(/^ae[-_]/,"").replace(/[\s._-]+/g,"");
export function uaeEmirate(region:string|null,city:string|null):string|null {
  const aliases:Record<string,string>={
    az:"AZ",abudhabi:"AZ",abuzaby:"AZ",alain:"AZ","أبوظبي":"AZ","ابوظبي":"AZ",
    du:"DU",dubai:"DU",dubayy:"DU","دبي":"DU",
    sh:"SH",sharjah:"SH",ashshariqah:"SH","الشارقة":"SH",
    aj:"AJ",ajman:"AJ","عجمان":"AJ",uq:"UQ",ummalquwain:"UQ",ummalqaywayn:"UQ","أمالقيوين":"UQ",
    rk:"RK",rasalkhaimah:"RK",rasalkhaymah:"RK","رأسالخيمة":"RK",
    fu:"FU",fujairah:"FU",alfujayrah:"FU","الفجيرة":"FU",
  };
  return (region&&aliases[key(region)])||(city&&aliases[key(city)])||null;
}
export function analyticsLocation(headers:Pick<Headers,"get">) {
  // Keep a provider's fields together rather than mixing unrelated header sets.
  const vercel=!!headers.get("x-vercel-ip-country");
  const countryValue=text(headers.get(vercel?"x-vercel-ip-country":"cf-ipcountry"))?.toUpperCase();
  const country=countryValue&&/^[A-Z]{2}$/.test(countryValue)&&countryValue!=="XX"?countryValue:null;
  const region=text(headers.get(vercel?"x-vercel-ip-country-region":"cf-region-code"))
    ??(!vercel?text(headers.get("cf-region")):null);
  const city=text(headers.get(vercel?"x-vercel-ip-city":"cf-ipcity"));
  return {country,region:country?region:null,city:country?city:null,
    emirate:country==="AE"?uaeEmirate(region,city):null,
    location_source:country?(vercel?"vercel":"cloudflare"):null};
}
