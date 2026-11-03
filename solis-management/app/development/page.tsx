import { requireChatGPTUser } from '../chatgpt-auth';
import Management from '../management';
export const dynamic='force-dynamic';
export default async function DevelopmentPage(){const user=await requireChatGPTUser('/development');return <Management userName={user.displayName} initialModule="development"/>;}
