import { notFound } from 'next/navigation';
import { requireChatGPTUser } from '../../../chatgpt-auth';
import Management, { type Module } from '../../../management';
export const dynamic='force-dynamic';
export default async function CompanyPage({params}:{params:Promise<{company:string;section?:string[]}>}){const {company,section=[]}=await params;const areas=['overview','suppliers','employees','inventory','movements','orders'];if(!/^[a-z0-9-]{1,100}$/.test(company)||section.length>1||!areas.includes(section[0]||'inventory'))notFound();const area=(section[0]||'inventory') as Module;const user=await requireChatGPTUser('/companies/'+encodeURIComponent(company)+'/'+area);return <Management userName={user.displayName} initialCompany={company} initialModule={area}/>;}
