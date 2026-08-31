import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { extractLeadFields } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const text = formData.get("text");
  const imageFiles = formData.getAll("images").filter((f): f is File => f instanceof File);

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
    return NextResponse.json({ error: "Extraction failed" }, { status: 502 });
  }
}
