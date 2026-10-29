import { RequestPage } from '../../portal';
import { notFound } from 'next/navigation';
export default async function CompanyPage({params}:{params:Promise<{company:string}>}){const {company}=await params;if(!/^[a-z0-9-]{1,100}$/.test(company))notFound();return <RequestPage slug={company}/>;}
