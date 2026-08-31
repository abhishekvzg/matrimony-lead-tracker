"use client";

import { LEAD_STATUSES, type LeadStatus } from "@/lib/types";

const STATUS_STYLES: Record<LeadStatus, string> = {
  New: "bg-neutral-100 text-neutral-700",
  Reviewing: "bg-blue-50 text-blue-700",
  Contacted: "bg-sky-50 text-sky-700",
  "In Discussion": "bg-amber-50 text-amber-700",
  "Meeting Planned": "bg-violet-50 text-violet-700",
  "Meeting Done": "bg-emerald-50 text-emerald-700",
  "On Hold": "bg-neutral-100 text-neutral-500",
  Rejected: "bg-red-50 text-red-700",
  "Rejected by Other Side": "bg-red-50 text-red-700",
  Hide: "bg-neutral-200 text-neutral-500",
};

export default function StatusSelect({
  value,
  onChange,
  disabled,
}: {
  value: LeadStatus;
  onChange: (status: LeadStatus) => void;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => onChange(e.target.value as LeadStatus)}
      className={`text-xs sm:text-sm font-medium rounded-full px-2.5 py-1 border-0 focus:outline-none focus:ring-2 focus:ring-rose-400 cursor-pointer disabled:opacity-50 ${STATUS_STYLES[value]}`}
    >
      {LEAD_STATUSES.map((status) => (
        <option key={status} value={status}>
          {status}
        </option>
      ))}
    </select>
  );
}
