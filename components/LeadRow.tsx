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
      className="cursor-pointer border-b border-(--color-divider) last:border-0 hover:bg-accent-100/40"
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
        {formatDate(lead.updated_at)}
      </td>
    </tr>
  );
}
