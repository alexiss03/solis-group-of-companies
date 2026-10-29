type Identity={userId:string;email:string;displayName:string}|null;
export async function supabaseBackend(request:Request,runtime:Record<string,any>,service:'commerce'|'cms',path:string[],identity:Identity,bridge=false){
 const endpoint=runtime.SOLIS_SUPABASE_BACKEND,key=runtime.SOLIS_SUPABASE_BACKEND_KEY;
 if(!endpoint||!key)return Response.json({error:'The workspace connection is not configured.'},{status:503});
 try{
  const origin=request.headers.get('origin');
  if(request.method!=='GET'&&!bridge&&((origin&&origin!==new URL(request.url).origin)||request.headers.get('sec-fetch-site')==='cross-site'))return Response.json({error:'Submit this request from the company workspace.'},{status:403});
  let body:string|undefined;
  if(request.method!=='GET'){
   const reader=request.body?.getReader();let size=0,raw='';const decoder=new TextDecoder();
   if(reader){while(true){const next=await reader.read();if(next.done)break;size+=next.value.byteLength;if(size>65536){await reader.cancel();return Response.json({error:'The request is too large.'},{status:413});}raw+=decoder.decode(next.value,{stream:true});}raw+=decoder.decode();}body=raw;
  }
  const headers:Record<string,string>={};for(const name of ['content-type','origin','sec-fetch-site','x-tracking-key']){const value=request.headers.get(name);if(value)headers[name]=value;}
  const upstream=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},body:JSON.stringify({service,path,identity,bridge,method:request.method,url:request.url,headers,body,ip:request.headers.get('cf-connecting-ip')||'unknown'}),signal:AbortSignal.timeout(25000)});
  const raw=await upstream.text();try{JSON.parse(raw);}catch{return Response.json({error:'The workspace is temporarily unavailable.'},{status:502});}
  return new Response(raw,{status:upstream.status,headers:{'Content-Type':'application/json','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});
 }catch{return Response.json({error:'The workspace could not be reached. Please retry.'},{status:503});}
}
