import { NextResponse } from "next/server";
import { addInteraction } from "@/lib/leads";
import { SPOKE_BY_OPTIONS } from "@/lib/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => null);

  if (!body || !SPOKE_BY_OPTIONS.includes(body.spoke_by)) {
    return NextResponse.json({ error: "Invalid spoke_by" }, { status: 400 });
  }

  // Logging an interaction moves a lead from New to Contacted, so a blank one
  // would advance the pipeline while recording nothing about why.
  const notes = typeof body.notes === "string" ? body.notes.trim() : "";
  if (!notes) {
    return NextResponse.json(
      { error: "Add a note describing what happened." },
      { status: 400 }
    );
  }

  const { interaction, status } = await addInteraction(id, {
    interaction_date: typeof body.interaction_date === "string" ? body.interaction_date : undefined,
    spoke_by: body.spoke_by,
    notes,
  });

  return NextResponse.json({ interaction, status }, { status: 201 });
}
