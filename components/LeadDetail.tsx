"use client";

import { useState } from "react";
import { COMPATIBILITY_THRESHOLD, type Interaction, type LeadWithRelations } from "@/lib/types";
import InteractionForm from "./InteractionForm";
import AttachmentLightbox from "./AttachmentLightbox";
import EditLeadForm from "./EditLeadForm";
import Avatar from "./Avatar";

type DisplayFieldKey =
  | "height"
  | "weight"
  | "complexion"
  | "date_of_birth"
  | "time_of_birth"
  | "place_of_birth"
  | "education"
  | "profession"
  | "income"
  | "location"
  | "rashi"
  | "nakshatra"
  | "nakshatra_padam"
  | "father_name"
  | "father_occupation"
  | "mother_name"
  | "mother_occupation"
  | "siblings"
  | "religion"
  | "caste"
  | "gotra"
  | "address"
  | "source";

const PERSONAL_FIELDS: { key: DisplayFieldKey; label: string }[] = [
  { key: "height", label: "Height" },
  { key: "weight", label: "Weight" },
  { key: "complexion", label: "Complexion" },
  { key: "date_of_birth", label: "Date of Birth" },
  { key: "time_of_birth", label: "Time of Birth" },
  { key: "place_of_birth", label: "Place of Birth" },
  { key: "education", label: "Education" },
  { key: "profession", label: "Profession" },
  { key: "income", label: "Income" },
  { key: "location", label: "Location" },
];

const ASTROLOGY_FIELDS: { key: DisplayFieldKey; label: string }[] = [
  { key: "rashi", label: "Rashi" },
  { key: "nakshatra", label: "Nakshatra" },
  { key: "nakshatra_padam", label: "Padam" },
];

const FAMILY_FIELDS: { key: DisplayFieldKey; label: string }[] = [
  { key: "father_name", label: "Father's Name" },
  { key: "father_occupation", label: "Father's Occupation" },
  { key: "mother_name", label: "Mother's Name" },
  { key: "mother_occupation", label: "Mother's Occupation" },
  { key: "siblings", label: "Siblings" },
  { key: "religion", label: "Religion" },
  { key: "caste", label: "Caste" },
  { key: "gotra", label: "Gotra" },
];

