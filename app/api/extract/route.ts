import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { extractLeadFields, GeminiQuotaExceededError } from "@/lib/gemini";
import {
  MAX_EXTRACTION_FILES,
  MAX_EXTRACTION_UPLOAD_BYTES,
  formatBytes,
  isPdfFileName,
} from "@/lib/types";

// The Gemini call runs against full-size images or PDFs here; the platform
// default of 10s is too tight and was causing intermittent timeouts on upload.
export const maxDuration = 60;

function mimeTypeFor(file: File): string | null {
  if (file.type === "application/pdf" || isPdfFileName(file.name)) {
    return "application/pdf";
  }
  if (file.type.startsWith("image/")) return file.type;
  // Some browsers hand over an empty type for files picked from cloud
  // storage; fall back to JPEG only when it isn't recognisably a PDF.
  if (!file.type) return "image/jpeg";
  return null;
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const text = formData.get("text");
  // Capped at MAX_EXTRACTION_FILES (a 2-page biodata) — more than that
  // pushes Gemini's processing time past the per-attempt timeout. Bulk/
  // reference photos belong in the attachments endpoint, which stores them
  // directly with no Gemini call at all.
  const uploads = formData
    .getAll("images")
    .filter((f): f is File => f instanceof File && f.size > 0)
    .slice(0, MAX_EXTRACTION_FILES);

  if (uploads.length === 0 && typeof text !== "string") {
    return NextResponse.json(
      { error: "Provide at least one image or PDF, or some text" },
      { status: 400 }
    );
  }

  for (const file of uploads) {
    if (mimeTypeFor(file) === null) {
      return NextResponse.json(
        { error: `${file.name || "That file"} isn't an image or a PDF.` },
        { status: 400 }
      );
    }
  }

  const totalBytes = uploads.reduce((sum, f) => sum + f.size, 0);
  if (totalBytes > MAX_EXTRACTION_UPLOAD_BYTES) {
    return NextResponse.json(
      {
        error: `Those files total ${formatBytes(totalBytes)}, over the ${formatBytes(
          MAX_EXTRACTION_UPLOAD_BYTES
        )} limit. Try a smaller scan, or split the PDF.`,
      },
      { status: 413 }
    );
  }

  const images = await Promise.all(
    uploads.map(async (file) => ({
      base64: Buffer.from(await file.arrayBuffer()).toString("base64"),
      mimeType: mimeTypeFor(file) as string,
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
