"use client";

import { useState } from "react";
import type { ExtractedLeadFields } from "@/lib/types";

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
  other_details: null,
};

const FIELD_CONFIG: {
  key: keyof ExtractedLeadFields;
  label: string;
  type?: "number" | "textarea";
}[] = [
  { key: "name", label: "Name" },
  { key: "age", label: "Age", type: "number" },
  { key: "height", label: "Height" },
  { key: "education", label: "Education" },
  { key: "profession", label: "Profession" },
  { key: "location", label: "Location" },
  { key: "income", label: "Income" },
  { key: "father_occupation", label: "Father's Occupation" },
  { key: "mother_occupation", label: "Mother's Occupation" },
  { key: "siblings", label: "Siblings" },
  { key: "other_details", label: "Other details", type: "textarea" },
];

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
  const [source, setSource] = useState("");
  const [error, setError] = useState("");
  const [foundKeys, setFoundKeys] = useState<Set<string>>(new Set());

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

      const extracted: ExtractedLeadFields = { ...EMPTY_FIELDS, ...data };
      setFields(extracted);
      setFoundKeys(
        new Set(
          Object.entries(extracted)
            .filter(([, v]) => v !== null && v !== "")
            .map(([k]) => k)
        )
      );
      setStep("review");
    } catch {
      setError("Couldn't read that automatically — fill in what you can below.");
      setFields(EMPTY_FIELDS);
      setFoundKeys(new Set());
      setStep("review");
    }
  }

  async function handleSave() {
    setStep("saving");
    setError("");
    try {
      const formData = new FormData();
      formData.append("fields", JSON.stringify({ ...fields, source: source || null }));
      files.forEach((f) => formData.append("files", f));

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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {FIELD_CONFIG.map(({ key, label, type }) => (
                <div key={key} className={type === "textarea" ? "sm:col-span-2" : ""}>
                  <label className="block text-xs font-medium text-neutral-500 mb-1">
                    {label}
                    {!foundKeys.has(key) && (
                      <span className="text-neutral-300 font-normal"> · not found</span>
                    )}
                  </label>
                  {type === "textarea" ? (
                    <textarea
                      value={fields[key] ?? ""}
                      onChange={(e) => updateField(key, e.target.value)}
                      rows={3}
                      className="w-full border border-neutral-300 rounded-md px-2.5 py-1.5 text-sm resize-none"
                    />
                  ) : (
                    <input
                      type={type === "number" ? "number" : "text"}
                      value={fields[key] ?? ""}
                      onChange={(e) => updateField(key, e.target.value)}
                      className="w-full border border-neutral-300 rounded-md px-2.5 py-1.5 text-sm"
                    />
                  )}
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">Source</label>
                <input
                  type="text"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="Who shared this lead?"
                  className="w-full border border-neutral-300 rounded-md px-2.5 py-1.5 text-sm"
                />
              </div>
            </div>
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
