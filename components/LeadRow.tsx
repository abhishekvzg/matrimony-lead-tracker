"use client";

import type { Interaction, LeadStatus, LeadWithRelations } from "@/lib/types";
import StatusSelect from "./StatusSelect";
import LeadDetail from "./LeadDetail";
import Avatar from "./Avatar";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

export default function LeadRow({
  lead,
  expanded,
  onToggle,
  onStatusChange,
  onInteractionAdded,
  onLeadUpdated,
}: {
  lead: LeadWithRelations;
  expanded: boolean;
  onToggle: () => void;
  onStatusChange: (status: LeadStatus) => void;
  onInteractionAdded: (interaction: Interaction) => void;
  onLeadUpdated: (lead: LeadWithRelations) => void;
}) {
  return (
    <>
      <tr
        onClick={onToggle}
        className="cursor-pointer hover:bg-neutral-50 border-b border-neutral-100 last:border-0"
      >
        <td className="py-3 pl-4 pr-2 sm:pl-6">
          <div className="flex items-center gap-2">
            <span
              className={`text-neutral-400 text-xs transition-transform ${expanded ? "rotate-90" : ""}`}
            >
              ▶
            </span>
            <Avatar url={lead.profile_picture_url} size={28} />
            <span className="font-medium text-neutral-900">
              {lead.name || <span className="text-neutral-400 italic">Unnamed</span>}
            </span>
          </div>
        </td>
        <td className="py-3 px-2 hidden sm:table-cell text-neutral-600">
          {lead.age ?? "—"}
        </td>
        <td className="py-3 px-2 hidden sm:table-cell text-neutral-600">
          {lead.location ?? "—"}
        </td>
        <td className="py-3 px-2">
          <StatusSelect value={lead.status} onChange={onStatusChange} />
        </td>
        <td className="py-3 pl-2 pr-4 sm:pr-6 text-neutral-500 text-sm whitespace-nowrap">
          {formatDate(lead.updated_at)}
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={5} className="p-0">
            <LeadDetail
              lead={lead}
              onInteractionAdded={onInteractionAdded}
              onLeadUpdated={onLeadUpdated}
            />
          </td>
        </tr>
      )}
    </>
  );
}
