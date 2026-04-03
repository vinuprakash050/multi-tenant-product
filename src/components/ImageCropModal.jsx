import { useCallback, useEffect, useState } from "react";
import Cropper from "react-easy-crop";
import { getCroppedImageBlobUnderSize } from "../lib/imageCrop";

const MAX_CROPPED_BYTES = 480 * 1024;

/**
 * Full-screen style overlay: crop then confirm to receive a JPEG Blob.
 */
function ImageCropModal({ isOpen, imageSrc, aspect = 4 / 3, onClose, onConfirm, title = "Crop photo" }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const onCropComplete = useCallback((_, areaPixels) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
      setError("");
      setBusy(false);
    }
  }, [isOpen, imageSrc]);

  async function handleConfirm() {
    if (!imageSrc || !croppedAreaPixels) {
      setError("Adjust the crop area first.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const blob = await getCroppedImageBlobUnderSize(imageSrc, croppedAreaPixels, MAX_CROPPED_BYTES);
      await onConfirm(blob);
      onClose();
    } catch (err) {
      setError(err?.message || "Could not process the image.");
    } finally {
      setBusy(false);
    }
  }

  function handleBackdropClick(event) {
    if (event.target === event.currentTarget && !busy) {
      onClose();
    }
  }

  if (!isOpen || !imageSrc) {
    return null;
  }

  return (
    <div className="image-crop-overlay" role="dialog" aria-modal="true" aria-labelledby="image-crop-title" onClick={handleBackdropClick}>
      <div className="image-crop-modal panel" onClick={(e) => e.stopPropagation()}>
        <div className="image-crop-modal-header">
          <div>
            <span className="eyebrow">Product photo</span>
            <h2 id="image-crop-title">{title}</h2>
            <p>Drag to reposition, use the slider to zoom, then confirm to add this image.</p>
          </div>
          <button type="button" className="image-crop-close" onClick={() => !busy && onClose()} aria-label="Close crop dialog">
            ×
          </button>
        </div>

        <div className="image-crop-stage">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            showGrid={false}
          />
        </div>

        <div className="image-crop-zoom">
          <label htmlFor="image-crop-zoom-range">Zoom</label>
          <input
            id="image-crop-zoom-range"
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
          />
        </div>

        {error ? <p className="info-message info-message-error image-crop-error">{error}</p> : null}

        <div className="image-crop-actions">
          <button type="button" className="button button-secondary" onClick={() => !busy && onClose()} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="button" onClick={handleConfirm} disabled={busy}>
            {busy ? "Processing…" : "Add image"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ImageCropModal;
