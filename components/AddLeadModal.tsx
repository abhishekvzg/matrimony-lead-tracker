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
    <div
      className="fixed inset-0 z-40 bg-black/40 flex items-start sm:items-center justify-center p-3 sm:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl w-full max-w-lg my-6 sm:my-0 p-5 sm:p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900">Add New Lead</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-neutral-400 hover:text-neutral-600 text-xl leading-none"
          >
            &times;
          </button>
        </div>

        {step === "input" && (
          <>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Screenshot(s)
              </label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
                className="block w-full text-sm text-neutral-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-rose-50 file:text-rose-600 file:text-sm file:font-medium hover:file:bg-rose-100"
              />
              {files.length > 0 && (
                <p className="text-xs text-neutral-500 mt-1">{files.length} file(s) selected</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Or paste text
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={5}
                placeholder="Paste the bio-data text here…"
                className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm resize-none"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              onClick={handleExtract}
              className="bg-rose-500 hover:bg-rose-600 text-white font-medium rounded-lg py-2.5 transition-colors"
            >
              Extract Details
            </button>
          </>
        )}

        {step === "extracting" && (
          <div className="py-10 flex flex-col items-center gap-3">
            <div className="h-6 w-6 border-2 border-rose-300 border-t-rose-500 rounded-full animate-spin" />
            <p className="text-sm text-neutral-500">Reading the bio-data…</p>
          </div>
        )}

        {(step === "review" || step === "saving") && (
          <>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {candidateCrops.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-2">
                  Profile Picture{candidateCrops.length > 1 ? " — pick one" : ""}
                </label>
                <div className="flex gap-2 flex-wrap">
                  {candidateCrops.map((crop, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedCandidate(i)}
                      className={`h-16 w-16 rounded-full overflow-hidden border-2 ${
                        selectedCandidate === i ? "border-rose-500" : "border-transparent"
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
                      className={`h-16 w-16 rounded-full flex items-center justify-center text-xs text-neutral-500 border-2 ${
                        selectedCandidate === null ? "border-rose-500" : "border-neutral-200"
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
                className="flex-1 border border-neutral-300 text-neutral-700 font-medium rounded-lg py-2.5 hover:bg-neutral-50 disabled:opacity-50 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleSave}
                disabled={step === "saving"}
                className="flex-1 bg-rose-500 hover:bg-rose-600 disabled:bg-neutral-300 text-white font-medium rounded-lg py-2.5 transition-colors"
              >
                {step === "saving" ? "Saving…" : "Save Lead"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
