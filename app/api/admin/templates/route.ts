import { NextResponse } from "next/server";
import { authorizeAdmin } from "@/lib/admin/authorization";
export async function GET(request:Request){const access=await authorizeAdmin(request,"templates.read");if(!access.ok)return NextResponse.json({ok:false,error:{message:access.message}},{status:access.status});const result=await access.db.from("templates").select("id,nome,renderer_key,version,formatos,ativo,updated_at").order("nome");if(result.error)return NextResponse.json({ok:false,error:{message:result.error.message}},{status:500});return NextResponse.json({ok:true,data:result.data??[]})}
