import "server-only";
import { supabaseAdmin, LEAD_ATTACHMENTS_BUCKET } from "./supabase";
import { calculateAge } from "./age";
import { getPadamOptions, lookupCompatibilityScore } from "./nakshatra";
import type {
  Attachment,
  Contact,
  ExtractedLeadFields,
  Interaction,
  Lead,
  LeadStatus,
  LeadWithRelations,
  SpokeBy,
} from "./types";

const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour, regenerated on every fetch

type RawAttachment = Attachment;
type RawLead = Lead & {
  attachments: RawAttachment[];
  interactions: Interaction[];
  contacts: Contact[];
};

async function withSignedUrls(
  attachments: RawAttachment[]
): Promise<Attachment[]> {
  if (attachments.length === 0) return [];
  const paths = attachments.map((a) => a.file_url);
  const { data, error } = await supabaseAdmin()
    .storage.from(LEAD_ATTACHMENTS_BUCKET)
    .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
  if (error) throw error;

  return attachments.map((attachment, i) => ({
    ...attachment,
    file_url: data?.[i]?.signedUrl ?? "",
  }));
}

async function withProfilePictureSignedUrl(
  path: string | null
): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabaseAdmin()
    .storage.from(LEAD_ATTACHMENTS_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error) throw error;
  return data?.signedUrl ?? null;
}

async function attachRelations(lead: RawLead): Promise<LeadWithRelations> {
  const [attachments, profile_picture_url, padam_options] = await Promise.all([
    withSignedUrls(lead.attachments ?? []),
    withProfilePictureSignedUrl(lead.profile_picture_url),
    lead.nakshatra && !lead.nakshatra_padam ? getPadamOptions(lead.nakshatra) : null,
  ]);
  return {
    ...lead,
    age: lead.date_of_birth ? calculateAge(lead.date_of_birth) : lead.age,
    attachments,
    interactions: lead.interactions ?? [],
    contacts: lead.contacts ?? [],
    profile_picture_url,
    padam_options,
  };
}

const RELATIONS_SELECT = "*, attachments(*), interactions(*), contacts(*)";

export async function listLeadsWithRelations(
  hidden: boolean
): Promise<LeadWithRelations[]> {
  const { data, error } = await supabaseAdmin()
    .from("leads")
    .select(RELATIONS_SELECT)
    .filter("status", hidden ? "eq" : "neq", "Hide")
    .order("updated_at", { ascending: false })
    .order("interaction_date", { referencedTable: "interactions", ascending: false })
    .order("created_at", { referencedTable: "interactions", ascending: false })
    .order("uploaded_at", { referencedTable: "attachments", ascending: true })
    .order("created_at", { referencedTable: "contacts", ascending: true });

  if (error) throw error;

  return Promise.all((data as RawLead[]).map(attachRelations));
}

export async function getLeadWithRelations(
  id: string
): Promise<LeadWithRelations | null> {
  const { data, error } = await supabaseAdmin()
    .from("leads")
    .select(RELATIONS_SELECT)
    .eq("id", id)
    .order("interaction_date", { referencedTable: "interactions", ascending: false })
    .order("created_at", { referencedTable: "interactions", ascending: false })
    .order("uploaded_at", { referencedTable: "attachments", ascending: true })
    .order("created_at", { referencedTable: "contacts", ascending: true })
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return attachRelations(data as RawLead);
}

