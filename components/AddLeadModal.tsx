"use client";

import { useState } from "react";
import type { ExtractedLeadFields, FaceCandidate } from "@/lib/types";
import { cropImageToFace } from "@/lib/cropImage";
import LeadFieldsForm, { type ContactDraft } from "./LeadFieldsForm";

type CandidateCrop = { previewUrl: string; blob: Blob };

type Step = "input" | "extracting" | "review" | "saving";

const EMPTY_FIELDS: ExtractedLeadFields = {
  name: null,
  age: null,
  height: null,
  education: null,
  profession: null,
  location: null,
  income: null,
  father_occupation: null,
  mother_occupation: null,
  siblings: null,
  date_of_birth: null,
  time_of_birth: null,
  place_of_birth: null,
  rashi: null,
  nakshatra: null,
  nakshatra_padam: null,
  religion: null,
  caste: null,
  gotra: null,
  weight: null,
  complexion: null,
  father_name: null,
  mother_name: null,
  address: null,
  other_details: null,
};

export default function AddLeadModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [step, setStep] = useState<Step>("input");
  const [files, setFiles] = useState<File[]>([]);
  const [text, setText] = useState("");
  const [fields, setFields] = useState<ExtractedLeadFields>(EMPTY_FIELDS);
  const [contacts, setContacts] = useState<ContactDraft[]>([]);
  const [source, setSource] = useState("");
  const [error, setError] = useState("");
  const [foundKeys, setFoundKeys] = useState<Set<string>>(new Set());
  const [candidateCrops, setCandidateCrops] = useState<CandidateCrop[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<number | null>(null);

  async function handleExtract() {
    if (files.length === 0 && !text.trim()) {
      setError("Add at least one image or some text.");
      return;
    }
    setError("");
    setStep("extracting");
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append("images", f));
      if (text.trim()) formData.append("text", text.trim());

      const res = await fetch("/api/extract", { method: "POST", body: formData });
      if (!res.ok) throw new Error("extract failed");
      const data = await res.json();

      const extracted: ExtractedLeadFields = { ...EMPTY_FIELDS, ...data.fields };
      setFields(extracted);
      setFoundKeys(
        new Set(
          Object.entries(extracted)
            .filter(([, v]) => v !== null && v !== "")
            .map(([k]) => k)
        )
      );
      const extractedContacts: ContactDraft[] = Array.isArray(data.contacts)
        ? data.contacts.map((c: { label: string | null; phone_number: string }) => ({
            label: c.label ?? "",
            phone_number: c.phone_number,
          }))
        : [];
      setContacts(extractedContacts);

      const candidates: FaceCandidate[] = Array.isArray(data.faceCandidates)
        ? data.faceCandidates
        : [];
      candidateCrops.forEach((c) => URL.revokeObjectURL(c.previewUrl));
      if (candidates.length > 0) {
        const crops = (
          await Promise.all(
            candidates.map(async (c): Promise<CandidateCrop | null> => {
              const sourceFile = files[c.imageIndex];
              if (!sourceFile) return null;
              try {
                const blob = await cropImageToFace(sourceFile, c.box);
                return { previewUrl: URL.createObjectURL(blob), blob };
              } catch {
                return null;
              }
            })
          )
        ).filter((c): c is CandidateCrop => c !== null);
        setCandidateCrops(crops);
        setSelectedCandidate(crops.length === 1 ? 0 : null);
      } else {
        setCandidateCrops([]);
        setSelectedCandidate(null);
      }

      setStep("review");
    } catch {
      setError("Couldn't read that automatically — fill in what you can below.");
      setFields(EMPTY_FIELDS);
      setFoundKeys(new Set());
      setContacts([]);
      setCandidateCrops([]);
      setSelectedCandidate(null);
      setStep("review");
    }
  }

  async function handleSave() {
    setStep("saving");
    setError("");
    try {
      const formData = new FormData();
      formData.append("fields", JSON.stringify({ ...fields, source: source || null }));
      formData.append(
        "contacts",
        JSON.stringify(
          contacts
            .filter((c) => c.phone_number.trim())
            .map((c) => ({ label: c.label.trim() || null, phone_number: c.phone_number.trim() }))
        )
      );
      files.forEach((f) => formData.append("files", f));
      if (selectedCandidate !== null && candidateCrops[selectedCandidate]) {
        formData.append("profile_picture", candidateCrops[selectedCandidate].blob, "dp.jpg");
      }

      const res = await fetch("/api/leads", { method: "POST", body: formData });
      if (!res.ok) throw new Error("save failed");
      const { id } = await res.json();
      onCreated(id);
    } catch {
      setError("Couldn't save the lead. Try again.");
      setStep("review");
    }
  }

  function updateField(key: keyof ExtractedLeadFields, value: string) {
    setFields((prev) => ({
      ...prev,
      [key]: value === "" ? null : key === "age" ? Number(value) : value,
    }));
  }

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div
        className="dialog-panel max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between text-lg">
          <span>Add a new lead</span>
          <button
            onClick={onClose}
            aria-label="Close"
            className="btn btn-ghost px-2 text-lg leading-none"
          >
            &times;
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto">
          {step === "input" && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-ink">Screenshot(s)</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
                  className="block w-full text-sm text-(--color-label) file:mr-3 file:rounded-md file:border-0 file:bg-accent-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-accent-700 hover:file:bg-accent-200"
                />
                {files.length > 0 && (
                  <p className="mt-1 text-xs text-(--color-label)">{files.length} file(s) selected</p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-ink">Or paste text</label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={5}
                  placeholder="Paste the bio-data text here…"
                  className="field-input resize-none"
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button onClick={handleExtract} className="btn btn-primary">
                Extract Details
              </button>
            </>
          )}

          {step === "extracting" && (
            <div className="flex flex-col items-center gap-3 py-10">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent-300 border-t-accent-600" />
              <p className="text-sm text-(--color-label)">Reading the bio-data…</p>
            </div>
          )}

          {(step === "review" || step === "saving") && (
            <>
              {error && <p className="text-sm text-red-600">{error}</p>}
              {candidateCrops.length > 0 && (
                <div>
                  <label className="mb-2 block text-xs font-medium text-(--color-label)">
                    Profile Picture{candidateCrops.length > 1 ? " — pick one" : ""}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {candidateCrops.map((crop, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setSelectedCandidate(i)}
                        className={`h-16 w-16 overflow-hidden rounded-full border-2 ${
                          selectedCandidate === i ? "border-accent" : "border-transparent"
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={crop.previewUrl}
                          alt={`Candidate ${i + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </button>
                    ))}
                    {candidateCrops.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setSelectedCandidate(null)}
                        className={`flex h-16 w-16 items-center justify-center rounded-full border-2 text-xs text-(--color-label) ${
                          selectedCandidate === null ? "border-accent" : "border-(--color-divider)"
                        }`}
                      >
                        None
                      </button>
                    )}
                  </div>
                </div>
              )}
              <LeadFieldsForm
                fields={fields}
                onFieldChange={updateField}
                contacts={contacts}
                onContactsChange={setContacts}
                source={source}
                onSourceChange={setSource}
                foundKeys={foundKeys}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setStep("input")}
                  disabled={step === "saving"}
                  className="btn btn-secondary flex-1"
                >
                  Back
                </button>
                <button
                  onClick={handleSave}
                  disabled={step === "saving"}
                  className="btn btn-primary flex-1"
                >
                  {step === "saving" ? "Saving…" : "Save Lead"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
