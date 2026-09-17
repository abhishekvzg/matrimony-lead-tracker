"use client";

import { useState } from "react";
import {
  COMPATIBILITY_THRESHOLD,
  EXTRACTION_ACCEPT,
  MAX_EXTRACTION_UPLOAD_BYTES,
  formatBytes,
  isPdfAttachment,
  type Interaction,
  type LeadStatus,
  type LeadWithRelations,
} from "@/lib/types";
import InteractionsModal from "./InteractionsModal";
import AttachmentLightbox from "./AttachmentLightbox";
import EditLeadForm from "./EditLeadForm";
import Avatar from "./Avatar";

type DisplayFieldKey =
  | "age"
  | "height"
  | "weight"
  | "complexion"
  | "date_of_birth"
  | "time_of_birth"
  | "place_of_birth"
  | "income"
  | "rashi"
  | "nakshatra"
  | "nakshatra_padam"
  | "siblings"
  | "religion"
  | "caste"
  | "gotra"
  | "address"
  | "source";

const PERSONAL_FIELDS: { key: DisplayFieldKey; label: string }[] = [
  { key: "date_of_birth", label: "Date of Birth" },
  { key: "age", label: "Age" },
  { key: "height", label: "Height" },
  { key: "weight", label: "Weight" },
  { key: "complexion", label: "Complexion" },
  { key: "time_of_birth", label: "Time of Birth" },
  { key: "place_of_birth", label: "Place of Birth" },
  { key: "income", label: "Income" },
];

const ASTROLOGY_FIELDS: { key: DisplayFieldKey; label: string }[] = [
  { key: "rashi", label: "Rashi" },
  { key: "nakshatra", label: "Nakshatra" },
  { key: "nakshatra_padam", label: "Padam" },
];

const FAMILY_FIELDS: { key: DisplayFieldKey; label: string }[] = [
  { key: "siblings", label: "Siblings" },
  { key: "religion", label: "Religion" },
  { key: "caste", label: "Caste" },
  { key: "gotra", label: "Gotra" },
];

const CONTACT_FIELDS: { key: DisplayFieldKey; label: string }[] = [
  { key: "address", label: "Address" },
  { key: "source", label: "Source" },
];

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

function Divider() {
  return <div className="border-t border-(--color-divider)" />;
}

