import { requireChatGPTUser } from './chatgpt-auth';
import { Header,Footer } from './portal';
import OrdersBoard from './orders-board';
export const dynamic='force-dynamic';
export default async function MerchantPage({company}:{company?:string}){await requireChatGPTUser(company?'/merchant/'+encodeURIComponent(company):'/merchant');return <><Header/><main className="merchant-main"><OrdersBoard companySlug={company}/></main><Footer/></>;}
