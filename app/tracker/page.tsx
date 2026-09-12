import { listLeadsWithRelations } from "@/lib/leads";
import Tracker from "@/components/Tracker";

export const dynamic = "force-dynamic";

export default async function TrackerPage(props: PageProps<"/tracker">) {
  const [leads, searchParams] = await Promise.all([
    listLeadsWithRelations(false),
    props.searchParams,
  ]);

  // `?lead=<id>` opens straight to that profile — used by the links the MCP
  // server hands back so they can be followed from a chat.
  const lead = searchParams.lead;

  return (
    <Tracker
      initialLeads={leads}
      initialSelectedLeadId={typeof lead === "string" ? lead : null}
    />
  );
}
