"use client";

import { useState } from "react";
import { type ExtractedLeadFields, type LeadWithRelations } from "@/lib/types";
import LeadFieldsForm, { type ContactDraft } from "./LeadFieldsForm";
import Avatar from "./Avatar";
import ManualCropModal from "./ManualCropModal";

function leadToFields(lead: LeadWithRelations): ExtractedLeadFields {
  return {
    name: lead.name,
    age: lead.age,
    height: lead.height,
    education: lead.education,
    profession: lead.profession,
    location: lead.location,
    income: lead.income,
    father_occupation: lead.father_occupation,
    mother_occupation: lead.mother_occupation,
    siblings: lead.siblings,
    date_of_birth: lead.date_of_birth,
    time_of_birth: lead.time_of_birth,
    place_of_birth: lead.place_of_birth,
    rashi: lead.rashi,
    nakshatra: lead.nakshatra,
    nakshatra_padam: lead.nakshatra_padam,
    religion: lead.religion,
    caste: lead.caste,
    gotra: lead.gotra,
    weight: lead.weight,
    complexion: lead.complexion,
    father_name: lead.father_name,
    mother_name: lead.mother_name,
    address: lead.address,
    other_details: lead.other_details,
  };
}

export default function EditLeadForm({
  lead,
  onSaved,
  onLeadRefresh,
  onCancel,
}: {
  lead: LeadWithRelations;
  onSaved: (lead: LeadWithRelations) => void;
  onLeadRefresh: (lead: LeadWithRelations) => void;
  onCancel: () => void;
}) {
  const [fields, setFields] = useState<ExtractedLeadFields>(leadToFields(lead));
  const [contacts, setContacts] = useState<ContactDraft[]>(
    lead.contacts.map((c) => ({ id: c.id, label: c.label ?? "", phone_number: c.phone_number }))
  );
  const [source, setSource] = useState(lead.source ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [showAttachmentPicker, setShowAttachmentPicker] = useState(false);
  const [cropImage, setCropImage] = useState<{ src: string; isObjectUrl: boolean } | null>(null);

  function updateField(key: keyof ExtractedLeadFields, value: string) {
    setFields((prev) => ({
      ...prev,
      [key]: value === "" ? null : key === "age" ? Number(value) : value,
    }));
  }

  async function refreshLead() {
    const res = await fetch(`/api/leads/${lead.id}`);
    if (!res.ok) throw new Error("refetch failed");
    const { lead: freshLead } = await res.json();
    onLeadRefresh(freshLead);
  }

  async function handleRemoveAvatar() {
    setAvatarBusy(true);
    setAvatarError("");
    try {
      await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile_picture_url: null }),
      });
      await refreshLead();
    } catch {
      setAvatarError("Couldn't remove the photo. Try again.");
    } finally {
      setAvatarBusy(false);
    }
  }

  function openCropForFile(file: File) {
    setCropImage({ src: URL.createObjectURL(file), isObjectUrl: true });
  }

  function openCropForAttachment(url: string) {
    setShowAttachmentPicker(false);
    setCropImage({ src: url, isObjectUrl: false });
  }

  function closeCrop() {
    if (cropImage?.isObjectUrl) URL.revokeObjectURL(cropImage.src);
    setCropImage(null);
  }

  async function handleCropped(blob: Blob) {
    setAvatarBusy(true);
    setAvatarError("");
    try {
      const uploadForm = new FormData();
      uploadForm.append("file", blob, "dp.jpg");
      const uploadRes = await fetch(`/api/leads/${lead.id}/profile-picture`, {
        method: "POST",
        body: uploadForm,
      });
      if (!uploadRes.ok) throw new Error("upload failed");
      await refreshLead();
    } catch {
      setAvatarError("Couldn't update the photo. Try again.");
    } finally {
      setAvatarBusy(false);
      closeCrop();
    }
  }

  async function reconcileContacts() {
    const currentIds = new Set(contacts.filter((c) => c.id).map((c) => c.id));

    for (const original of lead.contacts) {
      if (!currentIds.has(original.id)) {
        await fetch(`/api/leads/${lead.id}/contacts/${original.id}`, { method: "DELETE" });
      }
    }

    for (const contact of contacts) {
      const phone = contact.phone_number.trim();
      if (!phone) continue;
      const label = contact.label.trim() || null;

      if (contact.id) {
        const original = lead.contacts.find((o) => o.id === contact.id);
        if (original && original.label === label && original.phone_number === phone) continue;
        await fetch(`/api/leads/${lead.id}/contacts/${contact.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ label, phone_number: phone }),
        });
      } else {
        await fetch(`/api/leads/${lead.id}/contacts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ label, phone_number: phone }),
        });
      }
    }
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const patchRes = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...fields, source: source || null }),
      });
      if (!patchRes.ok) throw new Error("save failed");

      await reconcileContacts();

      const freshRes = await fetch(`/api/leads/${lead.id}`);
      if (!freshRes.ok) throw new Error("refetch failed");
      const { lead: freshLead } = await freshRes.json();
      onSaved(freshLead);
    } catch {
      setError("Couldn't save changes. Try again.");
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-3">
        <Avatar url={lead.profile_picture_url} name={lead.name} size={56} />
        <div className="flex flex-col gap-1">
          <div className="flex gap-2">
            <label className="cursor-pointer text-xs font-medium text-accent-700 hover:text-accent-900">
              {lead.profile_picture_url ? "Replace photo" : "Add photo"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={avatarBusy}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) openCropForFile(file);
                }}
              />
            </label>
            {lead.attachments.length > 0 && (
              <button
                type="button"
                onClick={() => setShowAttachmentPicker(true)}
                disabled={avatarBusy}
                className="text-xs font-medium text-accent-700 hover:text-accent-900 disabled:opacity-50"
              >
                Choose from photos
              </button>
            )}
            {lead.profile_picture_url && (
              <button
                type="button"
                onClick={handleRemoveAvatar}
                disabled={avatarBusy}
                className="text-xs font-medium text-(--color-label) hover:text-red-600 disabled:opacity-50"
              >
                Remove
              </button>
            )}
          </div>
          {avatarBusy && <p className="text-xs text-(--color-label)">Working…</p>}
          {avatarError && <p className="text-xs text-red-600">{avatarError}</p>}
        </div>
      </div>

      {showAttachmentPicker && (
        <div className="dialog-backdrop" onClick={() => setShowAttachmentPicker(false)}>
          <div className="dialog-panel" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between text-lg">
              <span>Choose a photo</span>
              <button
                type="button"
                onClick={() => setShowAttachmentPicker(false)}
                className="btn btn-ghost px-2 text-lg leading-none"
                aria-label="Close"
              >
                &times;
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {lead.attachments.map((a) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={a.id}
                  src={a.file_url}
                  alt={a.file_name ?? "Attachment"}
                  onClick={() => openCropForAttachment(a.file_url)}
                  className="h-20 w-20 cursor-pointer rounded-md border border-(--color-divider) object-cover hover:opacity-80"
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {cropImage && (
        <ManualCropModal imageSrc={cropImage.src} onCancel={closeCrop} onCropped={handleCropped} />
      )}

      <LeadFieldsForm
        fields={fields}
        onFieldChange={updateField}
        contacts={contacts}
        onContactsChange={setContacts}
        source={source}
        onSourceChange={setSource}
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="btn btn-secondary flex-1"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="btn btn-primary flex-1"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
