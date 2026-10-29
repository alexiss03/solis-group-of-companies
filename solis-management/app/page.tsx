import { requireChatGPTUser } from './chatgpt-auth';
import Management, { type Module } from './management';
export const dynamic = 'force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<{view?:string}>}){const {view}=await searchParams;const allowed=['overview','companies','suppliers','employees','inventory','movements','orders'];const initialModule=(allowed.includes(view||'')?view:'overview') as Module;const user=await requireChatGPTUser('/?view='+initialModule);return <Management userName={user.displayName} initialModule={initialModule}/>;}
