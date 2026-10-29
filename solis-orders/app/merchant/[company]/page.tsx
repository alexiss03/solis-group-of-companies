import MerchantPage from '../../merchant-page';
export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{company:string}>}){const {company}=await params;return <MerchantPage company={company}/>;}
