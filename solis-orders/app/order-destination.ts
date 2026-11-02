import destinations from './order-destinations.json';

type Destination = {url:string;label:string;note:string};
export function orderDestination(company:{slug?:string;website?:string}):Destination|null {
 const destination=(destinations as Record<string,Destination>)[company.slug||''];
 if(!destination||!company.website)return null;
 try {
  const target=new URL(destination.url),website=new URL(company.website);
  return target.protocol==='https:'&&target.origin===website.origin?destination:null;
 } catch {return null;}
}
