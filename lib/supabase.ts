import "server-only";
import { createClient } from "@supabase/supabase-js";

// Server-only client using the service role key. RLS is enabled with no
// public policies on every table, so this is the only client that can read
// or write data — never import this file from a client component.
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase env vars: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

let cached: ReturnType<typeof getSupabaseAdmin> | null = null;

export function supabaseAdmin() {
  if (!cached) cached = getSupabaseAdmin();
  return cached;
}

export const LEAD_ATTACHMENTS_BUCKET = "lead-attachments";
