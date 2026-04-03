import { useEffect, useState } from "react";
import { getPrimaryProductImageUrl, getProductImageUrls } from "../lib/productImages";

/**
 * Card-sized gallery with prev/next and dots (single image = no chrome).
 */
function ProductImageGallery({ product, alt, imageClassName = "product-image" }) {
  const urlsRaw = getProductImageUrls(product);
  const urls = urlsRaw.length ? urlsRaw : [getPrimaryProductImageUrl(product)];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [product.id]);

  const len = urls.length;
  const safeIndex = len ? Math.min(index, len - 1) : 0;
  const src = urls[safeIndex] || getPrimaryProductImageUrl(product);
  const showNav = len > 1;

  function stop(event) {
    event.preventDefault();
    event.stopPropagation();
  }

  function goPrev(event) {
    stop(event);
    setIndex((i) => (i - 1 + len) % len);
  }

  function goNext(event) {
    stop(event);
    setIndex((i) => (i + 1) % len);
  }

  return (
    <>
      <img src={src} alt={alt} className={imageClassName} />

      {showNav ? (
        <>
          <button type="button" className="product-gallery-nav product-gallery-prev" onClick={goPrev} aria-label="Previous photo">
            ‹
          </button>
          <button type="button" className="product-gallery-nav product-gallery-next" onClick={goNext} aria-label="Next photo">
            ›
          </button>
          <div className="product-gallery-dots" role="tablist" aria-label="Product photos">
            {urls.map((_, i) => (
              <button
                key={`${product.id}-dot-${i}`}
                type="button"
                role="tab"
                aria-selected={i === safeIndex}
                className={`product-gallery-dot ${i === safeIndex ? "product-gallery-dot-active" : ""}`}
                onClick={(e) => {
                  stop(e);
                  setIndex(i);
                }}
                aria-label={`Photo ${i + 1} of ${len}`}
              />
            ))}
          </div>
        </>
      ) : null}
    </>
  );
}

export default ProductImageGallery;
