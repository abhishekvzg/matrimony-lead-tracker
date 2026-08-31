import { NextResponse } from "next/server";
import { deleteContact, updateContact } from "@/lib/contacts";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  const { contactId } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const patch: { label?: string | null; phone_number?: string } = {};
  if ("label" in body) patch.label = body.label === "" ? null : body.label;
  if ("phone_number" in body) patch.phone_number = body.phone_number;

  const contact = await updateContact(contactId, patch);
  return NextResponse.json({ contact });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  const { contactId } = await params;
  await deleteContact(contactId);
  return NextResponse.json({ ok: true });
}
