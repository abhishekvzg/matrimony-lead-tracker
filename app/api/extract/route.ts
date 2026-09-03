import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { extractLeadFields, GeminiQuotaExceededError } from "@/lib/gemini";
import { MAX_EXTRACTION_IMAGES } from "@/lib/types";

// The Gemini call runs against full-size images here; the platform default
// of 10s is too tight and was causing intermittent timeouts on upload.
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const text = formData.get("text");
  // Capped at MAX_EXTRACTION_IMAGES (a 2-page biodata) — more than that
  // pushes Gemini's processing time past the per-attempt timeout. Bulk/
  // reference photos belong in the attachments endpoint, which stores them
  // directly with no Gemini call at all.
  const imageFiles = formData
    .getAll("images")
    .filter((f): f is File => f instanceof File)
    .slice(0, MAX_EXTRACTION_IMAGES);

  if (imageFiles.length === 0 && typeof text !== "string") {
    return NextResponse.json(
      { error: "Provide at least one image or some text" },
      { status: 400 }
    );
  }

  const images = await Promise.all(
    imageFiles.map(async (file) => ({
      base64: Buffer.from(await file.arrayBuffer()).toString("base64"),
      mimeType: file.type || "image/jpeg",
    }))
  );

  try {
    const result = await extractLeadFields({
      images,
      text: typeof text === "string" ? text : undefined,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("Gemini extraction failed", err);
    if (err instanceof GeminiQuotaExceededError) {
      return NextResponse.json({ error: err.message, quotaExceeded: true }, { status: 429 });
    }
    return NextResponse.json({ error: "Extraction failed" }, { status: 502 });
  }
}
