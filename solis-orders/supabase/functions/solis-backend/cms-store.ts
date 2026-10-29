import type {AppDatabase as D1Database} from './postgres.ts';
export class CmsError extends Error { status: number; constructor(message:string,status=422){super(message);this.status=status;} }
type Row=Record<string,any>;
type Seed={sourceId:number;name:string;category:string;website:string;status:string;logo:string};
const slug=(name:string)=>name.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80)||'company';
const text=(v:unknown,max=2000)=>{const s=typeof v==='string'?v.trim():'';if(s.length>max)throw new CmsError(`A field exceeds ${max} characters.`);return s;};
const required=(v:unknown,label:string)=>{const s=text(v,140);if(!s)throw new CmsError(`${label} is required.`);return s;};
const numeric=(v:unknown,label:string,min=0,max=1e9)=>{const n=Number(v??0);if(!Number.isFinite(n)||n<min||n>max)throw new CmsError(`${label} must be between ${min} and ${max}.`);return Math.round(n*1e6)/1e6;};
const choice=(v:unknown,values:string[],fallback:string)=>{const s=text(v||fallback,80);if(!values.includes(s))throw new CmsError('Choose a valid status.');return s;};
const website=(v:unknown)=>{const s=text(v,1000);if(s){let u:URL;try{u=new URL(s);}catch{throw new CmsError('Enter a valid website URL.');}if(!['http:','https:'].includes(u.protocol))throw new CmsError('Use an HTTP or HTTPS URL.');}return s;};
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
const fields:Record<string,string[]>={suppliers:['contact','email','phone','address','notes'],employees:['role','department','email','phone','startDate','notes'],inventory:['category','unit','location','supplierId','currency','notes']};
export async function cmsRequest(request:Request,db:D1Database,owner:string,path:string[],seed:Seed[]=[]) {
 const q=(sql:string,...args:any[])=>db.prepare(sql).bind(...args);
 const company=async(id:string,archived=false)=>{const r=await q('SELECT * FROM cms_companies WHERE id=? AND owner=?',id,owner).first<Row>();if(!r||(!archived&&r.archived))throw new CmsError('Company not found or archived.',404);return r;};
 const record=async(id:string)=>{const r=await q('SELECT * FROM cms_records WHERE id=? AND owner=?',id,owner).first<Row>();if(!r)throw new CmsError('Record not found.',404);return r;};
 const input=async()=>{const raw=await request.text();if(raw.length>65536)throw new CmsError('The record is too large.',413);try{const b=JSON.parse(raw);if(!b||Array.isArray(b)||typeof b!=='object')throw 0;return b;}catch{throw new CmsError('Send a valid JSON record.',400);}};
 const now=new Date().toISOString();
 try {
  if(!owner)return reply({error:'Please sign in to manage this workspace.'},401);
  if(request.method!=='GET'){
   const origin=request.headers.get('origin');if((origin&&origin!==new URL(request.url).origin)||request.headers.get('sec-fetch-site')==='cross-site')return reply({error:'This request must come from your management workspace.'},403);
   if(!request.headers.get('content-type')?.includes('application/json'))return reply({error:'JSON content is required.'},415);
  }
  if(request.method==='GET'&&path.length===0){
   const r=await db.batch([q('SELECT * FROM cms_companies WHERE owner=? ORDER BY name COLLATE NOCASE',owner),q('SELECT * FROM cms_records WHERE owner=? ORDER BY name COLLATE NOCASE',owner),q('SELECT m.*,r.name AS item_name,c.name AS company_name FROM cms_movements m JOIN cms_records r ON r.id=m.item_id AND r.owner=m.owner JOIN cms_companies c ON c.id=m.company_id AND c.owner=m.owner WHERE m.owner=? ORDER BY m.created_at DESC,m.id DESC LIMIT 200',owner),q('SELECT * FROM cms_workspaces WHERE owner=?',owner)]);
   return reply({companies:r[0].results,records:r[1].results.map((x:any)=>({...x,data:JSON.parse(x.data)})),movements:r[2].results,initialized:r[3].results.length>0});
  }
  if(request.method==='POST'&&path[0]==='initialize'){
   await db.batch([...seed.map(s=>q('INSERT OR IGNORE INTO cms_companies (id,owner,name,slug,category,website,status,logo,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)',`${owner}:portfolio:${s.sourceId}`,owner,s.name,slug(s.name),s.category,s.website,s.status,s.logo,now,now)),q('INSERT OR IGNORE INTO cms_workspaces (owner,initialized_at) VALUES (?,?)',owner,now)]);
   const all=(await q('SELECT id,name,slug FROM cms_companies WHERE owner=?',owner).all<Row>()).results;
   const used=new Set(all.map(c=>c.slug).filter(Boolean));
   for(const row of all.filter(c=>!c.slug)){let key=slug(row.name);if(used.has(key))key+='-'+crypto.randomUUID().slice(0,8);used.add(key);await q('UPDATE cms_companies SET slug=? WHERE id=? AND owner=? AND slug IS NULL',key,row.id,owner).run();}
   return reply({ok:true});
  }
  if(path[0]==='companies'&&['POST','PATCH'].includes(request.method)){
   const b=await input(),old=path[1]?await company(path[1],true):null;if(request.method==='PATCH'&&!old)throw new CmsError('Company not found.',404);
   if(old&&typeof b.archived==='boolean'){
    if(b.archived){const active=await q('SELECT count(*) AS count FROM cms_records WHERE owner=? AND company_id=? AND archived=0',owner,old.id).first<Row>();if(active?.count)throw new CmsError('Archive this company’s active operational records first.');}
    await q('UPDATE cms_companies SET archived=?,updated_at=? WHERE id=? AND owner=?',b.archived?1:0,now,old.id,owner).run();return reply({ok:true});
   }
   const name=required(b.name,'Company name'),category=required(b.category,'Business area'),site=website(b.website),status=choice(b.status,['Published','In development','Concept'],'In development'),logo=website(b.logo);
   if(old)await q('UPDATE cms_companies SET name=?,category=?,website=?,status=?,logo=?,updated_at=? WHERE id=? AND owner=?',name,category,site,status,logo,now,old.id,owner).run();
   else await q('INSERT INTO cms_companies (id,owner,name,slug,category,website,status,logo,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)',crypto.randomUUID(),owner,name,slug(name)+'-'+crypto.randomUUID().slice(0,8),category,site,status,logo,now,now).run();return reply({ok:true},old?200:201);
  }
  if(path[0]==='records'&&['POST','PATCH'].includes(request.method)){
   const b=await input(),old=path[1]?await record(path[1]):null;if(request.method==='PATCH'&&!old)throw new CmsError('Record not found.',404);
   if(old&&Number(b.version)!==old.version)throw new CmsError('This record changed. Refresh and try again.',409);
   if(old&&typeof b.archived==='boolean'){
    if(b.archived&&old.kind==='inventory'&&old.quantity>0)throw new CmsError('Record stock out or adjust the balance to zero before archiving this item.');await company(old.company_id);
    const result=await q('UPDATE cms_records SET archived=?,version=version+1,updated_at=? WHERE id=? AND owner=? AND version=?',b.archived?1:0,now,old.id,owner,old.version).run();if(!result.meta.changes)throw new CmsError('This record changed. Refresh and try again.',409);return reply({ok:true});
   }
   const kind=text(old?.kind||b.kind,30);if(!Object.hasOwn(fields,kind))throw new CmsError('Choose a valid record type.');if(old?.archived)throw new CmsError('Restore this archived record before editing.');
   const companyId=required(b.company_id,'Company');await company(companyId);if(old&&old.company_id!==companyId)throw new CmsError('Create a new record to move to another company.');
   const name=required(b.name,'Name'),data:Row={};for(const key of fields[kind])data[key]=text(b.data?.[key],key==='notes'?3000:500);
   if(data.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))throw new CmsError('Enter a valid email address.');
   if(data.startDate&&(!/^\d{4}-\d{2}-\d{2}$/.test(data.startDate)||Number.isNaN(Date.parse(data.startDate))))throw new CmsError('Enter a valid start date.');
   if(kind==='inventory'){
    data.unit=data.unit||'pcs';data.currency=choice(data.currency,['PHP','USD','EUR','GBP','JPY'],'PHP');data.unitCost=numeric(b.data?.unitCost,'Unit cost',0,1e12);
    if(data.supplierId){const s=await record(data.supplierId);if(s.kind!=='suppliers'||s.company_id!==companyId||s.archived)throw new CmsError('Choose an active supplier from this company.');}
   }
   const status=kind==='employees'?choice(b.status,['Active','On leave','Inactive'],'Active'):choice(b.status,['Active','Inactive'],'Active');
   const sku=kind==='inventory'?(text(b.sku,80).toUpperCase()||null):null,reorder=kind==='inventory'?numeric(b.reorder_level,'Reorder level'):0;
   if(old){const result=await q('UPDATE cms_records SET name=?,status=?,data=?,sku=?,reorder_level=?,version=version+1,updated_at=? WHERE id=? AND owner=? AND version=?',name,status,JSON.stringify(data),sku,reorder,now,old.id,owner,old.version).run();if(!result.meta.changes)throw new CmsError('This record changed. Refresh and try again.',409);}
   else{
    const id=crypto.randomUUID(),quantity=kind==='inventory'?numeric(b.quantity,'Opening quantity'):0;
    const insert=q('INSERT INTO cms_records (id,owner,company_id,kind,name,status,data,sku,quantity,reorder_level,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',id,owner,companyId,kind,name,status,JSON.stringify(data),sku,quantity,reorder,now,now);
    await db.batch(quantity>0?[insert,q('INSERT INTO cms_movements (id,owner,company_id,item_id,type,delta,before_quantity,after_quantity,note,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)',crypto.randomUUID(),owner,companyId,id,'Opening',quantity,0,quantity,'Opening stock balance',now)]:[insert]);
   }return reply({ok:true},old?200:201);
  }
  if(path[0]==='movements'&&request.method==='POST'){
   const b=await input(),item=await record(required(b.item_id,'Item'));await company(item.company_id);if(item.kind!=='inventory'||item.archived)throw new CmsError('Choose an active inventory item.');
   const type=choice(b.type,['Received','Issued','Adjustment'],'Received'),amount=numeric(b.amount,'Quantity',type==='Adjustment'?-1e9:0.000001),delta=type==='Issued'?-amount:amount,note=required(b.note,'Reason');
   if(!delta)throw new CmsError('Quantity must not be zero.');if(Number(b.version)!==item.version)throw new CmsError('Stock changed. Refresh and try again.',409);
   const after=Math.round((item.quantity+delta)*1e6)/1e6;if(after<0)throw new CmsError('There is not enough stock for this movement.');if(after>1e9)throw new CmsError('Stock exceeds the supported quantity.');
   const token=crypto.randomUUID(),result=await db.batch([
    q('UPDATE cms_records SET quantity=?,version=version+1,last_movement=?,updated_at=? WHERE id=? AND owner=? AND version=? AND archived=0',after,token,now,item.id,owner,item.version),
    q('INSERT INTO cms_movements (id,owner,company_id,item_id,type,delta,before_quantity,after_quantity,note,created_at) SELECT ?,owner,company_id,id,?,?,?,?,?,? FROM cms_records WHERE id=? AND owner=? AND last_movement=?',token,type,delta,item.quantity,after,note,now,item.id,owner,token),
   ]);if(!result[0].meta.changes)throw new CmsError('Stock changed. Refresh and try again.',409);return reply({ok:true});
  }
  return reply({error:'Endpoint not found.'},404);
 }catch(error){if(error instanceof CmsError)return reply({error:error.message},error.status);if(String(error).includes('UNIQUE constraint'))return reply({error:'This SKU is already used by this company, including archived items.'},409);console.error('CMS request failed:',error instanceof Error?error.name:'Unknown error');return reply({error:'The record could not be saved. Please try again.'},500);}
}
