import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { cmsRequest } from '../app/lib/cms-store.ts';
const sql=readFileSync(new URL('../drizzle/0000_numerous_zzzax.sql',import.meta.url),'utf8');
const seed=[{sourceId:1,name:'Company A',category:'Design',website:'',status:'Concept',logo:''},{sourceId:2,name:'Company B',category:'Commerce',website:'',status:'Concept',logo:''}];
function fixture(review={reviewedAt:'',entries:[]}){const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON;');sqlite.exec(sql);sqlite.exec(readFileSync(new URL('../drizzle/0001_fine_mother_askani.sql',import.meta.url),'utf8'));const statement=(sql,args=[])=>({bind(...bound){return statement(sql,bound);},async first(){return sqlite.prepare(sql).get(...args)||null;},async all(){return {results:sqlite.prepare(sql).all(...args)};},async run(){const r=sqlite.prepare(sql).run(...args);return {meta:{changes:Number(r.changes)}};},execute(){if(/^\s*SELECT/i.test(sql))return {results:sqlite.prepare(sql).all(...args),meta:{changes:0}};const r=sqlite.prepare(sql).run(...args);return {results:[],meta:{changes:Number(r.changes)}};}});const db={prepare:statement,async batch(statements){sqlite.exec('BEGIN');try{const result=statements.map(s=>s.execute());sqlite.exec('COMMIT');return result;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};const call=async(path=[],body,owner='owner',method='POST',extra={})=>{const response=await cmsRequest(new Request('https://cms.example/api/cms/'+path.join('/'),{method:body?method:'GET',headers:{'Content-Type':'application/json',...extra},body:body?JSON.stringify(body):undefined}),db,owner,path,seed,review);return {status:response.status,data:await response.json()};};return {call,sqlite};}

test('initialization is idempotent and all records are isolated by owner',async()=>{const {call}=fixture();assert.equal((await call([],undefined,'')).status,401);await call(['initialize'],{});await call(['initialize'],{});const own=await call();assert.equal(own.data.companies.length,2);assert.equal(own.data.companies[0].slug,'company-a');const other=await call([],undefined,'other');assert.equal(other.data.companies.length,0);const id=own.data.companies[0].id;assert.equal((await call(['companies',id],{archived:true},'other','PATCH')).status,404);assert.equal((await call(['companies'],{name:'Bad',category:'Test',website:'javascript:alert(1)'})).status,422);assert.equal((await call(['initialize'],{},'owner','POST',{'Origin':'https://evil.example'})).status,403);});

test('stock is atomic, cannot go negative, rejects stale edits, and preserves history',async()=>{const {call}=fixture();await call(['initialize'],{});const state=await call();const company=state.data.companies[0].id;const supplier={kind:'suppliers',company_id:company,name:'Supplier',data:{email:'supplier@example.com'}};assert.equal((await call(['records'],supplier)).status,201);const supplierRow=(await call()).data.records[0];const item={kind:'inventory',company_id:company,name:'Paper',sku:'P-1',quantity:5,reorder_level:2,data:{supplierId:supplierRow.id,unit:'packs',currency:'PHP',unitCost:50}};assert.equal((await call(['records'],item)).status,201);let data=(await call()).data;let row=data.records.find(r=>r.kind==='inventory');assert.equal(data.movements.length,1);assert.equal((await call(['records'],item)).status,409);assert.equal((await call()).data.movements.length,1);assert.equal((await call(['movements'],{item_id:row.id,type:'Issued',amount:6,note:'Too much',version:row.version})).status,422);assert.equal((await call(['movements'],{item_id:row.id,type:'Issued',amount:2,note:'Order',version:row.version})).status,200);assert.equal((await call(['movements'],{item_id:row.id,type:'Received',amount:1,note:'Stale',version:row.version})).status,409);data=(await call()).data;row=data.records.find(r=>r.kind==='inventory');assert.equal(row.quantity,3);assert.equal(data.movements.length,2);assert.equal((await call(['records',row.id],{archived:true,version:row.version},'owner','PATCH')).status,422);assert.equal((await call(['movements'],{item_id:row.id,type:'Adjustment',amount:-3,note:'Count correction',version:row.version})).status,200);row=(await call()).data.records.find(r=>r.id===row.id);assert.equal(row.quantity,0);assert.equal((await call(['records',row.id],{archived:true,version:row.version},'owner','PATCH')).status,200);row=(await call()).data.records.find(r=>r.id===row.id);assert.equal(row.archived,1);assert.equal((await call(['records',row.id],{archived:false,version:row.version},'owner','PATCH')).status,200);assert.equal((await call()).data.movements.length,3);});

test('supplier relationships stay within the same company and employees stay private',async()=>{const {call}=fixture();await call(['initialize'],{});const companies=(await call()).data.companies;await call(['records'],{kind:'suppliers',company_id:companies[0].id,name:'Vendor',data:{}});const supplier=(await call()).data.records[0];const cross=await call(['records'],{kind:'inventory',company_id:companies[1].id,name:'Item',data:{supplierId:supplier.id}});assert.equal(cross.status,422);assert.equal((await call(['records'],{kind:'employees',company_id:companies[0].id,name:'Employee',data:{email:'invalid'}})).status,422);assert.equal((await call(['records'],{kind:'employees',company_id:companies[0].id,name:'Employee',data:{email:'private@example.com'}})).status,201);assert.equal((await call([],undefined,'other')).data.records.length,0);assert.equal((await call(['companies',companies[0].id],{archived:true},'owner','PATCH')).status,422);});

test('development work validates dates and stages, isolates owners, and prevents stale changes',async()=>{
 const {call}=await fixture();await call(['initialize'],{});const company=(await call()).data.companies[0];
 const work={kind:'development',company_id:company.id,name:'Release milestone',status:'Backlog',data:{type:'Milestone',priority:'High',dueDate:'2026-12-01',assignee:'Team',notes:'Ready for review'}};
 assert.equal((await call(['records'],work)).status,201);let row=(await call()).data.records[0];assert.equal(row.data.type,'Milestone');assert.equal(row.quantity,0);
 for(const data of [{...work,status:'Published'},{...work,data:{...work.data,type:'Unknown'}},{...work,data:{...work.data,priority:'Urgent'}},{...work,data:{...work.data,dueDate:'2026-02-30'}},{...work,data:{...work.data,dueDate:'invalid'}}])assert.equal((await call(['records'],data)).status,422);
 assert.equal((await call(['records',row.id],{...work,status:'Done',version:row.version},'other','PATCH')).status,404);
 assert.equal((await call(['records',row.id],{...work,status:'Blocked',version:row.version},'owner','PATCH')).status,200);
 assert.equal((await call(['records',row.id],{...work,status:'Done',version:row.version},'owner','PATCH')).status,409);
 row=(await call()).data.records[0];assert.equal((await call(['records',row.id],{...work,status:'Done',version:row.version},'owner','PATCH')).status,200);
 row=(await call()).data.records[0];assert.equal((await call(['records',row.id],{archived:true,version:row.version},'owner','PATCH')).status,200);
 row=(await call()).data.records[0];assert.equal(row.archived,1);assert.equal((await call(['records',row.id],{archived:false,version:row.version},'owner','PATCH')).status,200);
 assert.equal((await call()).data.movements.length,0);assert.equal((await call([],undefined,'other')).data.records.length,0);
});


test('code review generation saves actionable tasks once and preserves edits, completion, archives, and company isolation',async()=>{
 const review={reviewedAt:'2026-11-03',entries:[{sourceId:1,key:'first-step',name:'Company A',stage:'Concept',title:'Build the first slice',priority:'High',effort:'45 min',finding:'No implementation yet',action:'Create a clickable first flow',acceptance:'One complete path works',evidence:'README.md:1'},{sourceId:2,key:'verify-flow',name:'Company B',stage:'Concept',title:'Verify the order flow',priority:'Normal',effort:'60 min',finding:'Order endpoint exists',action:'Test a fixture order',acceptance:'One order is stored once',evidence:'app.js:1'}]};
 const {call}=await fixture(review);await call(['initialize'],{});const state=(await call()).data;const [a,b]=state.companies;
 assert.equal((await call(['development','generate'],{company_id:a.id},'other')).status,404);
 const first=await call(['development','generate'],{company_id:a.id});assert.equal(first.data.created,1);assert.equal(first.data.unchanged,0);
 let row=(await call()).data.records[0];assert.equal(row.company_id,a.id);assert.equal(row.status,'Backlog');assert.match(row.data.notes,/Done when:/);assert.match(row.data.notes,/Code evidence: README.md:1/);assert.match(row.data.dueDate,/^\d{4}-\d{2}-\d{2}$/);
 assert.equal((await call(['development','generate'],{company_id:a.id})).data.created,0);
 const edit={kind:'development',company_id:a.id,name:'Owner-edited step',status:'Done',version:row.version,data:{...row.data,notes:'Owner completion notes'}};
 assert.equal((await call(['records',row.id],edit,'owner','PATCH')).status,200);
 assert.equal((await call(['development','generate'],{})).data.created,1);
 row=(await call()).data.records.find(r=>r.id===row.id);assert.equal(row.name,'Owner-edited step');assert.equal(row.data.notes,'Owner completion notes');assert.equal(row.status,'Done');
 await call(['records',row.id],{archived:true,version:row.version},'owner','PATCH');
 const concurrent=await Promise.all([call(['development','generate'],{}),call(['development','generate'],{})]);assert.equal(concurrent.reduce((n,r)=>n+r.data.created,0),0);assert.equal((await call()).data.records.length,2);
 assert.equal((await call()).data.records.find(r=>r.id===row.id).archived,1);
 assert.equal((await call(['development','generate'],{},'other')).data.created,0);
 assert.equal((await call()).data.movements.length,0);
 const none=await fixture();await none.call(['initialize'],{});assert.equal((await none.call(['development','generate'],{})).status,409);
});


test('social media records stay private and validate contacts, dates, links, and published evidence',async()=>{
 const {call}=await fixture();await call(['initialize'],{});const company=(await call()).data.companies[0];
 const contact={kind:'marketing',company_id:company.id,name:'Social contact',status:'Active',data:{type:'Contact',platform:'Instagram',email:'demo@example.test'}};
 assert.equal((await call(['records'],contact)).status,201);let row=(await call()).data.records.find(r=>r.kind==='marketing');assert.equal(row.data.category,'Social Media');assert.equal(row.data.email,'demo@example.test');
 assert.equal((await call(['records'],{...contact,data:{type:'Contact'}})).status,422);
 assert.equal((await call(['records'],{...contact,data:{...contact.data,profileUrl:'javascript:alert(1)'}})).status,422);
 assert.equal((await call(['records'],{...contact,data:{...contact.data,platform:'Unsupported'}})).status,422);
 assert.equal((await call(['records',row.id],{...contact,version:row.version},'other','PATCH')).status,404);
 const post={kind:'marketing',company_id:company.id,name:'Product launch',status:'Planned',data:{type:'Post',platform:'Instagram',publishDate:'2026-11-04',caption:'Draft content'}};
 assert.equal((await call(['records'],post)).status,201);
 assert.equal((await call(['records'],{...post,data:{...post.data,publishDate:'2026-02-30'}})).status,422);
 assert.equal((await call(['records'],{...post,status:'Published'})).status,422);
 assert.equal((await call(['records'],{...post,status:'Published',data:{...post.data,postUrl:'https://example.com/post'}})).status,201);
 assert.equal((await call(['records',row.id],{...contact,version:row.version},'owner','PATCH')).status,200);
 assert.equal((await call(['records',row.id],{...contact,version:row.version},'owner','PATCH')).status,409);
 row=(await call()).data.records.find(r=>r.id===row.id);assert.equal((await call(['records',row.id],{archived:true,version:row.version},'owner','PATCH')).status,200);
 assert.equal((await call([],undefined,'other')).data.records.length,0);assert.equal((await call()).data.movements.length,0);
});
