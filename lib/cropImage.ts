// Client-side face crop. Takes Gemini's normalized [ymin, xmin, ymax, xmax]
// (0-1000 scale) box, expands it with headroom padding, and renders a square
// JPEG crop — done in the browser via Canvas so the server never needs a
// native image-processing dependency.
export async function cropImageToFace(
  file: File,
  box: [number, number, number, number],
  paddingRatio = 0.4
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;

  const [ymin, xmin, ymax, xmax] = box;
  const boxW = ((xmax - xmin) / 1000) * width;
  const boxH = ((ymax - ymin) / 1000) * height;
  const cx = ((xmin + xmax) / 2 / 1000) * width;
  const cy = ((ymin + ymax) / 2 / 1000) * height;

  let side = Math.max(boxW, boxH) * (1 + paddingRatio);
  side = Math.min(side, width, height);

  const sx = Math.max(0, Math.min(cx - side / 2, width - side));
  const sy = Math.max(0, Math.min(cy - side / 2, height - side));

  const outSize = 320;
  const canvas = document.createElement("canvas");
  canvas.width = outSize;
  canvas.height = outSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, outSize, outSize);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Failed to crop image"))),
      "image/jpeg",
      0.9
    );
  });
}
