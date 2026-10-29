import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../../../chatgpt-auth';
import { cmsRequest } from '../../../lib/cms-store';
import { supabaseBackend } from '../../../lib/supabase-backend';
import seed from '../../../portfolio-seed.json';
export const dynamic='force-dynamic';
async function handle(request:Request,context:{params:Promise<{path?:string[]}>}){
 const user=await getChatGPTUser();if(!user)return Response.json({error:'Please sign in to your private management workspace.'},{status:401,headers:{'Cache-Control':'no-store'}});
 const {path=[]}=await context.params;
 const runtime=env as unknown as Record<string,any>;
 if(runtime.SOLIS_SUPABASE_BACKEND)return supabaseBackend(request,runtime,'cms',path,user);
 if(!env.DB)return Response.json({error:'The workspace database is not available.'},{status:503});
 return cmsRequest(request,env.DB,user.userId,path,seed);
}
export const GET=handle;export const POST=handle;export const PATCH=handle;
