const EMPTY_PRODUCT_IMAGE =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><rect fill="#e2e8f0" width="800" height="600"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#94a3b8" font-family="system-ui,sans-serif" font-size="18">No image</text></svg>`,
  );

/**
 * Ordered gallery URLs for a product. Supports legacy single `image` field.
 * @param {object} product
 * @returns {string[]}
 */
export function getProductImageUrls(product) {
  const fromImages = Array.isArray(product?.images)
    ? product.images.map((u) => String(u || "").trim()).filter(Boolean)
    : [];
  if (fromImages.length) {
    return fromImages;
  }
  const legacy = String(product?.image || "").trim();
  return legacy ? [legacy] : [];
}

/**
 * Primary image for cart rows, thumbnails, etc.
 * @param {object} productOrLineItem — product or cart line (same shape)
 * @returns {string}
 */
export function getPrimaryProductImageUrl(productOrLineItem) {
  const urls = getProductImageUrls(productOrLineItem);
  return urls[0] || EMPTY_PRODUCT_IMAGE;
}