const CONTACT_FIELDS: { key: DisplayFieldKey; label: string }[] = [
  { key: "address", label: "Address" },
  { key: "source", label: "Source" },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateOnly(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function toTelHref(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `tel:+91${digits}`;
  return `tel:+${digits}`;
}

function FieldGroup({
  title,
  fields,
  lead,
}: {
  title: string;
  fields: { key: DisplayFieldKey; label: string }[];
  lead: LeadWithRelations;
}) {
  return (
    <div>
      <h3 className="text-xs font-medium uppercase tracking-wide text-neutral-500 mb-2">
        {title}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
        {fields.map(({ key, label }) => {
          const raw = lead[key];
          const value = key === "date_of_birth" && raw ? formatDateOnly(raw) : raw;
          return (
            <div
              key={key}
              className="flex justify-between sm:justify-start sm:gap-2 text-sm py-1 border-b border-neutral-100 sm:border-0"
            >
              <span className="text-neutral-500">{label}</span>
              <span className="text-neutral-900 font-medium sm:font-normal">
                {value || <span className="text-neutral-300">—</span>}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CompatibilityBadge({
  lead,
  onSelectPadam,
  selectingPadam,
}: {
  lead: LeadWithRelations;
  onSelectPadam: (padam: string) => void;
  selectingPadam: boolean;
}) {
  if (!lead.nakshatra) return null;

  if (!lead.nakshatra_padam) {
    if (!lead.padam_options || lead.padam_options.length === 0) {
      return (
        <p className="text-xs text-neutral-400 mt-2">
          Add padam to calculate compatibility
        </p>
      );
    }
    return (
      <div className="mt-2">
        <p className="text-xs text-neutral-500 mb-1.5">Which padam?</p>
        <div className="flex gap-1.5 flex-wrap">
          {lead.padam_options.map(({ padam, score }) => {
            const compatible = score !== null && score >= COMPATIBILITY_THRESHOLD;
            return (
              <button
                key={padam}
                type="button"
                disabled={selectingPadam}
                onClick={() => onSelectPadam(padam)}
                className={`text-xs font-medium rounded-full px-2.5 py-1 hover:ring-2 hover:ring-rose-300 transition-shadow disabled:opacity-50 ${
                  compatible ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                }`}
              >
                Padam {padam} · {score !== null ? `${score}/36` : "—"}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const score = lead.compatibility_score;
  const compatible = score !== null && score >= COMPATIBILITY_THRESHOLD;

  return (
    <div className="flex items-center gap-2 mt-2">
      <span
        className={`text-xs font-medium rounded-full px-2.5 py-1 ${
          compatible ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
        }`}
      >
        {score !== null ? `${score}/36 · ` : ""}
        {compatible ? "Compatible" : "Not Compatible"}
      </span>
      {lead.is_score_overridden && (
        <span className="text-xs text-neutral-400">(manually set)</span>
      )}
    </div>
  );
}

export default function LeadDetail({
  lead,
  onInteractionAdded,
  onLeadUpdated,
}: {
  lead: LeadWithRelations;
  onInteractionAdded: (interaction: Interaction) => void;
  onLeadUpdated: (lead: LeadWithRelations) => void;
}) {
  const [lightbox, setLightbox] = useState<{ url: string; name: string | null } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [selectingPadam, setSelectingPadam] = useState(false);

  async function handleSelectPadam(padam: string) {
    setSelectingPadam(true);
    try {
      await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nakshatra_padam: padam }),
      });
      const res = await fetch(`/api/leads/${lead.id}`);
      if (res.ok) {
        const { lead: freshLead } = await res.json();
        onLeadUpdated(freshLead);
      }
    } finally {
      setSelectingPadam(false);
    }
  }

  if (isEditing) {
    return (
      <div className="px-4 sm:px-6 py-4 bg-neutral-50 border-t border-neutral-200">
        <EditLeadForm
          lead={lead}
          onSaved={(updated) => {
            onLeadUpdated(updated);
            setIsEditing(false);
          }}
          onLeadRefresh={onLeadUpdated}
          onCancel={() => setIsEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 py-4 bg-neutral-50 border-t border-neutral-200 flex flex-col gap-6">
      <div className="flex items-center justify-between -mb-2">
        <Avatar url={lead.profile_picture_url} size={64} />
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="text-sm text-neutral-500 hover:text-rose-600 flex items-center gap-1"
        >
          ✎ Edit
        </button>
      </div>

      <FieldGroup title="Personal" fields={PERSONAL_FIELDS} lead={lead} />

      <div>
        <FieldGroup title="Astrology" fields={ASTROLOGY_FIELDS} lead={lead} />
        <CompatibilityBadge
          lead={lead}
          onSelectPadam={handleSelectPadam}
          selectingPadam={selectingPadam}
        />
      </div>

      <FieldGroup title="Family" fields={FAMILY_FIELDS} lead={lead} />

      <div className="flex flex-col gap-4">
        <FieldGroup title="Contact" fields={CONTACT_FIELDS} lead={lead} />
        {lead.contacts.length > 0 && (
          <div className="flex flex-col gap-2">
            {lead.contacts.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between text-sm bg-white rounded-md px-3 py-2 border border-neutral-200"
              >
                <div>
                  <span className="text-neutral-500">{c.label || "Contact"}</span>
                  <span className="ml-2 font-medium text-neutral-900">{c.phone_number}</span>
                </div>
                <a
                  href={toTelHref(c.phone_number)}
                  className="text-rose-600 hover:text-rose-700 text-xs font-medium border border-rose-200 rounded-md px-2.5 py-1"
                >
                  Call
                </a>
              </div>
            ))}
          </div>
        )}
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
