import { permanentRedirect } from "next/navigation";
export default async function Legacy({params}:{params:Promise<{locale:string}>}){const {locale}=await params;permanentRedirect(`${locale==="ar"?"/ar":""}/posts`);}
