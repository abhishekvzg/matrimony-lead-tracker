"use client";

import { useState } from "react";
import type { Interaction, LeadWithRelations } from "@/lib/types";
import InteractionForm from "./InteractionForm";
import AttachmentLightbox from "./AttachmentLightbox";

type DisplayFieldKey =
  | "height"
  | "education"
  | "profession"
  | "location"
  | "income"
  | "father_occupation"
  | "mother_occupation"
  | "siblings"
  | "source";

const FIELD_LABELS: { key: DisplayFieldKey; label: string }[] = [
  { key: "height", label: "Height" },
  { key: "education", label: "Education" },
  { key: "profession", label: "Profession" },
  { key: "location", label: "Location" },
  { key: "income", label: "Income" },
  { key: "father_occupation", label: "Father's Occupation" },
  { key: "mother_occupation", label: "Mother's Occupation" },
  { key: "siblings", label: "Siblings" },
  { key: "source", label: "Source" },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function LeadDetail({
  lead,
  onArchive,
  onInteractionAdded,
}: {
  lead: LeadWithRelations;
  onArchive: () => void;
  onInteractionAdded: (interaction: Interaction) => void;
}) {
  const [lightbox, setLightbox] = useState<{ url: string; name: string | null } | null>(null);

  return (
    <div className="px-4 sm:px-6 py-4 bg-neutral-50 border-t border-neutral-200 flex flex-col gap-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
        {FIELD_LABELS.map(({ key, label }) => {
          const value = lead[key];
          return (
            <div key={key} className="flex justify-between sm:justify-start sm:gap-2 text-sm py-1 border-b border-neutral-100 sm:border-0">
              <span className="text-neutral-500">{label}</span>
              <span className="text-neutral-900 font-medium sm:font-normal">
                {value || <span className="text-neutral-300">—</span>}
              </span>
            </div>
          );
        })}
      </div>

      {lead.other_details && (
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wide text-neutral-500 mb-1">
            Other details
          </h3>
          <p className="text-sm text-neutral-800 whitespace-pre-wrap">{lead.other_details}</p>
        </div>
      )}

      {lead.attachments.length > 0 && (
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wide text-neutral-500 mb-2">
            Attachments
          </h3>
          <div className="flex flex-wrap gap-2">
            {lead.attachments.map((a) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={a.id}
                src={a.file_url}
                alt={a.file_name ?? "Attachment"}
                onClick={() => setLightbox({ url: a.file_url, name: a.file_name })}
                className="h-20 w-20 object-cover rounded-md border border-neutral-200 cursor-pointer hover:opacity-80 transition-opacity"
              />
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-xs font-medium uppercase tracking-wide text-neutral-500 mb-2">
          Interaction timeline
        </h3>
        <div className="flex flex-col gap-2 mb-3">
          {lead.interactions.length === 0 && (
            <p className="text-sm text-neutral-400">No updates yet.</p>
          )}
          {lead.interactions.map((interaction) => (
            <div
              key={interaction.id}
              className="flex flex-col gap-0.5 text-sm bg-white rounded-md px-3 py-2 border border-neutral-200"
            >
              <div className="flex justify-between text-xs text-neutral-500">
                <span>{formatDate(interaction.interaction_date)}</span>
                <span className="font-medium">{interaction.spoke_by}</span>
              </div>
              {interaction.notes && (
                <p className="text-neutral-800 whitespace-pre-wrap">{interaction.notes}</p>
              )}
            </div>
          ))}
        </div>
        <InteractionForm leadId={lead.id} onAdded={onInteractionAdded} />
      </div>

      <div>
        <button
          onClick={onArchive}
          className="text-sm text-neutral-500 hover:text-red-600 border border-neutral-300 hover:border-red-300 rounded-md px-3 py-1.5 transition-colors"
        >
          Archive
        </button>
      </div>

      {lightbox && (
        <AttachmentLightbox
          url={lightbox.url}
          name={lightbox.name}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  );
}
