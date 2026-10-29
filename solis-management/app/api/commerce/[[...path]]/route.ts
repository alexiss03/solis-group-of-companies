import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../../../chatgpt-auth';
import { supabaseBackend } from '../../../lib/supabase-backend';
export const dynamic='force-dynamic';
async function handle(request:Request,context:{params:Promise<{path?:string[]}>}){
 const user=await getChatGPTUser();if(!user)return Response.json({error:'Sign in to the private management workspace.'},{status:401});
 const runtime=env as unknown as Record<string,string>;
 if(!runtime.COMMERCE_BRIDGE_KEY||!runtime.COMMERCE_ORIGIN||!runtime.COMMERCE_ADMIN_EMAIL)return Response.json({error:'The order connection is not configured yet.'},{status:503});
 if(user.email.toLowerCase()!==runtime.COMMERCE_ADMIN_EMAIL.toLowerCase())return Response.json({error:'Only the workspace owner can manage group orders here.'},{status:403});
 const {path=[]}=await context.params;if(!['merchant','orders','members','companies','setup','offerings'].includes(path[0]))return Response.json({error:'Endpoint not found.'},{status:404});
 if(request.method!=='GET'){const origin=request.headers.get('origin');if((origin&&origin!==new URL(request.url).origin)||request.headers.get('sec-fetch-site')==='cross-site')return Response.json({error:'Use your management workspace for this request.'},{status:403});if(!request.headers.get('content-type')?.includes('application/json'))return Response.json({error:'JSON content is required.'},{status:415});}
 if(runtime.SOLIS_SUPABASE_BACKEND)return supabaseBackend(request,runtime,'commerce',path,user,true);
 const target=new URL('/api/commerce/bridge/'+path.map(encodeURIComponent).join('/'),runtime.COMMERCE_ORIGIN);target.search=new URL(request.url).search;
 try{const body=request.method==='GET'?undefined:await request.text();if(body&&body.length>20000)return Response.json({error:'The request is too large.'},{status:413});const upstream=await fetch(target,{method:request.method,headers:{'Authorization':'Bearer '+runtime.COMMERCE_BRIDGE_KEY,...(body?{'Content-Type':'application/json'}:{})},body,signal:AbortSignal.timeout(20000)});const raw=await upstream.text();try{JSON.parse(raw);}catch{return Response.json({error:'The order service is temporarily unavailable.'},{status:502});}return new Response(raw,{status:upstream.status,headers:{'Content-Type':'application/json','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});}catch{return Response.json({error:'The order service could not be reached. Please retry.'},{status:502});}
}
export const GET=handle;export const POST=handle;export const PATCH=handle;
