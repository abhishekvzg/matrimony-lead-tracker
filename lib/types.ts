export const LEAD_STATUSES = [
  "New",
  "Reviewing",
  "Contacted",
  "In Discussion",
  "Meeting Planned",
  "Meeting Done",
  "On Hold",
  "Rejected",
  "Rejected by Other Side",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const SPOKE_BY_OPTIONS = ["Dad", "Mom", "Sister", "You", "Other"] as const;

export type SpokeBy = (typeof SPOKE_BY_OPTIONS)[number];

export interface Lead {
  id: string;
  name: string | null;
  age: number | null;
  height: string | null;
  education: string | null;
  profession: string | null;
  location: string | null;
  income: string | null;
  father_occupation: string | null;
  mother_occupation: string | null;
  siblings: string | null;
  other_details: string | null;
  source: string | null;
  status: LeadStatus;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface Attachment {
  id: string;
  lead_id: string;
  file_url: string;
  file_name: string | null;
  uploaded_at: string;
}

export interface Interaction {
  id: string;
  lead_id: string;
  interaction_date: string;
  spoke_by: SpokeBy;
  notes: string | null;
  created_at: string;
}

export interface LeadWithRelations extends Lead {
  attachments: Attachment[];
  interactions: Interaction[];
}

// Fields Gemini extracts from a bio-data image/text. All nullable — the UI
// only shows what was actually found, never a guessed value.
export interface ExtractedLeadFields {
  name: string | null;
  age: number | null;
  height: string | null;
  education: string | null;
  profession: string | null;
  location: string | null;
  income: string | null;
  father_occupation: string | null;
  mother_occupation: string | null;
  siblings: string | null;
  other_details: string | null;
}

export const EXTRACTED_FIELD_KEYS: (keyof ExtractedLeadFields)[] = [
  "name",
  "age",
  "height",
  "education",
  "profession",
  "location",
  "income",
  "father_occupation",
  "mother_occupation",
  "siblings",
  "other_details",
];
