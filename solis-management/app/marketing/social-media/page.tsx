import { requireChatGPTUser } from '../../chatgpt-auth';
import Management from '../../management';
export const dynamic='force-dynamic';
export default async function MarketingPage(){const user=await requireChatGPTUser('/marketing/social-media');return <Management userName={user.displayName} initialModule="marketing"/>;}
