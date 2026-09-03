import { NextResponse } from "next/server";
import { uploadAttachment } from "@/lib/leads";

// Uploads are sequential per file, same reasoning as the lead-creation route.
export const maxDuration = 60;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const formData = await request.formData();
  const files = formData
    .getAll("files")
    .filter((f): f is File => f instanceof File && f.size > 0);

  if (files.length === 0) {
    return NextResponse.json({ error: "Provide at least one file" }, { status: 400 });
  }

  const attachments = [];
  for (const file of files) {
    attachments.push(await uploadAttachment(id, file));
  }

  return NextResponse.json({ attachments }, { status: 201 });
}
