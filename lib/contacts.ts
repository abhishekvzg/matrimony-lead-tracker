import "server-only";
import { supabaseAdmin } from "./supabase";
import type { Contact } from "./types";

export async function addContact(
  leadId: string,
  input: { label?: string | null; phone_number: string }
): Promise<Contact> {
  const { data, error } = await supabaseAdmin()
    .from("contacts")
    .insert({ lead_id: leadId, label: input.label ?? null, phone_number: input.phone_number })
    .select("*")
    .single();

  if (error) throw error;
  return data as Contact;
}

export async function updateContact(
  contactId: string,
  patch: { label?: string | null; phone_number?: string }
): Promise<Contact> {
  const { data, error } = await supabaseAdmin()
    .from("contacts")
    .update(patch)
    .eq("id", contactId)
    .select("*")
    .single();

  if (error) throw error;
  return data as Contact;
}

export async function deleteContact(contactId: string): Promise<void> {
  const { error } = await supabaseAdmin().from("contacts").delete().eq("id", contactId);
  if (error) throw error;
}
