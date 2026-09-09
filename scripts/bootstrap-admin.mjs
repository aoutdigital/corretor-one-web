import { createClient } from "@supabase/supabase-js";

const email=(process.argv[2]??"").trim().toLowerCase();
const name=(process.argv.slice(3).join(" ")||"Administrador").trim();
if(!email||!email.includes("@")){console.error("Uso: npm run admin:bootstrap -- email@dominio.com Nome do Administrador");process.exit(1)}
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key){console.error("Variáveis do Supabase ausentes em .env.local");process.exit(1)}
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
let page=1;let authUser=null;
while(!authUser){const result=await db.auth.admin.listUsers({page,perPage:1000});if(result.error){console.error(result.error.message);process.exit(1)}authUser=result.data.users.find((item)=>item.email?.toLowerCase()===email)??null;if(authUser||result.data.users.length<1000)break;page+=1}
if(!authUser){console.error("Usuário não encontrado no Supabase Auth. Crie ou convide a conta antes de executar o bootstrap.");process.exit(1)}
const result=await db.from("admin_users").upsert({id:authUser.id,nome:name,email,papel:"ADM",status:"ATIVO"},{onConflict:"id"});
if(result.error){console.error(result.error.message);process.exit(1)}
console.log(`Administrador habilitado: ${email}`);
