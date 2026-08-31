import "server-only";
import sharp from "sharp";

// Server-side counterpart to lib/cropImage.ts's client-side Canvas crop —
// same math, used when the source image already lives in Storage (no
// browser File object to hand to Canvas), e.g. re-detecting a DP from
// attachments uploaded in an earlier session.
export async function cropBufferToFace(
  buffer: Buffer,
  box: [number, number, number, number],
  paddingRatio = 0.4
): Promise<Buffer> {
  const image = sharp(buffer);
  const meta = await image.metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (!width || !height) throw new Error("Could not read image dimensions");

  const [ymin, xmin, ymax, xmax] = box;
  const boxW = ((xmax - xmin) / 1000) * width;
  const boxH = ((ymax - ymin) / 1000) * height;
  const cx = ((xmin + xmax) / 2 / 1000) * width;
  const cy = ((ymin + ymax) / 2 / 1000) * height;

  let side = Math.max(boxW, boxH) * (1 + paddingRatio);
  side = Math.min(side, width, height);

  const left = Math.round(Math.max(0, Math.min(cx - side / 2, width - side)));
  const top = Math.round(Math.max(0, Math.min(cy - side / 2, height - side)));
  const size = Math.round(side);

  return sharp(buffer)
    .extract({ left, top, width: size, height: size })
    .resize(320, 320)
    .jpeg({ quality: 90 })
    .toBuffer();
}
