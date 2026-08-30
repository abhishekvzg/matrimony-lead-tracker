import { listLeadsWithRelations } from "@/lib/leads";
import Tracker from "@/components/Tracker";

export const dynamic = "force-dynamic";

export default async function TrackerPage() {
  const leads = await listLeadsWithRelations(false);
  return <Tracker initialLeads={leads} />;
}
