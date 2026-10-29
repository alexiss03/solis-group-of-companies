// Read-only hosted verification. Credentials enter only through hidden stdin.
const endpoint=process.argv[2];if(!/^https:\/\/[a-z]+\.supabase\.co\/functions\/v1\/solis-backend$/.test(endpoint||''))throw new Error('Use the exact Solis backend URL.');
if(process.stdin.isTTY)process.stdin.setRawMode(true);
console.log('Ready for backend credential JSON on stdin (input is hidden).');
const input=await new Promise(resolve=>{let raw='';process.stdin.setEncoding('utf8');process.stdin.on('data',chunk=>{raw+=chunk;if(raw.includes('\n')){process.stdin.pause();resolve(raw.slice(0,raw.indexOf('\n')));}});process.stdin.resume();});
if(process.stdin.isTTY)process.stdin.setRawMode(false);
const {portalKey,cmsKey,ownerEmail}=JSON.parse(input);
const call=async(key,scope,service,path,identity=null)=>{
 const origin=scope==='cms'?'https://solis-company-management.cynammon.chatgpt.site':'https://solis-orders-services.cynammon.chatgpt.site';
 const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',...(key?{Authorization:'Bearer '+key}:{})},body:JSON.stringify({service,path,method:'GET',url:origin+'/api/'+service+'/'+path.join('/'),headers:{},identity,bridge:false,ip:'read-only-verification'})});
 let body;try{body=await response.json();}catch{body={};}return {status:response.status,body};
};
const owner={userId:'read-only-verification',email:ownerEmail,displayName:'Read-only verification'};
const catalog=await call(portalKey,'portal','commerce',['companies']);
const anonymous=await call(null,'portal','commerce',['companies']);
const scoped=await call(portalKey,'portal','cms',[],owner);
const wrongOwner=await call(cmsKey,'cms','cms',[],{...owner,email:'unassigned@example.invalid'});
const cms=await call(cmsKey,'cms','cms',[],owner);
const orders=await call(cmsKey,'cms','commerce',['orders'],owner);
const setup=await call(cmsKey,'cms','commerce',['setup','the-cake-architect'],owner);
const publicCompany=await call(portalKey,'portal','commerce',['companies','the-cake-architect']);
console.log(JSON.stringify({merchantSetup:setup.status,publicOfferings:publicCompany.body.offerings?.length,catalogStatus:catalog.status,companyCount:catalog.body.companies?.length,anonymousBackend:anonymous.status,portalCannotReadCms:scoped.status,wrongOwner:wrongOwner.status,cmsStatus:cms.status,ordersStatus:orders.status}));
if(setup.status!==200||publicCompany.status!==200||!Array.isArray(publicCompany.body.offerings)||catalog.status!==200||catalog.body.companies?.length!==30||anonymous.status!==401||scoped.status!==403||wrongOwner.status!==403||cms.status!==200||orders.status!==200)process.exitCode=1;
process.exit(process.exitCode||0);
