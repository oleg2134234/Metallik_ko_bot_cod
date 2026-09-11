import { requireChatGPTUser } from './chatgpt-auth';
import { listDialogs } from '@/db/queries';
import { Workspace } from '@/components/crm/workspace';

export default async function Home() {
  const user = await requireChatGPTUser('/');
  const dialogs = await listDialogs();
  return <Workspace initialDialogs={dialogs} managerName={user.displayName} />;
}
