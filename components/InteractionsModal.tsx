"use client";

import type { Interaction, LeadWithRelations } from "@/lib/types";
import InteractionForm from "./InteractionForm";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function InteractionsModal({
  lead,
  onAdded,
  onClose,
}: {
  lead: LeadWithRelations;
  onAdded: (interaction: Interaction) => void;
  onClose: () => void;
}) {
  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog-panel" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between text-lg">
          <span>Interactions</span>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost px-2 text-lg leading-none"
            aria-label="Close"
          >
            &times;
          </button>
        </div>
        <div className="flex flex-col gap-3 overflow-y-auto">
          {lead.interactions.length === 0 ? (
            <p className="py-2 text-sm text-(--color-label)">No interactions logged yet.</p>
          ) : (
            lead.interactions.map((interaction) => (
              <div
                key={interaction.id}
                className="rounded-(--radius-xs) border border-(--color-divider) bg-white p-3"
              >
                <div className="mb-2 flex justify-between text-xs text-(--color-label)">
                  <span>{formatDate(interaction.interaction_date)}</span>
                  <span>{interaction.spoke_by}</span>
                </div>
                {interaction.notes && (
                  <p className="text-sm whitespace-pre-wrap text-ink">{interaction.notes}</p>
                )}
              </div>
            ))
          )}
          <InteractionForm leadId={lead.id} onAdded={onAdded} />
        </div>
      </div>
    </div>
  );
}
