// Crops a user-selected rectangle (in source-image pixel coordinates, as
// produced by react-easy-crop's onCropComplete) into a square JPEG — done
// in the browser via Canvas so the server never needs a native
// image-processing dependency. Used for manually setting a profile picture
// from any uploaded photo.
export async function cropImageToArea(
  imageSrc: string,
  area: { x: number; y: number; width: number; height: number }
): Promise<Blob> {
  const image = await loadImage(imageSrc);

  const outSize = 320;
  const canvas = document.createElement("canvas");
  canvas.width = outSize;
  canvas.height = outSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.drawImage(
    image,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    outSize,
    outSize
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Failed to crop image"))),
      "image/jpeg",
      0.9
    );
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}
