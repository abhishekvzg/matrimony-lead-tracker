import "server-only";
import { GoogleGenAI, createPartFromBase64, createUserContent } from "@google/genai";
import { EXTRACTED_FIELD_KEYS, type ExtractedLeadFields } from "./types";

const EXTRACTION_PROMPT = `You are extracting structured data from an Indian matrimony bio-data (image or text).
Return ONLY valid JSON, no markdown, no explanation, matching exactly this shape:
{
  "name": string or null,
  "age": number or null,
  "height": string or null,
  "education": string or null,
  "profession": string or null,
  "location": string or null,
  "income": string or null,
  "father_occupation": string or null,
  "mother_occupation": string or null,
  "siblings": string or null,
  "other_details": string or null
}
Put anything relevant that doesn't fit the above fields into "other_details".
If a field is not present in the input, use null. Do not guess or hallucinate values.`;

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Missing GEMINI_API_KEY in .env.local");
    }
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

export async function extractLeadFields(input: {
  images: { base64: string; mimeType: string }[];
  text?: string;
}): Promise<ExtractedLeadFields> {
  const parts: (string | ReturnType<typeof createPartFromBase64>)[] = [EXTRACTION_PROMPT];
  if (input.text) parts.push(`Text input:\n${input.text}`);
  for (const image of input.images) {
    parts.push(createPartFromBase64(image.base64, image.mimeType));
  }

  const response = await getClient().models.generateContent({
    model: "gemini-3.6-flash",
    contents: createUserContent(parts),
    config: { responseMimeType: "application/json" },
  });

  const text = response.text;
  if (!text) throw new Error("Empty response from Gemini");

  const parsed = JSON.parse(text) as Record<string, unknown>;
  const result = {} as Record<keyof ExtractedLeadFields, unknown>;
  for (const key of EXTRACTED_FIELD_KEYS) {
    const value = parsed[key];
    result[key] = value === undefined ? null : value;
  }

  if (result.age !== null && result.age !== undefined) {
    const age = Number(result.age);
    result.age = Number.isFinite(age) ? age : null;
  }

  return result as unknown as ExtractedLeadFields;
}
