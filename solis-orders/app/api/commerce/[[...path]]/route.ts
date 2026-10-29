import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../../../chatgpt-auth';
import { commerceRequest,secretMatches } from '../../../lib/commerce-store';
import { supabaseBackend } from '../../../lib/supabase-backend';
export const dynamic='force-dynamic';
async function handle(request:Request,context:{params:Promise<{path?:string[]}>}){
 const runtime=env as unknown as Record<string,any>;let {path=[]}=await context.params;const bridge=path[0]==='bridge';
 if(bridge){if(!await secretMatches(request.headers.get('authorization')?.replace(/^Bearer /,'')||'',runtime.COMMERCE_BRIDGE_KEY||''))return Response.json({error:'Not authorized.'},{status:401});path=path.slice(1);}
 const identity=bridge?null:await getChatGPTUser();
 if(runtime.SOLIS_SUPABASE_BACKEND)return supabaseBackend(request,runtime,'commerce',path,identity,bridge);
 if(!env.DB)return Response.json({error:'Orders are temporarily unavailable.'},{status:503});
 return commerceRequest(request,env.DB,{identity,bridge,adminEmail:runtime.PORTAL_ADMIN_EMAIL||'',rateSalt:runtime.COMMERCE_BRIDGE_KEY||'unconfigured',ip:request.headers.get('cf-connecting-ip')||'local'},path);
}
export const GET=handle;export const POST=handle;export const PATCH=handle;
