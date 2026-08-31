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

  if ("compatibility_score" in body) {
    patch.compatibility_score =
      body.compatibility_score === null || body.compatibility_score === ""
        ? null
        : Number(body.compatibility_score);
  }

  if ("is_score_overridden" in body) {
    patch.is_score_overridden = Boolean(body.is_score_overridden);
  }

  if ("profile_picture_url" in body) {
    patch.profile_picture_url = body.profile_picture_url === "" ? null : body.profile_picture_url;
  }

  const lead = await updateLead(id, patch);
  return NextResponse.json({ lead });
}
