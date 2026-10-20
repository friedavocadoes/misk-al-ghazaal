import { permanentRedirect,notFound } from "next/navigation";
import { getBlogs,blogUrl } from "@/lib/blogs";
export default async function Legacy({params}:{params:Promise<{locale:string;slug:string}>}){const {locale,slug}=await params;const p=(await getBlogs()).find(p=>p.slug===slug);if(!p)notFound();permanentRedirect(`${locale==="ar"?"/ar":""}${blogUrl(p)}`);}
