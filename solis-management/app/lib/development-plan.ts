type Work={id:string;kind:string;status:string;archived?:number;name:string;data:{dueDate?:string;priority?:string}};
export function manilaDay(now=new Date()){
 const parts=new Intl.DateTimeFormat('en',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const part=(type:string)=>parts.find(p=>p.type===type)!.value;
 return `${part('year')}-${part('month')}-${part('day')}`;
}
export function developmentPlan<T extends Work>(records:T[],day:string,limit=8){
 const reason=(r:T)=>r.data.dueDate&&r.data.dueDate<day?'Overdue':r.data.dueDate===day?'Due today':r.status==='Blocked'?'Resolve blocker':r.status==='In progress'?'Continue work':'Next from backlog';
 const rank=(r:T)=>['Overdue','Due today','Resolve blocker','Continue work','Next from backlog'].indexOf(reason(r));
 const priority=(r:T)=>({High:0,Normal:1,Low:2}[r.data.priority||'Normal']??1);
 const candidates=records.filter(r=>r.kind==='development'&&!r.archived&&r.status!=='Done'&&(!r.data.dueDate||r.data.dueDate<=day||r.status==='Blocked'||r.status==='In progress'));
 candidates.sort((a,b)=>rank(a)-rank(b)||(a.data.dueDate||'9999').localeCompare(b.data.dueDate||'9999')||priority(a)-priority(b)||a.name.localeCompare(b.name)||a.id.localeCompare(b.id));
 return {total:candidates.length,items:candidates.slice(0,limit).map(row=>({row,reason:reason(row)}))};
}
