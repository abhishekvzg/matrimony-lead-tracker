"use client";

import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { cropImageToArea } from "@/lib/cropImage";

export default function ManualCropModal({
  imageSrc,
  onCancel,
  onCropped,
}: {
  imageSrc: string;
  onCancel: () => void;
  onCropped: (blob: Blob) => void;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  async function handleSave() {
    if (!croppedAreaPixels) return;
    setSaving(true);
    setError("");
    try {
      const blob = await cropImageToArea(imageSrc, croppedAreaPixels);
      onCropped(blob);
    } catch {
      setError("Couldn't crop that image. Try again.");
      setSaving(false);
    }
  }

  return (
    <div className="dialog-backdrop">
      <div className="dialog-panel">
        <div className="flex items-center justify-between text-lg">
          <span>Crop photo</span>
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-ghost px-2 text-lg leading-none"
            aria-label="Close"
          >
            &times;
          </button>
        </div>
        <p className="-mt-2 text-xs text-(--color-label)">
          Drag to reposition, use the slider (or pinch) to zoom in on the face.
        </p>

        <div className="relative h-[65vh] max-h-[520px] min-h-[320px] w-full overflow-hidden rounded-(--radius-xs) bg-black">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            minZoom={1}
            maxZoom={8}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={handleCropComplete}
          />
        </div>

        <input
          type="range"
          min={1}
          max={8}
          step={0.05}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="w-full accent-(--color-accent)"
          aria-label="Zoom"
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="btn btn-secondary flex-1"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !croppedAreaPixels}
            className="btn btn-primary flex-1"
          >
            {saving ? "Saving…" : "Use this photo"}
          </button>
        </div>
      </div>
    </div>
  );
}
