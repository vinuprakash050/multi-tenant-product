/**
 * Load an image for canvas cropping (blob / data / same-origin URLs).
 * @param {string} src
 * @returns {Promise<HTMLImageElement>}
 */
export function createImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    if (/^https?:\/\//i.test(src)) {
      image.crossOrigin = "anonymous";
    }
    image.src = src;
  });
}

/**
 * @param {string} imageSrc
 * @param {import('react-easy-crop').Area} pixelCrop — croppedAreaPixels from react-easy-crop
 * @param {number} [quality=0.9]
 * @returns {Promise<Blob>}
 */
export async function getCroppedImageBlob(imageSrc, pixelCrop, quality = 0.9) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Could not get canvas context.");
  }

  const { width, height, x, y } = pixelCrop;
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));

  ctx.drawImage(image, x, y, width, height, 0, 0, canvas.width, canvas.height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Could not export cropped image."));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      quality,
    );
  });
}

/**
 * Reduce JPEG quality until blob is under maxBytes (or minQuality reached).
 * @param {Blob} blob
 * @param {string} imageSrc — same source used for first crop, for re-export
 * @param {import('react-easy-crop').Area} pixelCrop
 * @param {number} maxBytes
 * @returns {Promise<Blob>}
 */
export async function getCroppedImageBlobUnderSize(imageSrc, pixelCrop, maxBytes, minQuality = 0.5) {
  let q = 0.92;
  let blob = await getCroppedImageBlob(imageSrc, pixelCrop, q);
  while (blob.size > maxBytes && q > minQuality + 0.01) {
    q -= 0.07;
    blob = await getCroppedImageBlob(imageSrc, pixelCrop, q);
  }
  return blob;
}
