import { NextResponse } from "next/server";
import { supabaseAdmin, LEAD_ATTACHMENTS_BUCKET } from "@/lib/supabase";
import { detectFaces } from "@/lib/gemini";
import { cropBufferToFace } from "@/lib/serverCrop";
import { setProfilePictureFromBuffer } from "@/lib/leads";

// Downloads every attachment, runs a Gemini face-detection call, then crops
// server-side — easily past the platform's default 10s timeout.
export const maxDuration = 60;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data: attachments, error } = await supabaseAdmin()
    .from("attachments")
    .select("file_url")
    .eq("lead_id", id);
  if (error) throw error;

  if (!attachments || attachments.length === 0) {
    return NextResponse.json({ status: "none" });
  }

  const downloaded = await Promise.all(
    attachments.map(async (a) => {
      const { data, error: dlError } = await supabaseAdmin()
        .storage.from(LEAD_ATTACHMENTS_BUCKET)
        .download(a.file_url);
      if (dlError || !data) return null;
      const buffer = Buffer.from(await data.arrayBuffer());
      return { buffer, mimeType: data.type || "image/jpeg" };
    })
  );
  const images = downloaded.filter((d): d is NonNullable<typeof d> => d !== null);

  if (images.length === 0) {
    return NextResponse.json({ status: "none" });
  }

  const faceCandidates = await detectFaces(
    images.map((img) => ({ base64: img.buffer.toString("base64"), mimeType: img.mimeType }))
  );

  if (faceCandidates.length === 0) {
    return NextResponse.json({ status: "none" });
  }

  if (faceCandidates.length === 1) {
    const [candidate] = faceCandidates;
    const cropped = await cropBufferToFace(images[candidate.imageIndex].buffer, candidate.box);
    await setProfilePictureFromBuffer(id, cropped);
    return NextResponse.json({ status: "set" });
  }

  const candidates = await Promise.all(
    faceCandidates.map(async (c, i) => {
      const cropped = await cropBufferToFace(images[c.imageIndex].buffer, c.box);
      return { index: i, dataUrl: `data:image/jpeg;base64,${cropped.toString("base64")}` };
    })
  );
  return NextResponse.json({ status: "choose", candidates });
}
