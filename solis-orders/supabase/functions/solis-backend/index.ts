import postgres from 'npm:postgres@3.4.9';
import {AppDatabase} from './postgres.ts';
import {commerceRequest,digest} from './commerce-store.ts';
import {cmsRequest} from './cms-store.ts';
import seed from './portfolio-seed.json' with {type:'json'};

const sql=postgres(Deno.env.get('SUPABASE_DB_URL')!,{prepare:false,max:1,idle_timeout:20,connect_timeout:10,ssl:'require'});
const db=new AppDatabase(sql);
const reply=(error:string,status:number)=>Response.json({error},{status,headers:{'Cache-Control':'no-store'}});

Deno.serve(async(request:Request)=>{
 if(request.method!=='POST')return reply('Not authorized.',401);
 const key=request.headers.get('authorization')?.replace(/^Bearer /,'')||'';
 if(!/^[a-f0-9]{64}$/.test(key))return reply('Not authorized.',401);
 try{
  const credentials=await sql`SELECT scope,owner_email,origin FROM solis.backend_credentials WHERE key_hash=${await digest(key)} AND active=1`;
  const credential=credentials[0];if(!credential)return reply('Not authorized.',401);
  const reader=request.body?.getReader();if(!reader)return reply('Invalid request.',400);
  let raw='',size=0;const decoder=new TextDecoder();
  while(true){const next=await reader.read();if(next.done)break;size+=next.value.byteLength;if(size>100000){await reader.cancel();return reply('The request is too large.',413);}raw+=decoder.decode(next.value,{stream:true});}
  raw+=decoder.decode();let body:any;try{body=JSON.parse(raw);}catch{return reply('Invalid request.',400);}
  if(!['GET','POST','PATCH'].includes(body.method)||!Array.isArray(body.path)||body.path.length>3||body.path.some((p:any)=>typeof p!=='string'||p.length>200))return reply('Invalid request.',400);
  const url=new URL(body.url);if(url.origin!==credential.origin)return reply('Invalid site origin.',403);
  const identity=body.identity;
  if(identity&&(typeof identity.userId!=='string'||typeof identity.email!=='string'||typeof identity.displayName!=='string'))return reply('Invalid identity.',400);
  if(credential.scope==='cms'&&(!identity||!identity.userId||identity.email.toLowerCase()!==credential.owner_email))return reply('Only the workspace owner can manage this workspace.',403);
  const headers=new Headers();for(const name of ['content-type','origin','sec-fetch-site','x-tracking-key'])if(typeof body.headers?.[name]==='string')headers.set(name,body.headers[name]);
  const forwarded=new Request(url,{method:body.method,headers,body:body.method==='GET'?undefined:body.body});
  if(body.service==='cms'){
   if(credential.scope!=='cms')return reply('Not authorized.',403);
   return cmsRequest(forwarded,db,identity.userId,body.path,seed);
  }
  if(body.service!=='commerce')return reply('Endpoint not found.',404);
  const bridge=credential.scope==='cms'||body.bridge===true;
  if(credential.scope==='cms'&&!['merchant','orders','members','companies','setup','offerings'].includes(body.path[0]))return reply('Endpoint not found.',404);
  return commerceRequest(forwarded,db,{identity,bridge,adminEmail:credential.owner_email,rateSalt:key,ip:typeof body.ip==='string'?body.ip:'unknown'},body.path);
 }catch(error){console.error('Solis backend failed:',error instanceof Error?error.name:'Unknown');return reply('The workspace could not be reached. Please retry.',503);}
});
