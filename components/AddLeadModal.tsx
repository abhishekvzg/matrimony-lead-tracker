"use client";

import { useEffect, useMemo, useState } from "react";
import { GEMINI_QUOTA_MESSAGE, type ExtractedLeadFields } from "@/lib/types";
import LeadFieldsForm, { type ContactDraft } from "./LeadFieldsForm";
import ManualCropModal from "./ManualCropModal";

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
  const [cropSource, setCropSource] = useState<string | null>(null);
  const [dpBlob, setDpBlob] = useState<Blob | null>(null);
  const [dpPreviewUrl, setDpPreviewUrl] = useState<string | null>(null);
  const [lastExtractedSignature, setLastExtractedSignature] = useState<string | null>(null);

  const fileObjectUrls = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);

  useEffect(() => {
    return () => fileObjectUrls.forEach((u) => URL.revokeObjectURL(u));
  }, [fileObjectUrls]);

  function clearDp() {
    if (dpPreviewUrl) URL.revokeObjectURL(dpPreviewUrl);
    setDpBlob(null);
    setDpPreviewUrl(null);
  }

  async function handleExtract() {
    if (files.length === 0 && !text.trim()) {
      setError("Add at least one image or some text.");
      return;
    }

    // Going Back then re-extracting the exact same input would burn another
    // of the day's very limited Gemini calls for an identical result —
    // reuse what we already have instead.
    const signature = `${files.map((f) => `${f.name}:${f.size}:${f.lastModified}`).join(",")}|${text.trim()}`;
    if (signature === lastExtractedSignature) {
      setStep("review");
      return;
    }

    setError("");
    setStep("extracting");
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append("images", f));
      if (text.trim()) formData.append("text", text.trim());

      const res = await fetch("/api/extract", { method: "POST", body: formData });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.quotaExceeded ? "quota" : "extract failed");
      }
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
      setLastExtractedSignature(signature);
      setStep("review");
    } catch (err) {
      setError(
        err instanceof Error && err.message === "quota"
          ? `${GEMINI_QUOTA_MESSAGE} Fill in what you can manually below.`
          : "Couldn't read that automatically — fill in what you can below."
      );
      setFields(EMPTY_FIELDS);
      setFoundKeys(new Set());
      setContacts([]);
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
      if (dpBlob) {
        formData.append("profile_picture", dpBlob, "dp.jpg");
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
    <>
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
                <label className="mb-1 block text-sm font-medium text-ink">Screenshot</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 1))}
                  className="block w-full text-sm text-(--color-label) file:mr-3 file:rounded-md file:border-0 file:bg-accent-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-accent-700 hover:file:bg-accent-200"
                />
                {files.length > 0 && (
                  <p className="mt-1 text-xs text-(--color-label)">{files[0].name} selected</p>
                )}
                <p className="mt-1 text-xs text-(--color-label)">
                  One image only — add more photos from the lead&apos;s page after saving.
                </p>
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
              {fileObjectUrls.length > 0 && (
                <div>
                  <label className="mb-2 block text-xs font-medium text-(--color-label)">
                    Profile picture (optional)
                  </label>
                  {dpPreviewUrl ? (
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={dpPreviewUrl}
                        alt="Profile"
                        className="h-16 w-16 rounded-full border-2 border-accent object-cover"
                      />
                      <button
                        type="button"
                        onClick={clearDp}
                        className="text-xs font-medium text-(--color-label) hover:text-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {fileObjectUrls.map((url, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setCropSource(url)}
                          className="h-16 w-16 overflow-hidden rounded-md border border-(--color-divider) hover:opacity-80"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt={`Photo ${i + 1}`}
                            className="h-full w-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
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

    {cropSource && (
      <ManualCropModal
        imageSrc={cropSource}
        onCancel={() => setCropSource(null)}
        onCropped={(blob) => {
          if (dpPreviewUrl) URL.revokeObjectURL(dpPreviewUrl);
          setDpBlob(blob);
          setDpPreviewUrl(URL.createObjectURL(blob));
          setCropSource(null);
        }}
      />
    )}
    </>
  );
}
