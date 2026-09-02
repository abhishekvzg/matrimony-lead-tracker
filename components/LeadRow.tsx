"use client";

import type { LeadStatus, LeadWithRelations } from "@/lib/types";
import StatusSelect from "./StatusSelect";
import Avatar from "./Avatar";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

// Traffic-light read on pipeline stage: green means it's moving toward a
// meeting, red means it's dead, amber means it's still open, and "New"/
// "Hide" stay neutral since nothing's actually happened yet either way.
const STATUS_ROW_TONE: Record<LeadStatus, string> = {
  New: "",
  Contacted: "bg-amber-50",
  "In Discussion": "bg-amber-50",
  "On Hold": "bg-amber-50",
  "Meeting Planned": "bg-green-50",
  "Meeting Done": "bg-green-50",
  Rejected: "bg-red-50",
  "Rejected by Other Side": "bg-red-50",
  Hide: "",
};

export default function LeadRow({
  lead,
  onSelect,
  onStatusChange,
}: {
  lead: LeadWithRelations;
  onSelect: () => void;
  onStatusChange: (status: LeadStatus) => void;
}) {
  return (
    <tr
      onClick={onSelect}
      className={`cursor-pointer border-b border-(--color-divider) last:border-0 hover:brightness-95 ${STATUS_ROW_TONE[lead.status]}`}
    >
      <td className="py-3 pr-2 pl-4 sm:pl-6">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={lead.name} url={lead.profile_picture_url} size={36} />
          <div className="min-w-0">
            <div className="truncate font-bold text-ink">
              {lead.name || <span className="italic text-(--color-label)">Unnamed</span>}
            </div>
            <div className="text-[13px] text-(--color-label) sm:hidden">
              {lead.age ?? "—"} yrs · {lead.location ?? "—"}
            </div>
          </div>
        </div>
      </td>
      <td className="hidden py-3 px-2 text-ink sm:table-cell">{lead.age ?? "—"}</td>
      <td className="hidden py-3 px-2 text-ink sm:table-cell">{lead.location ?? "—"}</td>
      <td className="py-3 px-2">
        <StatusSelect value={lead.status} onChange={onStatusChange} />
      </td>
      <td className="py-3 pr-4 pl-2 text-sm whitespace-nowrap text-(--color-label) sm:pr-6">
        {formatDate(lead.created_at)}
      </td>
    </tr>
  );
}
