import { NextResponse } from "next/server";
import { addContact } from "@/lib/contacts";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => null);

  if (!body || typeof body.phone_number !== "string" || !body.phone_number.trim()) {
    return NextResponse.json({ error: "phone_number is required" }, { status: 400 });
  }

  const contact = await addContact(id, {
    label: typeof body.label === "string" && body.label.trim() ? body.label.trim() : null,
    phone_number: body.phone_number.trim(),
  });

  return NextResponse.json({ contact }, { status: 201 });
}
