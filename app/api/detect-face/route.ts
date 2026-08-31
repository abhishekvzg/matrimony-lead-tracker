import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { detectFaces } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const imageFiles = formData.getAll("images").filter((f): f is File => f instanceof File);

  if (imageFiles.length === 0) {
    return NextResponse.json({ error: "Provide at least one image" }, { status: 400 });
  }

  const images = await Promise.all(
    imageFiles.map(async (file) => ({
      base64: Buffer.from(await file.arrayBuffer()).toString("base64"),
      mimeType: file.type || "image/jpeg",
    }))
  );

  try {
    const faceCandidates = await detectFaces(images);
    return NextResponse.json({ faceCandidates });
  } catch (err) {
    console.error("Face detection failed", err);
    return NextResponse.json({ error: "Detection failed" }, { status: 502 });
  }
}