export async function createLead(
  fields: Partial<ExtractedLeadFields> & { source?: string | null }
): Promise<Lead> {
  const compatibility_score = await lookupCompatibilityScore(
    fields.nakshatra,
    fields.nakshatra_padam
  );

  const { data, error } = await supabaseAdmin()
    .from("leads")
    .insert({
      name: fields.name ?? null,
      age: fields.age ?? null,
      height: fields.height ?? null,
      education: fields.education ?? null,
      profession: fields.profession ?? null,
      location: fields.location ?? null,
      income: fields.income ?? null,
      father_occupation: fields.father_occupation ?? null,
      mother_occupation: fields.mother_occupation ?? null,
      siblings: fields.siblings ?? null,
      other_details: fields.other_details ?? null,
      source: fields.source ?? null,
      date_of_birth: fields.date_of_birth ?? null,
      time_of_birth: fields.time_of_birth ?? null,
      place_of_birth: fields.place_of_birth ?? null,
      rashi: fields.rashi ?? null,
      nakshatra: fields.nakshatra ?? null,
      nakshatra_padam: fields.nakshatra_padam ?? null,
      religion: fields.religion ?? null,
      caste: fields.caste ?? null,
      gotra: fields.gotra ?? null,
      weight: fields.weight ?? null,
      complexion: fields.complexion ?? null,
      father_name: fields.father_name ?? null,
      mother_name: fields.mother_name ?? null,
      address: fields.address ?? null,
      compatibility_score,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as Lead;
}

export async function createContacts(
  leadId: string,
  contacts: { label?: string | null; phone_number: string }[]
): Promise<Contact[]> {
  if (contacts.length === 0) return [];

  const { data, error } = await supabaseAdmin()
    .from("contacts")
    .insert(
      contacts.map((c) => ({
        lead_id: leadId,
        label: c.label ?? null,
        phone_number: c.phone_number,
      }))
    )
    .select("*");

  if (error) throw error;
  return data as Contact[];
}

export interface LeadPatch {
  name?: string | null;
  age?: number | null;
  height?: string | null;
  education?: string | null;
  profession?: string | null;
  location?: string | null;
  income?: string | null;
  father_occupation?: string | null;
  mother_occupation?: string | null;
  siblings?: string | null;
  other_details?: string | null;
  source?: string | null;
  date_of_birth?: string | null;
  time_of_birth?: string | null;
  place_of_birth?: string | null;
  rashi?: string | null;
  nakshatra?: string | null;
  nakshatra_padam?: string | null;
  religion?: string | null;
  caste?: string | null;
  gotra?: string | null;
  weight?: string | null;
  complexion?: string | null;
  father_name?: string | null;
  mother_name?: string | null;
  address?: string | null;
  profile_picture_url?: string | null;
  compatibility_score?: number | null;
  is_score_overridden?: boolean;
  status?: LeadStatus;
}

export async function updateLead(id: string, patch: LeadPatch): Promise<Lead> {
  const finalPatch: LeadPatch = { ...patch };

  const nakshatraChanged = "nakshatra" in patch || "nakshatra_padam" in patch;
  const scoreManuallySet = "compatibility_score" in patch && !("is_score_overridden" in patch);
  const overrideBeingCleared = patch.is_score_overridden === false;

  if (scoreManuallySet) {
    // A direct score edit is, by definition, an override.
    finalPatch.is_score_overridden = true;
  } else if (nakshatraChanged || overrideBeingCleared) {
    const { data: current, error: fetchError } = await supabaseAdmin()
      .from("leads")
      .select("nakshatra, nakshatra_padam, is_score_overridden")
      .eq("id", id)
      .single();
    if (fetchError) throw fetchError;

    const effectiveOverridden = patch.is_score_overridden ?? current.is_score_overridden;
    if (!effectiveOverridden) {
      const nakshatra = "nakshatra" in patch ? patch.nakshatra : current.nakshatra;
      const padam = "nakshatra_padam" in patch ? patch.nakshatra_padam : current.nakshatra_padam;
      finalPatch.compatibility_score = await lookupCompatibilityScore(nakshatra, padam);
    }
  }

  const { data, error } = await supabaseAdmin()
    .from("leads")
    .update(finalPatch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data as Lead;
}

export async function addInteraction(
  leadId: string,
  input: { interaction_date?: string; spoke_by: SpokeBy; notes?: string | null }
): Promise<{ interaction: Interaction; status: LeadStatus }> {
  const { data: leadRow, error: leadError } = await supabaseAdmin()
    .from("leads")
    .select("status")
    .eq("id", leadId)
    .single();
  if (leadError) throw leadError;

  const { data, error } = await supabaseAdmin()
    .from("interactions")
    .insert({
      lead_id: leadId,
      interaction_date: input.interaction_date ?? undefined,
      spoke_by: input.spoke_by,
      notes: input.notes ?? null,
    })
    .select("*")
    .single();

  if (error) throw error;

  // Logging a discussion is a signal the lead has moved past "New" — but
  // once it's progressed further, adding another update shouldn't yank it
  // back to "Contacted"; the status stays whatever it was manually set to.
  let status = leadRow.status as LeadStatus;
  if (status === "New") {
    status = "Contacted";
    const { error: statusError } = await supabaseAdmin()
      .from("leads")
      .update({ status })
      .eq("id", leadId);
    if (statusError) throw statusError;
  }

  return { interaction: data as Interaction, status };
}

export async function uploadAttachment(
  leadId: string,
  file: File
): Promise<Attachment> {
  const ext = file.name.includes(".") ? file.name.split(".").pop() : "";
  const path = `${leadId}/${crypto.randomUUID()}${ext ? `.${ext}` : ""}`;

  const { error: uploadError } = await supabaseAdmin()
    .storage.from(LEAD_ATTACHMENTS_BUCKET)
    .upload(path, file, { contentType: file.type || undefined });

  if (uploadError) throw uploadError;

  const { data, error } = await supabaseAdmin()
    .from("attachments")
    .insert({ lead_id: leadId, file_url: path, file_name: file.name })
    .select("*")
    .single();

  if (error) throw error;
  return data as Attachment;
}

// Stores the cropped DP under its own path (not an attachments row — it
// renders separately as a small circular avatar) and points the lead at it.
async function uploadProfilePictureData(
  leadId: string,
  data: File | Buffer,
  contentType: string
): Promise<string> {
  const path = `${leadId}/dp-${crypto.randomUUID()}.jpg`;

  const { error: uploadError } = await supabaseAdmin()
    .storage.from(LEAD_ATTACHMENTS_BUCKET)
    .upload(path, data, { contentType });

  if (uploadError) throw uploadError;

  const { error } = await supabaseAdmin()
    .from("leads")
    .update({ profile_picture_url: path })
    .eq("id", leadId);

  if (error) throw error;
  return path;
}

export async function setProfilePicture(leadId: string, file: File): Promise<string> {
  return uploadProfilePictureData(leadId, file, file.type || "image/jpeg");
}

export async function setProfilePictureFromBuffer(
  leadId: string,
  buffer: Buffer
): Promise<string> {
  return uploadProfilePictureData(leadId, buffer, "image/jpeg");
}
