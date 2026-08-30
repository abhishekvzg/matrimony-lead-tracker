import "server-only";
import { supabaseAdmin, LEAD_ATTACHMENTS_BUCKET } from "./supabase";
import type {
  Attachment,
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

async function attachSignedUrls(lead: RawLead): Promise<LeadWithRelations> {
  const attachments = await withSignedUrls(lead.attachments ?? []);
  return {
    ...lead,
    attachments,
    interactions: lead.interactions ?? [],
  };
}

export async function listLeadsWithRelations(
  archived: boolean
): Promise<LeadWithRelations[]> {
  const { data, error } = await supabaseAdmin()
    .from("leads")
    .select("*, attachments(*), interactions(*)")
    .eq("archived", archived)
    .order("updated_at", { ascending: false })
    .order("interaction_date", { referencedTable: "interactions", ascending: false })
    .order("created_at", { referencedTable: "interactions", ascending: false })
    .order("uploaded_at", { referencedTable: "attachments", ascending: true });

  if (error) throw error;

  return Promise.all((data as RawLead[]).map(attachSignedUrls));
}

export async function getLeadWithRelations(
  id: string
): Promise<LeadWithRelations | null> {
  const { data, error } = await supabaseAdmin()
    .from("leads")
    .select("*, attachments(*), interactions(*)")
    .eq("id", id)
    .order("interaction_date", { referencedTable: "interactions", ascending: false })
    .order("created_at", { referencedTable: "interactions", ascending: false })
    .order("uploaded_at", { referencedTable: "attachments", ascending: true })
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return attachSignedUrls(data as RawLead);
}

export async function createLead(
  fields: Partial<ExtractedLeadFields> & { source?: string | null }
): Promise<Lead> {
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
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as Lead;
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
  status?: LeadStatus;
  archived?: boolean;
}

export async function updateLead(
  id: string,
  patch: LeadPatch
): Promise<Lead> {
  const { data, error } = await supabaseAdmin()
    .from("leads")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data as Lead;
}

export async function addInteraction(
  leadId: string,
  input: { interaction_date?: string; spoke_by: SpokeBy; notes?: string | null }
): Promise<Interaction> {
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
  return data as Interaction;
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
