import { RequestPage } from '../../portal';
import { notFound } from 'next/navigation';
export default async function CompanyPage({params,searchParams}:{params:Promise<{company:string}>;searchParams:Promise<{via?:string}>}){const {company}=await params;if(!/^[a-z0-9-]{1,100}$/.test(company))notFound();const query=await searchParams;return <RequestPage slug={company} forceSolis={query.via==='solis'}/>;}
