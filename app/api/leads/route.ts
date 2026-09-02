import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  createContacts,
  createLead,
  listLeadsWithRelations,
  setProfilePicture,
  uploadAttachment,
} from "@/lib/leads";
import { EXTRACTED_FIELD_KEYS } from "@/lib/types";

// POST uploads attachments and the profile picture to Supabase Storage
// sequentially, which can add up past the platform's default 10s timeout
// when a lead has several screenshots.
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const hidden = request.nextUrl.searchParams.get("hidden") === "true";
  const leads = await listLeadsWithRelations(hidden);
  return NextResponse.json({ leads });
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();

  const fieldsRaw = formData.get("fields");
  if (typeof fieldsRaw !== "string") {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(fieldsRaw);
  } catch {
    return NextResponse.json({ error: "Invalid fields JSON" }, { status: 400 });
  }

  const fields: Record<string, unknown> = {};
  for (const key of EXTRACTED_FIELD_KEYS) {
    if (key in parsed) fields[key] = parsed[key];
  }
  if (typeof parsed.source === "string" || parsed.source === null) {
    fields.source = parsed.source;
  }
  if (parsed.age !== undefined && parsed.age !== null) {
    const age = Number(parsed.age);
    fields.age = Number.isFinite(age) ? age : null;
  }

  const lead = await createLead(fields);

  const contactsRaw = formData.get("contacts");
  if (typeof contactsRaw === "string") {
    try {
      const contactsParsed: unknown = JSON.parse(contactsRaw);
      if (Array.isArray(contactsParsed)) {
        const contacts = contactsParsed
          .filter((c): c is Record<string, unknown> => typeof c === "object" && c !== null)
          .map((c) => ({
            label: typeof c.label === "string" && c.label.trim() ? c.label.trim() : null,
            phone_number: typeof c.phone_number === "string" ? c.phone_number.trim() : "",
          }))
          .filter((c) => c.phone_number.length > 0);
        await createContacts(lead.id, contacts);
      }
    } catch {
      // Malformed contacts payload — the lead itself is still created.
    }
  }

  const files = formData.getAll("files").filter((f): f is File => f instanceof File);
  for (const file of files) {
    if (file.size > 0) await uploadAttachment(lead.id, file);
  }

  const profilePicture = formData.get("profile_picture");
  if (profilePicture instanceof File && profilePicture.size > 0) {
    await setProfilePicture(lead.id, profilePicture);
  }

  return NextResponse.json({ id: lead.id }, { status: 201 });
}