function FieldGrid({
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
      <p className="kicker mb-2">{title}</p>
      <div className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        {fields.map(({ key, label }) => {
          const raw = lead[key];
          const value =
            key === "date_of_birth" && raw
              ? formatDateOnly(raw as string)
              : key === "age" && typeof raw === "number"
                ? `${raw} yrs`
                : raw;
          return (
            <div key={key}>
              <span className="text-(--color-label)">{label}</span>{" "}
              <span className="font-medium text-ink">{value || "—"}</span>
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
        <p className="mt-2 text-xs text-(--color-label)">
          {lead.nakshatra} isn&apos;t in the compatibility chart yet — no score can be calculated.
        </p>
      );
    }
    return (
      <div className="mt-3">
        <p className="mb-1.5 text-xs text-(--color-label)">Which padam?</p>
        <div className="flex flex-wrap gap-1.5">
          {lead.padam_options.map(({ padam, score }) => {
            const compatible = score !== null && score >= COMPATIBILITY_THRESHOLD;
            return (
              <button
                key={padam}
                type="button"
                disabled={selectingPadam}
                onClick={() => onSelectPadam(padam)}
                className={`tag transition-shadow hover:ring-2 hover:ring-accent-300 disabled:opacity-50 ${
                  compatible ? "tag-accent" : "tag-neutral"
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

  // No score *and* no chart entry means the combination was never rated —
  // saying "Not Compatible" there would be asserting a verdict the data
  // doesn't support.
  if (score === null && !lead.compatibility_in_chart && !lead.is_score_overridden) {
    return (
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="tag tag-outline">Not rated</span>
        <span className="text-xs text-(--color-label)">
          {lead.nakshatra} padam {lead.nakshatra_padam} isn&apos;t in the compatibility chart yet.
        </span>
      </div>
    );
  }

  const compatible = score !== null && score >= COMPATIBILITY_THRESHOLD;

  return (
    <div className="mt-3 flex items-center gap-2">
      <span className={`tag ${compatible ? "tag-accent" : "tag-neutral"}`}>
        {score !== null ? `${score}/36 · ` : ""}
        {compatible ? "Compatible" : "Not Compatible"}
      </span>
      {lead.is_score_overridden && (
        <span className="text-xs text-(--color-label)">(manually set)</span>
      )}
    </div>
  );
}

export default function LeadDetail({
  lead,
  onInteractionAdded,
  onLeadUpdated,
  onLeadDeleted,
}: {
  lead: LeadWithRelations;
  onInteractionAdded: (interaction: Interaction, status: LeadStatus) => void;
  onLeadUpdated: (lead: LeadWithRelations) => void;
  onLeadDeleted: (id: string) => void;
}) {
  const [lightbox, setLightbox] = useState<{ url: string; name: string | null } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [selectingPadam, setSelectingPadam] = useState(false);
  const [interactionsOpen, setInteractionsOpen] = useState(false);
  const [attachmentsBusy, setAttachmentsBusy] = useState(false);
  const [attachmentsError, setAttachmentsError] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  async function handleDelete() {
    setDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch(`/api/leads/${lead.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
      onLeadDeleted(lead.id);
    } catch {
      setDeleteError("Couldn't delete this profile. Try again.");
      setDeleting(false);
    }
  }

  async function handleAddAttachments(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;

    setAttachmentsBusy(true);
    setAttachmentsError("");

    const tooBig = files.filter((f) => f.size > MAX_EXTRACTION_UPLOAD_BYTES);
    const uploadable = files.filter((f) => f.size <= MAX_EXTRACTION_UPLOAD_BYTES);
    let failed = 0;

    try {
      // One request per file: phone photos run several MB each, and a combined
      // upload would be rejected by the platform's body limit before the route
      // ever saw it. Sequential also means a late failure doesn't discard the
      // files that already landed.
      for (const file of uploadable) {
        const formData = new FormData();
        formData.append("files", file);
        const res = await fetch(`/api/leads/${lead.id}/attachments`, {
          method: "POST",
          body: formData,
        });
        if (!res.ok) failed++;
      }

      const freshRes = await fetch(`/api/leads/${lead.id}`);
      if (!freshRes.ok) throw new Error("refetch failed");
      const { lead: freshLead } = await freshRes.json();
      onLeadUpdated(freshLead);

      const problems = [
        ...tooBig.map(
          (f) => `${f.name} is ${formatBytes(f.size)} — too large (limit ${formatBytes(MAX_EXTRACTION_UPLOAD_BYTES)})`
        ),
        ...(failed > 0 ? [`${failed} file(s) failed to upload`] : []),
      ];
      if (problems.length > 0) setAttachmentsError(problems.join("; "));
    } catch {
      setAttachmentsError("Couldn't upload those files. Try again.");
    } finally {
      setAttachmentsBusy(false);
    }
  }

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
      <div className="card p-4 sm:p-6">
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

  const fatherContact = lead.contacts.find((c) => /father/i.test(c.label ?? ""));

  return (
    <div className="card flex flex-col gap-5 p-4 sm:p-6">
      {/* Not flex-wrap: on a narrow screen the Edit button used to wrap onto
          its own line and sit orphaned under the tags. */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-4">
          <Avatar name={lead.name} url={lead.profile_picture_url} size={64} />
          <div className="min-w-0">
            <h2 className="text-2xl">
              {lead.name || <span className="italic text-(--color-label)">Unnamed</span>}
            </h2>
            <p className="mt-0.5 text-sm text-(--color-label)">{lead.location || "—"}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {lead.age !== null && <span className="tag tag-accent">{lead.age} yrs</span>}
              {lead.nakshatra && <span className="tag tag-accent">{lead.nakshatra}</span>}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="btn btn-ghost shrink-0"
        >
          Edit
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-(--radius-xs) border border-accent-200 bg-accent-100 px-4 py-3">
        <p className="kicker mb-0 text-accent-700">Interactions</p>
        <button type="button" onClick={() => setInteractionsOpen(true)} className="btn btn-primary">
          💬{" "}
          {lead.interactions.length > 0
            ? `${lead.interactions.length} logged`
            : "Log an interaction"}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-(--radius-xs) border border-(--color-divider) p-3">
          <p className="text-[11px] tracking-wide text-(--color-label) uppercase">Education</p>
          <p className="text-sm font-semibold text-ink">{lead.education || "—"}</p>
        </div>
        <div className="rounded-(--radius-xs) border border-(--color-divider) p-3">
          <p className="text-[11px] tracking-wide text-(--color-label) uppercase">Profession</p>
          <p className="text-sm font-semibold text-ink">{lead.profession || "—"}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-(--radius-xs) border border-accent-200 bg-accent-100 p-4 sm:grid-cols-2">
        <div>
          <p className="text-[11px] tracking-wide text-accent-700 uppercase">Father</p>
          <p className="mt-0.5 font-medium text-ink">{lead.father_name || "—"}</p>
          <p className="text-[13px] text-(--color-label)">{lead.father_occupation || "—"}</p>
          {fatherContact && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[13px] text-accent-700">{fatherContact.phone_number}</span>
              <a href={toTelHref(fatherContact.phone_number)} className="call-icon" title="Call">
                📞
              </a>
            </div>
          )}
        </div>
        <div>
          <p className="text-[11px] tracking-wide text-accent-700 uppercase">Mother</p>
          <p className="mt-0.5 font-medium text-ink">{lead.mother_name || "—"}</p>
          <p className="text-[13px] text-(--color-label)">{lead.mother_occupation || "—"}</p>
        </div>
      </div>

      <Divider />
      <FieldGrid title="Personal" fields={PERSONAL_FIELDS} lead={lead} />

      <Divider />
      <div>
        <FieldGrid title="Astrology" fields={ASTROLOGY_FIELDS} lead={lead} />
        <CompatibilityBadge
          lead={lead}
          onSelectPadam={handleSelectPadam}
          selectingPadam={selectingPadam}
        />
      </div>

      <Divider />
      <FieldGrid title="Family" fields={FAMILY_FIELDS} lead={lead} />

      <Divider />
      <div className="flex flex-col gap-3">
        <FieldGrid title="Contact" fields={CONTACT_FIELDS} lead={lead} />
        {lead.contacts.length > 0 && (
          <div className="flex flex-col gap-1">
            {lead.contacts.map((c) => (
              <div key={c.id} className="flex items-center justify-between py-1 text-[13px]">
                <span>
                  <span className="text-(--color-label)">{c.label || "Contact"}</span>{" "}
                  <span className="font-medium text-ink">{c.phone_number}</span>
                </span>
                <a href={toTelHref(c.phone_number)} className="call-icon" title="Call">
                  📞
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {lead.other_details && (
        <>
          <Divider />
          <div>
            <p className="kicker mb-1">Other details</p>
            <p className="text-sm whitespace-pre-wrap text-ink">{lead.other_details}</p>
          </div>
        </>
      )}

      <Divider />
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="kicker mb-0">Attachments</p>
          <label className="cursor-pointer text-xs font-medium text-accent-700 hover:text-accent-900">
            {attachmentsBusy ? "Uploading…" : "+ Add files"}
            <input
              type="file"
              accept={EXTRACTION_ACCEPT}
              multiple
              className="hidden"
              disabled={attachmentsBusy}
              onChange={handleAddAttachments}
            />
          </label>
        </div>
        {attachmentsError && <p className="mb-2 text-xs text-red-600">{attachmentsError}</p>}
        {lead.attachments.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {lead.attachments.map((a) =>
              isPdfAttachment(a) ? (
                // A PDF has nothing to show in an <img>, so it gets a labelled
                // tile that opens the document in a new tab instead.
                <a
                  key={a.id}
                  href={a.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={a.file_name ?? "PDF"}
                  className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-md border border-(--color-divider) p-1 text-center transition-opacity hover:opacity-80"
                >
                  <span className="text-xl leading-none">📄</span>
                  <span className="w-full truncate text-[10px] text-(--color-label)">
                    {a.file_name ?? "PDF"}
                  </span>
                </a>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={a.id}
                  src={a.file_url}
                  alt={a.file_name ?? "Attachment"}
                  onClick={() => setLightbox({ url: a.file_url, name: a.file_name })}
                  className="h-20 w-20 cursor-pointer rounded-md border border-(--color-divider) object-cover transition-opacity hover:opacity-80"
                />
              )
            )}
          </div>
        ) : (
          <p className="text-sm text-(--color-label)">Nothing attached yet.</p>
        )}
      </div>

      <Divider />
      <div>
        {confirmingDelete ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-ink">
              Delete <strong>{lead.name || "this profile"}</strong> permanently? This also
              removes {lead.interactions.length} interaction
              {lead.interactions.length === 1 ? "" : "s"}, {lead.contacts.length} contact
              {lead.contacts.length === 1 ? "" : "s"} and {lead.attachments.length} file
              {lead.attachments.length === 1 ? "" : "s"}. It can&apos;t be undone.
            </p>
            {deleteError && <p className="text-xs text-red-600">{deleteError}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                disabled={deleting}
                className="btn btn-secondary flex-1"
              >
                Keep it
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="btn flex-1 bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Yes, delete"}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="text-xs font-medium text-(--color-label) hover:text-red-600"
          >
            Delete this profile
          </button>
        )}
      </div>

      {interactionsOpen && (
        <InteractionsModal
          lead={lead}
          onAdded={(interaction, status) => {
            onInteractionAdded(interaction, status);
          }}
          onClose={() => setInteractionsOpen(false)}
        />
      )}

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
