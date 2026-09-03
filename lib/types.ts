export const LEAD_STATUSES = [
  "New",
  "Contacted",
  "In Discussion",
  "Meeting Planned",
  "Meeting Done",
  "On Hold",
  "Rejected",
  "Rejected by Other Side",
  "Hide",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const SPOKE_BY_OPTIONS = ["Surya", "Sireesha", "Sruthi", "Abhishek"] as const;

export type SpokeBy = (typeof SPOKE_BY_OPTIONS)[number];

export const GEMINI_QUOTA_MESSAGE =
  "Gemini's free daily limit has been used up for today — try again tomorrow.";

// Canonical nakshatra vocabulary, spelled the way this family's biodata
// documents and nakshatra_scores table use them. Extraction is instructed
// to normalize alternate spellings (Ardra/Chitra/Swati/etc.) into these
// exact 27 values so compatibility lookups actually match.
export const NAKSHATRAS = [
  "Ashwini",
  "Bharani",
  "Krittika",
  "Rohini",
  "Mrigashira",
  "Aarudra",
  "Punarvasu",
  "Pushyami",
  "Ashlesha",
  "Makha",
  "Pubba",
  "Uttara",
  "Hastha",
  "Chitta",
  "Swathi",
  "Vishakha",
  "Anuradha",
  "Jyeshta",
  "Moola",
  "Purvashada",
  "Uttarashada",
  "Shravanam",
  "Dhanishta",
  "Satabhisha",
  "Purvabhadra",
  "Uttarabhadra",
  "Revathi",
] as const;

export type Nakshatra = (typeof NAKSHATRAS)[number];

export const NAKSHATRA_PADAMS = ["1", "2", "3", "4"] as const;

export type NakshatraPadam = (typeof NAKSHATRA_PADAMS)[number];

export const COMPATIBILITY_THRESHOLD = 18;

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
  date_of_birth: string | null;
  time_of_birth: string | null;
  place_of_birth: string | null;
  rashi: string | null;
  nakshatra: string | null;
  nakshatra_padam: string | null;
  religion: string | null;
  caste: string | null;
  gotra: string | null;
  weight: string | null;
  complexion: string | null;
  father_name: string | null;
  mother_name: string | null;
  address: string | null;
  profile_picture_url: string | null;
  compatibility_score: number | null;
  is_score_overridden: boolean;
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

export interface Contact {
  id: string;
  lead_id: string;
  label: string | null;
  phone_number: string;
  created_at: string;
}

export interface LeadWithRelations extends Lead {
  attachments: Attachment[];
  interactions: Interaction[];
  contacts: Contact[];
  // Populated only when nakshatra is known but padam isn't — every padam's
  // score for that nakshatra, so the UI can offer them instead of nothing.
  padam_options: { padam: string; score: number | null }[] | null;
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
  date_of_birth: string | null;
  time_of_birth: string | null;
  place_of_birth: string | null;
  rashi: string | null;
  nakshatra: string | null;
  nakshatra_padam: string | null;
  religion: string | null;
  caste: string | null;
  gotra: string | null;
  weight: string | null;
  complexion: string | null;
  father_name: string | null;
  mother_name: string | null;
  address: string | null;
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
  "date_of_birth",
  "time_of_birth",
  "place_of_birth",
  "rashi",
  "nakshatra",
  "nakshatra_padam",
  "religion",
  "caste",
  "gotra",
  "weight",
  "complexion",
  "father_name",
  "mother_name",
  "address",
  "other_details",
];

export interface ExtractedContact {
  label: string | null;
  phone_number: string;
}

export interface ExtractionResult {
  fields: ExtractedLeadFields;
  contacts: ExtractedContact[];
}
