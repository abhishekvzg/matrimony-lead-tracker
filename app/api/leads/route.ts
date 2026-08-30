import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createLead, listLeadsWithRelations, uploadAttachment } from "@/lib/leads";
import { EXTRACTED_FIELD_KEYS } from "@/lib/types";

export async function GET(request: NextRequest) {
  const archived = request.nextUrl.searchParams.get("archived") === "true";
  const leads = await listLeadsWithRelations(archived);
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

  const files = formData.getAll("files").filter((f): f is File => f instanceof File);
  for (const file of files) {
    if (file.size > 0) await uploadAttachment(lead.id, file);
  }

  return NextResponse.json({ id: lead.id }, { status: 201 });
}
