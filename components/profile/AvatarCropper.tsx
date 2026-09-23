"use client";

import { useCallback, useState } from "react";
import Cropper, { Area } from "react-easy-crop";
import { X } from "lucide-react";
import { getCroppedImage } from "@/lib/utils/crop-image";

interface AvatarCropperProps {
  image: string;
  onCancel: () => void;
  onSave: (file: File, preview: string) => void;
}

export default function AvatarCropper({
  image,
  onCancel,
  onSave,
}: AvatarCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] =
    useState<Area | null>(null);

  const onCropComplete = useCallback(
    (_: Area, croppedPixels: Area) => {
      setCroppedAreaPixels(croppedPixels);
    },
    []
  );

  async function handleSave() {
    if (!croppedAreaPixels) return;

    const blob = await getCroppedImage(image, croppedAreaPixels);

    const file = new File(
      [blob],
      `avatar-${Date.now()}.jpg`,
      { type: "image/jpeg" }
    );

    const preview = URL.createObjectURL(blob);

    onSave(file, preview);
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,.72)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 430,
          background: "#fff",
          borderRadius: 24,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: 56,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 18px",
            borderBottom: "1px solid #eee",
          }}
        >
          <button
            type="button"
            onClick={onCancel}
            style={{
              border: 0,
              background: "transparent",
              cursor: "pointer",
            }}
          >
            <X size={20} />
          </button>

          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            ajustar foto
          </span>

          <button
            type="button"
            onClick={handleSave}
            style={{
              border: 0,
              background: "transparent",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            salvar
          </button>
        </div>

        <div
          style={{
            position: "relative",
            width: "100%",
            height: 420,
            background: "#111",
          }}
        >
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <div
          style={{
            padding: "22px 24px 26px",
          }}
        >
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            style={{
              width: "100%",
            }}
          />

          <p
            style={{
              margin: "10px 0 0",
              textAlign: "center",
              fontSize: 12,
              color: "#777",
            }}
          >
            arraste e ajuste o zoom
          </p>
        </div>
      </div>
    </div>
  );
}