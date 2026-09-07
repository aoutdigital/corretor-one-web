import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database, Json } from "@/lib/supabase/database.types";

const EVENTS = new Set(["VIEW","FORM_START","FORM_SUBMIT","CTA_CLICK"]);
type Context = { params: Promise<{ id: string }> };
export async function POST(request: Request, { params }: Context) {
  let body: unknown; try { body = await request.json(); } catch { return NextResponse.json({ ok:false },{status:400}); }
  if (!body || typeof body !== "object") return NextResponse.json({ok:false},{status:400});
  const data=body as Record<string,unknown>; const eventType=typeof data.event_type==="string"?data.event_type:"";
  if(!EVENTS.has(eventType)) return NextResponse.json({ok:false},{status:400});
  const admin=createSupabaseAdminClient(); const id=(await params).id;
  const page=await admin.from("landing_pages").select("id,owner_id,status").eq("id",id).eq("status","PUBLICADO").maybeSingle();
  if(page.error||!page.data)return NextResponse.json({ok:false},{status:404});
  const clean=(value:unknown,max:number)=>typeof value==="string"?value.slice(0,max)||null:null;
  const result=await admin.from("landing_page_events").insert({landing_page_id:id,owner_id:page.data.owner_id,event_type:eventType as Database["public"]["Enums"]["landing_page_event_type"],visitor_id:clean(data.visitor_id,80),page_url:clean(data.page_url,1000),referrer:clean(data.referrer,1000),utm:data.utm&&typeof data.utm==="object"?data.utm as Json:null,metadata:data.metadata&&typeof data.metadata==="object"?data.metadata as Json:{}});
  return NextResponse.json({ok:!result.error},{status:result.error?500:201});
}
