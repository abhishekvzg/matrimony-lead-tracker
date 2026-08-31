import { NextResponse } from "next/server";
import { setProfilePicture } from "@/lib/leads";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  await setProfilePicture(id, file);
  return NextResponse.json({ ok: true });
}
