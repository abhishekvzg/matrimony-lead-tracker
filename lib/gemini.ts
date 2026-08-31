import "server-only";
import { GoogleGenAI, createPartFromBase64, createUserContent } from "@google/genai";
import {
  EXTRACTED_FIELD_KEYS,
  NAKSHATRAS,
  NAKSHATRA_PADAMS,
  type ExtractedContact,
  type ExtractedLeadFields,
  type ExtractionResult,
  type FaceCandidate,
} from "./types";

const FACE_DETECTION_PROMPT = `You will be given one or more images, indexed starting at 0 in the order provided.
Detect every human face that appears in each image (a real photo of a person — not a
logo, icon, drawing, or document scan of text).
Return ONLY valid JSON, no markdown, no explanation, as an array. One entry per face found:
[
  { "imageIndex": number, "box": [ymin, xmin, ymax, xmax] }
]
"box" coordinates are integers normalized to a 0-1000 scale, in that exact order
(ymin, xmin, ymax, xmax), representing the tight bounding box around the face
(just the face/head area, not the whole body).
If an image contains no human face, contribute no entries for it.
If no faces are found in any image, return an empty array: []`;

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
  "date_of_birth": string or null,
  "time_of_birth": string or null,
  "place_of_birth": string or null,
  "rashi": string or null,
  "nakshatra": string or null,
  "nakshatra_padam": string or null,
  "religion": string or null,
  "caste": string or null,
  "gotra": string or null,
  "weight": string or null,
  "complexion": string or null,
  "father_name": string or null,
  "mother_name": string or null,
  "address": string or null,
  "other_details": string or null,
  "contacts": [ { "label": string or null, "phone_number": string } ]
}

Field notes:
- "date_of_birth": format as "YYYY-MM-DD". If only a partial date is given, use null.
- "time_of_birth": keep as written (e.g. "01:06 PM").
- "nakshatra": normalize to EXACTLY one of these 27 values, matching common
  alternate spellings to the closest one in this list: ${NAKSHATRAS.join(", ")}.
  For example: Ardra -> Aarudra, Chitra -> Chitta, Swati -> Swathi, Magha -> Makha,
  Mula -> Moola, Shatabhisha/Sadhabisham -> Satabhisha, Purva Phalguni -> Pubba,
  Uttara Phalguni -> Uttara, Purva Ashada/Purvashadha -> Purvashada,
  Uttara Ashada -> Uttarashada, Purva Bhadrapada -> Purvabhadra,
  Uttara Bhadrapada -> Uttarabhadra, Revati -> Revathi, Shravana -> Shravanam,
  Hasta -> Hastha, Pushya -> Pushyami. If you cannot confidently map it to one
  of the 27 values, use null — do not invent a value outside this list.
- "nakshatra_padam": one of "${NAKSHATRA_PADAMS.join('", "')}" (as a string), or null.
- "contacts": find every phone number in the input, even if several are listed
  together (e.g. "Contact: 98765xxxxx, Father: 98123xxxxx"). Split each into
  its own entry. Use a short descriptive label when the input implies one
  (e.g. "Candidate", "Father", "Mother"); otherwise use null for the label.
  If no phone numbers are found, use an empty array.

Put anything relevant that doesn't fit the named fields into "other_details".
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
}): Promise<ExtractionResult> {
  const parts: (string | ReturnType<typeof createPartFromBase64>)[] = [EXTRACTION_PROMPT];
  if (input.text) parts.push(`Text input:\n${input.text}`);
  for (const image of input.images) {
    parts.push(createPartFromBase64(image.base64, image.mimeType));
  }

  const [response, faceCandidates] = await Promise.all([
    getClient().models.generateContent({
      model: "gemini-3.6-flash",
      contents: createUserContent(parts),
      config: { responseMimeType: "application/json" },
    }),
    detectFaces(input.images).catch(() => []),
  ]);

  const text = response.text;
  if (!text) throw new Error("Empty response from Gemini");

  const parsed = JSON.parse(text) as Record<string, unknown>;

  const fields = {} as Record<keyof ExtractedLeadFields, unknown>;
  for (const key of EXTRACTED_FIELD_KEYS) {
    const value = parsed[key];
    fields[key] = value === undefined || value === "" ? null : value;
  }

  if (fields.age !== null) {
    const age = Number(fields.age);
    fields.age = Number.isFinite(age) ? age : null;
  }

  if (typeof fields.nakshatra === "string" && !(NAKSHATRAS as readonly string[]).includes(fields.nakshatra)) {
    fields.nakshatra = null;
  }

  if (
    typeof fields.nakshatra_padam === "string" &&
    !(NAKSHATRA_PADAMS as readonly string[]).includes(fields.nakshatra_padam)
  ) {
    fields.nakshatra_padam = null;
  }

  const rawContacts = Array.isArray(parsed.contacts) ? parsed.contacts : [];
  const contacts: ExtractedContact[] = rawContacts
    .filter((c): c is Record<string, unknown> => typeof c === "object" && c !== null)
    .map((c) => ({
      label: typeof c.label === "string" && c.label.trim() ? c.label.trim() : null,
      phone_number: typeof c.phone_number === "string" ? c.phone_number.trim() : "",
    }))
    .filter((c) => c.phone_number.length > 0);

  return { fields: fields as unknown as ExtractedLeadFields, contacts, faceCandidates };
}

export async function detectFaces(
  images: { base64: string; mimeType: string }[]
): Promise<FaceCandidate[]> {
  if (images.length === 0) return [];

  const parts = [
    FACE_DETECTION_PROMPT,
    ...images.map((image) => createPartFromBase64(image.base64, image.mimeType)),
  ];

  const response = await getClient().models.generateContent({
    model: "gemini-3.6-flash",
    contents: createUserContent(parts),
    config: { responseMimeType: "application/json" },
  });

  const text = response.text;
  if (!text) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  return parsed
    .filter((c): c is Record<string, unknown> => typeof c === "object" && c !== null)
    .map((c): FaceCandidate | null => {
      const imageIndex = Number(c.imageIndex);
      const box = c.box;
      if (
        !Number.isInteger(imageIndex) ||
        imageIndex < 0 ||
        imageIndex >= images.length ||
        !Array.isArray(box) ||
        box.length !== 4 ||
        !box.every((n) => typeof n === "number" && Number.isFinite(n))
      ) {
        return null;
      }
      return { imageIndex, box: box as [number, number, number, number] };
    })
    .filter((c): c is FaceCandidate => c !== null);
}
