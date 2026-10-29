// A small compatibility adapter keeps the audited application rules shared with Sites.
// SQL is generated only by those rules, never accepted from an HTTP caller.
export function postgresQuery(query:string){
 let index=0;
 const ignore=/^INSERT OR IGNORE INTO /.test(query);
 let sql=query.replace(/^INSERT OR IGNORE INTO /,'INSERT INTO ')
  .replace(/\b([a-z_]+\.)?name COLLATE NOCASE/g,(_,prefix)=>`lower(${prefix||''}name)`)
  .replace(/\bLIKE\b/g,'ILIKE')
  .replace(/\b(commerce_(?:companies|events|members|orders|profiles|offerings)|cms_(?:companies|records|movements|workspaces))\b/g,'solis.$1')
  .replace(/\?/g,()=>`$${++index}`);
 if(ignore)sql+=' ON CONFLICT DO NOTHING';
 return sql;
}
type Executor={unsafe:(query:string,args?:any[])=>Promise<any>};
export class Statement{
 readonly sql:string;readonly args:any[];private executor:Executor;
 constructor(sql:string,args:any[],executor:Executor){this.sql=sql;this.args=args;this.executor=executor;}
 bind(...args:any[]){return new Statement(this.sql,args,this.executor);}
 async execute(executor=this.executor){
  try{
   const rows=await executor.unsafe(postgresQuery(this.sql),this.args);
   return {results:Array.from(rows,(row:any)=>({...row,...('count' in row?{count:Number(row.count)}:{}),...('price_minor' in row?{price_minor:row.price_minor===null?null:Number(row.price_minor)}:{})})),meta:{changes:/^SELECT/i.test(this.sql)?0:Number(rows.count||0)}};
  }catch(error:any){if(error.code==='23505')throw new Error('UNIQUE constraint');throw error;}
 }
 async first<T=Record<string,any>>(){return (await this.execute()).results[0] as T||null;}
 async all<T=Record<string,any>>(){return await this.execute() as unknown as {results:T[];meta:{changes:number}};}
 async run(){return this.execute();}
}
export class AppDatabase{
 private sql:any;constructor(sql:any){this.sql=sql;}
 prepare(query:string){return new Statement(query,[],this.sql);}
 async batch(statements:Statement[]){
  return this.sql.begin(async(tx:Executor)=>{
   // Serializes the count-and-insert rate check, as D1 batch did originally.
   const request=statements.find(s=>s.sql.startsWith('INSERT INTO commerce_orders '));
   if(request)await tx.unsafe('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[request.args[15]]);
   const result=[];for(const statement of statements)result.push(await statement.execute(tx));return result;
  });
 }
}
