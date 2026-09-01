"use client";

import { NAKSHATRAS, NAKSHATRA_PADAMS, type ExtractedLeadFields } from "@/lib/types";
import { calculateAge } from "@/lib/age";

export type ContactDraft = { id?: string; label: string; phone_number: string };

export const LEAD_FIELD_CONFIG: {
  key: keyof ExtractedLeadFields;
  label: string;
  type?: "number" | "textarea" | "date" | "select";
  options?: readonly string[];
}[] = [
  { key: "name", label: "Name" },
  { key: "age", label: "Age", type: "number" },
  { key: "height", label: "Height" },
  { key: "weight", label: "Weight" },
  { key: "complexion", label: "Complexion" },
  { key: "education", label: "Education" },
  { key: "profession", label: "Profession" },
  { key: "income", label: "Income" },
  { key: "location", label: "Location" },
  { key: "address", label: "Address", type: "textarea" },
  { key: "date_of_birth", label: "Date of Birth", type: "date" },
  { key: "time_of_birth", label: "Time of Birth" },
  { key: "place_of_birth", label: "Place of Birth" },
  { key: "rashi", label: "Rashi" },
  { key: "nakshatra", label: "Nakshatra", type: "select", options: NAKSHATRAS },
  { key: "nakshatra_padam", label: "Padam", type: "select", options: NAKSHATRA_PADAMS },
  { key: "religion", label: "Religion" },
  { key: "caste", label: "Caste" },
  { key: "gotra", label: "Gotra" },
  { key: "father_name", label: "Father's Name" },
  { key: "father_occupation", label: "Father's Occupation" },
  { key: "mother_name", label: "Mother's Name" },
  { key: "mother_occupation", label: "Mother's Occupation" },
  { key: "siblings", label: "Siblings" },
  { key: "other_details", label: "Other details", type: "textarea" },
];

export default function LeadFieldsForm({
  fields,
  onFieldChange,
  contacts,
  onContactsChange,
  source,
  onSourceChange,
  foundKeys,
}: {
  fields: ExtractedLeadFields;
  onFieldChange: (key: keyof ExtractedLeadFields, value: string) => void;
  contacts: ContactDraft[];
  onContactsChange: (contacts: ContactDraft[]) => void;
  source: string;
  onSourceChange: (value: string) => void;
  foundKeys?: Set<string>;
}) {
  function updateContact(index: number, patch: Partial<ContactDraft>) {
    onContactsChange(contacts.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  function removeContact(index: number) {
    onContactsChange(contacts.filter((_, i) => i !== index));
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {LEAD_FIELD_CONFIG.map(({ key, label, type, options }) => {
          const derivedAge =
            key === "age" && fields.date_of_birth ? calculateAge(fields.date_of_birth) : null;

          return (
          <div key={key} className={type === "textarea" ? "sm:col-span-2" : ""}>
            <label className="mb-1 block text-xs font-medium text-(--color-label)">
              {label}
              {derivedAge !== null && (
                <span className="font-normal text-(--color-label) opacity-60"> · from DOB</span>
              )}
              {foundKeys && !foundKeys.has(key) && (
                <span className="font-normal text-(--color-label) opacity-60"> · not found</span>
              )}
            </label>
            {derivedAge !== null ? (
              <input
                type="number"
                value={derivedAge}
                disabled
                className="field-input opacity-70"
              />
            ) : type === "textarea" ? (
              <textarea
                value={fields[key] ?? ""}
                onChange={(e) => onFieldChange(key, e.target.value)}
                rows={3}
                className="field-input resize-none"
              />
            ) : type === "select" ? (
              <select
                value={fields[key] ?? ""}
                onChange={(e) => onFieldChange(key, e.target.value)}
                className="field-input"
              >
                <option value="">—</option>
                {options?.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={type === "number" ? "number" : type === "date" ? "date" : "text"}
                value={fields[key] ?? ""}
                onChange={(e) => onFieldChange(key, e.target.value)}
                className="field-input"
              />
            )}
          </div>
          );
        })}
        <div>
          <label className="mb-1 block text-xs font-medium text-(--color-label)">Source</label>
          <input
            type="text"
            value={source}
            onChange={(e) => onSourceChange(e.target.value)}
            placeholder="Who shared this lead?"
            className="field-input"
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-xs font-medium text-(--color-label)">
          Contact numbers
        </label>
        <div className="flex flex-col gap-2">
          {contacts.map((contact, i) => (
            <div key={contact.id ?? `new-${i}`} className="flex gap-2">
              <input
                type="text"
                value={contact.label}
                onChange={(e) => updateContact(i, { label: e.target.value })}
                placeholder="Label (e.g. Father)"
                className="field-input w-2/5"
              />
              <input
                type="tel"
                value={contact.phone_number}
                onChange={(e) => updateContact(i, { phone_number: e.target.value })}
                placeholder="Phone number"
                className="field-input flex-1"
              />
              <button
                type="button"
                onClick={() => removeContact(i)}
                aria-label="Remove contact"
                className="px-1 text-(--color-label) hover:text-red-600"
              >
                &times;
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => onContactsChange([...contacts, { label: "", phone_number: "" }])}
            className="self-start text-sm font-medium text-accent-700 hover:text-accent-900"
          >
            + Add contact
          </button>
        </div>
      </div>
    </>
  );
}
