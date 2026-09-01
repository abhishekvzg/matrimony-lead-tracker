"use client";

import { useState } from "react";
import type { ExtractedLeadFields, FaceCandidate, LeadWithRelations } from "@/lib/types";
import { cropImageToFace } from "@/lib/cropImage";
import LeadFieldsForm, { type ContactDraft } from "./LeadFieldsForm";
import Avatar from "./Avatar";

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

function largestFace(candidates: FaceCandidate[]): FaceCandidate {
  return candidates.reduce((largest, c) => {
    const area = (c.box[2] - c.box[0]) * (c.box[3] - c.box[1]);
    const largestArea = (largest.box[2] - largest.box[0]) * (largest.box[3] - largest.box[1]);
    return area > largestArea ? c : largest;
  });
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
  const [dpCandidates, setDpCandidates] = useState<{ index: number; dataUrl: string }[] | null>(
    null
  );

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

  async function handleReplaceAvatar(file: File) {
    setAvatarBusy(true);
    setAvatarError("");
    try {
      const detectForm = new FormData();
      detectForm.append("images", file);
      const detectRes = await fetch("/api/detect-face", { method: "POST", body: detectForm });
      if (!detectRes.ok) throw new Error("detect failed");
      const { faceCandidates } = (await detectRes.json()) as { faceCandidates: FaceCandidate[] };

      if (faceCandidates.length === 0) {
        setAvatarError("No face detected in that photo — try a different one.");
        return;
      }

      const face = largestFace(faceCandidates);
      const blob = await cropImageToFace(file, face.box);

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
    }
  }

  async function handleDetectFromAttachments() {
    setAvatarBusy(true);
    setAvatarError("");
    setDpCandidates(null);
    try {
      const res = await fetch(`/api/leads/${lead.id}/detect-dp-from-attachments`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("detect failed");
      const data = await res.json();

      if (data.status === "none") {
        setAvatarError("No face found in the uploaded photos.");
      } else if (data.status === "set") {
        await refreshLead();
      } else if (data.status === "choose") {
        setDpCandidates(data.candidates);
      }
    } catch {
      setAvatarError("Couldn't scan the photos. Try again.");
    } finally {
      setAvatarBusy(false);
    }
  }

  async function handleChooseCandidate(dataUrl: string) {
    setAvatarBusy(true);
    setAvatarError("");
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const uploadForm = new FormData();
      uploadForm.append("file", blob, "dp.jpg");
      const uploadRes = await fetch(`/api/leads/${lead.id}/profile-picture`, {
        method: "POST",
        body: uploadForm,
      });
      if (!uploadRes.ok) throw new Error("upload failed");
      setDpCandidates(null);
      await refreshLead();
    } catch {
      setAvatarError("Couldn't set that photo. Try again.");
    } finally {
      setAvatarBusy(false);
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
                  if (file) handleReplaceAvatar(file);
                }}
              />
            </label>
            {lead.attachments.length > 0 && (
              <button
                type="button"
                onClick={handleDetectFromAttachments}
                disabled={avatarBusy}
                className="text-xs font-medium text-accent-700 hover:text-accent-900 disabled:opacity-50"
              >
                Detect from photos
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
          {dpCandidates && (
            <div className="mt-1 flex flex-wrap gap-2">
              {dpCandidates.map((c) => (
                <button
                  key={c.index}
                  type="button"
                  onClick={() => handleChooseCandidate(c.dataUrl)}
                  disabled={avatarBusy}
                  className="h-12 w-12 overflow-hidden rounded-full border-2 border-transparent hover:border-accent"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={c.dataUrl}
                    alt={`Candidate ${c.index + 1}`}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

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
