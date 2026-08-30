import { NextResponse } from "next/server";
import { getLeadWithRelations, updateLead, type LeadPatch } from "@/lib/leads";
import { EXTRACTED_FIELD_KEYS, LEAD_STATUSES } from "@/lib/types";

const PATCHABLE_KEYS = [...EXTRACTED_FIELD_KEYS, "source"] as const;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const lead = await getLeadWithRelations(id);
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ lead });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const patch: LeadPatch = {};

  for (const key of PATCHABLE_KEYS) {
    if (key in body) {
      (patch as Record<string, unknown>)[key] = body[key];
    }
  }

  if ("age" in body) {
    patch.age = body.age === null || body.age === "" ? null : Number(body.age);
  }

  if ("status" in body) {
    if (!LEAD_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    patch.status = body.status;
  }

  if ("archived" in body) {
    patch.archived = Boolean(body.archived);
  }

  const lead = await updateLead(id, patch);
  return NextResponse.json({ lead });
}
