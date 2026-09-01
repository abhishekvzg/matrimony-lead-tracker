"use client";

import { LEAD_STATUSES, type LeadStatus } from "@/lib/types";

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
      className="field-input min-h-[38px] w-auto min-w-[108px] cursor-pointer py-1.5 text-xs sm:text-sm"
    >
      {LEAD_STATUSES.map((status) => (
        <option key={status} value={status}>
          {status}
        </option>
      ))}
    </select>
  );
}
