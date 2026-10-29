import test,{after} from 'node:test';
import assert from 'node:assert/strict';
const {PGlite}=await import(process.env.SOLIS_PGLITE_MODULE||'@electric-sql/pglite');
import {AppDatabase} from '../functions/solis-backend/postgres.ts';
import {readFileSync,readdirSync} from 'node:fs';
import {commerceRequest,secretMatches} from '../functions/solis-backend/commerce-store.ts';
const migration=readdirSync(new URL('../migrations/',import.meta.url)).filter(f=>f.endsWith('.sql')).sort().map(f=>readFileSync(new URL('../migrations/'+f,import.meta.url),'utf8')).join('\n');
const databases=[];after(async()=>{for(const db of databases)await db.close();});
async function postgresFixture(){
 const pg=await PGlite.create();databases.push(pg);await pg.exec('CREATE ROLE anon; CREATE ROLE authenticated;');await pg.exec(migration);
 const wrap=client=>({async unsafe(sql,args=[]){const r=await client.query(sql,args);const rows=r.rows;rows.count=r.affectedRows;return rows;}});
 const executor={...wrap(pg),async begin(fn){return pg.transaction(tx=>fn(wrap(tx)));}};
 const db=new AppDatabase(executor);return {pg,db};
}
const owner={userId:'owner',email:'owner@example.com',displayName:'Owner'},merchant={userId:'merchant',email:'merchant@example.com',displayName:'Merchant'};
const companySeed=[{slug:'company-a',name:'Company A',category:'Design',description:'A company',website:'',logo:''},{slug:'company-b',name:'Company B',category:'Services',description:'Another company',website:'',logo:''}];
async function fixture(){const {db,pg}=await postgresFixture();const call=async(path,body,options={})=>{const {identity=null,bridge=false,method=body?'POST':'GET',headers={},ip='127.0.0.1'}=options;const response=await commerceRequest(new Request('https://orders.example/api/commerce/'+path,{method,headers:{'Content-Type':'application/json',...headers},body:body?JSON.stringify(body):undefined}),db,{identity,bridge,adminEmail:owner.email,rateSalt:'test-salt',ip},new URL('https://orders.example/'+path).pathname.slice(1).split('/'));return {status:response.status,data:await response.json()};};return {call,pg};}
async function setup(){const f=await fixture();assert.equal((await f.call('sync',{companies:companySeed},{bridge:true})).status,200);return f;}
function request(overrides={}){return {companySlug:'company-a',customerName:'Test Customer',customerEmail:'customer@example.com',customerPhone:'0000000000',type:'Product order',title:'Test request',details:'A fictional request used by automated tests.',quantity:2,method:'Pickup',consent:true,trackingKey:crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-',''),requestKey:crypto.randomUUID(),...overrides};}

test('public submissions are idempotent and private tracking exposes only customer-safe fields',async()=>{const {call}=await setup();const body=request();const created=await call('requests',body);assert.equal(created.status,201);const duplicate=await call('requests',body);assert.equal(duplicate.status,200);assert.equal(duplicate.data.id,created.data.id);assert.equal((await call('requests',{...body,trackingKey:'f'.repeat(64)})).status,409);assert.equal((await call('track/'+created.data.id)).status,404);assert.equal((await call('track/'+created.data.id,undefined,{headers:{'X-Tracking-Key':'a'.repeat(64)}})).status,404);const track=await call('track/'+created.data.id,undefined,{headers:{'X-Tracking-Key':body.trackingKey}});assert.equal(track.status,200);assert.equal(track.data.order.status,'New');assert.equal(track.data.events.length,1);for(const key of ['customer_email','customer_phone','customer_name','tracking_hash','request_key','rate_key'])assert.equal(key in track.data.order,false);assert.equal((await call('orders?company=company-a')).status,401);});

test('merchant access is company-specific, revocable, and cannot grant other operators',async()=>{const {call}=await setup();const a=await call('requests',request());const b=await call('requests',request({companySlug:'company-b'}));assert.equal((await call('members',{companySlug:'company-a',email:merchant.email},{identity:merchant})).status,403);await call('members',{companySlug:'company-a',email:merchant.email},{identity:owner});assert.equal((await call('orders?company=company-a',undefined,{identity:merchant})).data.orders.length,1);assert.equal((await call('orders?company=company-b',undefined,{identity:merchant})).status,403);assert.equal((await call('orders/'+b.data.id,undefined,{identity:merchant})).status,403);assert.equal((await call('orders/'+b.data.id,{status:'Confirmed',version:0},{identity:merchant,method:'PATCH'})).status,403);assert.equal((await call('orders',undefined,{identity:merchant})).data.orders.length,1);const member=(await call('members?company=company-a',undefined,{identity:owner})).data.members[0];await call('members/'+member.id,{active:false},{identity:owner,method:'PATCH'});assert.equal((await call('orders/'+a.data.id,undefined,{identity:merchant})).status,403);});

test('fulfillment requires explicit confirmation, preserves history, and keeps internal notes private',async()=>{const {call}=await setup();const body=request();const {data:created}=await call('requests',body);const id=created.id;let version=0;const update=(status,extra={})=>call('orders/'+id,{status,version,...extra},{identity:owner,method:'PATCH'});assert.equal((await update('Fulfilled',{confirmFulfilled:true,fulfillmentNote:'Invalid shortcut'})).status,422);assert.equal((await update('Confirmed',{customerNote:'We can fulfill your request.'})).status,200);version++;assert.equal((await update('Confirmed',{internalNote:'SECRET PRIVATE NOTE'})).status,200);version++;assert.equal((await update('In progress')).status,200);version++;assert.equal((await update('Ready',{customerNote:'Ready for pickup.'})).status,200);version++;assert.equal((await update('Fulfilled',{fulfillmentNote:'Handed over to the customer.'})).status,422);assert.equal((await update('Fulfilled',{confirmFulfilled:true})).status,422);assert.equal((await update('Fulfilled',{confirmFulfilled:true,fulfillmentNote:'Handed over to the customer.'})).status,200);version++;const detail=(await call('orders/'+id,undefined,{identity:owner})).data;assert.equal(detail.order.status,'Fulfilled');assert.ok(detail.order.fulfilled_at);assert.equal(detail.events.length,6);assert.ok(JSON.stringify(detail).includes('SECRET PRIVATE NOTE'));const track=(await call('track/'+id,undefined,{headers:{'X-Tracking-Key':body.trackingKey}})).data;assert.equal(track.order.status,'Fulfilled');assert.equal(track.events.length,5);assert.equal(JSON.stringify(track).includes('SECRET PRIVATE NOTE'),false);assert.equal(JSON.stringify(track).includes('actor_email'),false);assert.equal((await update('Cancelled',{customerNote:'Cannot reopen.'})).status,422);assert.equal((await call('orders/'+id,{status:'Fulfilled',version:0,internalNote:'Stale'},{identity:owner,method:'PATCH'})).status,409);});

test('public writes enforce consent, company availability, origin checks and per-connection limits',async()=>{const {call}=await setup();assert.equal((await call('requests',request({consent:false}))).status,422);assert.equal((await call('requests',request({websiteCheck:'spam'}))).status,422);assert.equal((await call('requests',request({customerEmail:'invalid'}))).status,422);assert.equal((await call('requests',request({method:'Delivery',location:''}))).status,422);assert.equal((await call('requests',request(),{headers:{Origin:'https://evil.example'}})).status,403);await call('companies/company-b',{accepting:false},{bridge:true,method:'PATCH'});assert.equal((await call('requests',request({companySlug:'company-b'}))).status,409);for(let i=0;i<10;i++)assert.equal((await call('requests',request())).status,201);assert.equal((await call('requests',request())).status,429);const list=await call('orders?company=company-a',undefined,{identity:owner});assert.equal(list.data.orders.length,10);assert.equal(list.data.counts.New,10);assert.equal((await call('orders?cursor=bad',undefined,{identity:owner})).status,422);});

test('shared server credentials compare safely and empty credentials never authorize',async()=>{assert.equal(await secretMatches('abc','abc'),true);assert.equal(await secretMatches('abc','def'),false);assert.equal(await secretMatches('',''),false);});

test('older order pages use stable cursors and do not drop requests',async()=>{const {call}=await setup();for(let i=0;i<55;i++)assert.equal((await call('requests',request(),{ip:'connection-'+i})).status,201);const first=await call('orders?company=company-a',undefined,{identity:owner});assert.equal(first.data.orders.length,50);assert.ok(first.data.cursor);const second=await call('orders?company=company-a&cursor='+encodeURIComponent(first.data.cursor),undefined,{identity:owner});assert.equal(second.data.orders.length,5);assert.equal(second.data.cursor,null);assert.equal(new Set([...first.data.orders,...second.data.orders].map(x=>x.id)).size,55);});

test('merchant setup and offerings are isolated by company and revoked operators cannot edit',async()=>{
 const {call}=await setup();
 const profile={location:'Preview City',deliveryScope:'Local',deliveryAreas:'Preview City central district',deliveryNotes:'Delivery fee confirmed after review.',methods:['Pickup','Delivery']};
 assert.equal((await call('setup/company-a',profile,{method:'PATCH'})).status,401);
 await call('members',{companySlug:'company-a',email:merchant.email},{identity:owner});
 assert.equal((await call('setup/company-a',profile,{identity:merchant,method:'PATCH'})).status,200);
 assert.equal((await call('setup/company-b',profile,{identity:merchant,method:'PATCH'})).status,403);
 const offering={companySlug:'company-a',name:'Preview product',description:'Fictional test only.',kind:'Product',pricing:'Fixed',price:'1250.50',currency:'PHP',unit:'item',leadMin:2,leadMax:4,leadUnit:'Days',active:true};
 assert.equal((await call('offerings',offering,{identity:merchant})).status,201);
 const publicPage=(await call('companies/company-a')).data;assert.equal(publicPage.merchant.location,'Preview City');assert.equal(publicPage.offerings[0].price_minor,125050);assert.equal(JSON.stringify(publicPage).includes(merchant.email),false);
 const item=(await call('setup/company-a',undefined,{identity:owner})).data.offerings[0];
 assert.equal((await call('offerings/'+item.id,{active:false,version:item.version},{identity:merchant,method:'PATCH'})).status,200);
 assert.equal((await call('companies/company-a')).data.offerings.length,0);
 const grant=(await call('members?company=company-a',undefined,{identity:owner})).data.members[0];await call('members/'+grant.id,{active:false},{identity:owner,method:'PATCH'});
 assert.equal((await call('setup/company-a',undefined,{identity:merchant})).status,403);
 assert.equal((await call('offerings/'+item.id,{active:true,version:1},{identity:merchant,method:'PATCH'})).status,403);
});

test('offering requests use server prices, confirm delivery coverage, and retain immutable submitted details',async()=>{
 const {call}=await setup();const profile={location:'Preview City',deliveryScope:'Local',deliveryAreas:'Central district only',deliveryNotes:'Fee agreed separately',methods:['Pickup','Delivery']};
 await call('setup/company-a',profile,{bridge:true,method:'PATCH'});
 const draft={companySlug:'company-a',name:'Preview product',kind:'Product',pricing:'From',price:'800.25',currency:'PHP',unit:'item',leadMin:2,leadMax:3,leadUnit:'Days'};
 await call('offerings',draft,{identity:owner});const page=(await call('companies/company-a')).data,o=page.offerings[0];
 const body=request({companySlug:'company-a',offeringId:o.id,offeringVersion:o.version,profileVersion:page.merchant.version,type:'Product order',method:'Delivery',location:'Central district',quantity:2,price:'0.01'});
 assert.equal((await call('requests',body)).status,422);
 assert.equal((await call('requests',{...body,coverageConfirmed:true,method:'Online'})).status,422);
 assert.equal((await call('requests',{...body,coverageConfirmed:true,offeringVersion:77})).status,409);
 const created=await call('requests',{...body,coverageConfirmed:true});assert.equal(created.status,201);
 const track=(await call('track/'+created.data.id,undefined,{headers:{'X-Tracking-Key':body.trackingKey}})).data;
 const snapshot=JSON.parse(track.order.offering_snapshot);assert.equal(snapshot.price_minor,80025);assert.equal(snapshot.estimated_total_minor,160050);assert.equal(snapshot.delivery_areas,'Central district only');
 await call('offerings/'+o.id,{...draft,price:'999',version:0},{identity:owner,method:'PATCH'});
 await call('setup/company-a',{...profile,deliveryAreas:'New coverage',version:0},{identity:owner,method:'PATCH'});
 const unchanged=JSON.parse((await call('track/'+created.data.id,undefined,{headers:{'X-Tracking-Key':body.trackingKey}})).data.order.offering_snapshot);
 assert.deepEqual(unchanged,snapshot);assert.equal((await call('requests',{...body,coverageConfirmed:true})).status,200);
 const fresh=request({...body,requestKey:crypto.randomUUID(),coverageConfirmed:true});assert.equal((await call('requests',fresh)).status,409);
 await call('offerings/'+o.id,{active:false,version:1},{identity:owner,method:'PATCH'});
 assert.equal((await call('requests',request({...body,requestKey:crypto.randomUUID(),coverageConfirmed:true,offeringVersion:2,profileVersion:1}))).status,409);
});

test('merchant fields validate money, lead ranges, coverage, and optimistic updates',async()=>{
 const {call}=await setup();const profile={location:'Preview City',deliveryScope:'Local',deliveryAreas:'Central district',methods:['Delivery']};
 const offering={companySlug:'company-a',name:'Test service',kind:'Service',pricing:'Quote',currency:'PHP',unit:'project',leadMin:1,leadMax:2,leadUnit:'Weeks'};
 assert.equal((await call('offerings',offering,{identity:owner})).status,422);
 assert.equal((await call('setup/company-a',{...profile,deliveryAreas:''},{bridge:true,method:'PATCH'})).status,422);
 assert.equal((await call('setup/company-a',{...profile,methods:[]},{bridge:true,method:'PATCH'})).status,422);
 assert.equal((await call('setup/company-a',{...profile,deliveryScope:'Online only'},{bridge:true,method:'PATCH'})).status,422);
 await call('setup/company-a',profile,{bridge:true,method:'PATCH'});
 assert.equal((await call('setup/company-a',{...profile,version:99},{bridge:true,method:'PATCH'})).status,409);
 assert.equal((await call('offerings',{...offering,leadMin:3,leadMax:1},{identity:owner})).status,422);
 assert.equal((await call('offerings',{...offering,pricing:'Fixed',price:'1.234'},{identity:owner})).status,422);
 assert.equal((await call('offerings',{...offering,pricing:'Fixed',price:''},{identity:owner})).status,422);
 assert.equal((await call('offerings',offering,{identity:owner})).status,201);
 assert.equal((await call('companies/company-a')).data.offerings[0].price_minor,null);
 assert.equal((await call('offerings',{...offering,name:'Maximum price',pricing:'Fixed',price:'100000000'},{identity:owner})).status,201);
});
