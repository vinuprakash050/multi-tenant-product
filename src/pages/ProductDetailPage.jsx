import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { getPrimaryProductImageUrl, getProductImageUrls } from "../lib/productImages";

function ProductDetailPage() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { vendor, vendorMode, products, cart, addToCart, updateCartItem } = useAppContext();

  if (vendorMode === "booking") {
    return (
      <div className="panel">
        <h1>Booking vendors do not use product detail pages.</h1>
        <Link to={`/${vendor.slug}/products`} className="button">
          View facilities
        </Link>
      </div>
    );
  }

  const product = products.find((item) => item.id === productId);

  if (!product) {
    return (
      <div className="panel">
        <h1>Product not found</h1>
        <Link to={`/${vendor.slug}/products`} className="button">
          Back to products
        </Link>
      </div>
    );
  }

  const cartItem = cart.find((item) => item.id === product.id && item.vendorSlug === vendor.slug);
  const quantity = cartItem ? cartItem.quantity : 0;

  const handleAddToCart = () => {
    addToCart(product);
  };

  const handleIncrease = () => {
    updateCartItem(product.id, quantity + 1);
  };

  const handleDecrease = () => {
    updateCartItem(product.id, quantity - 1);
  };

  const imageUrls = getProductImageUrls(product);
  const galleryUrls = imageUrls.length ? imageUrls : [getPrimaryProductImageUrl(product)];
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    setActiveImageIndex(0);
  }, [product.id]);

  const activeSrc = galleryUrls[Math.min(activeImageIndex, galleryUrls.length - 1)] || getPrimaryProductImageUrl(product);
  const hasGallery = galleryUrls.length > 1;

  return (
    <div className="page-stack">
      <div className="page-nav-bar">
        <button type="button" className="button button-secondary page-nav-button" onClick={() => navigate(-1)}>
          Back
        </button>
        <Link to={`/${vendor.slug}/products`} className="button button-secondary page-nav-button">
          All products
        </Link>
      </div>

      <div className="product-detail">
        <div className="detail-gallery">
          <div className="detail-gallery-main">
            <img src={activeSrc} alt={product.name} className="detail-image" />
            {hasGallery ? (
              <>
                <button
                  type="button"
                  className="product-gallery-nav product-gallery-prev detail-gallery-nav"
                  onClick={() => setActiveImageIndex((i) => (i - 1 + galleryUrls.length) % galleryUrls.length)}
                  aria-label="Previous photo"
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="product-gallery-nav product-gallery-next detail-gallery-nav"
                  onClick={() => setActiveImageIndex((i) => (i + 1) % galleryUrls.length)}
                  aria-label="Next photo"
                >
                  ›
                </button>
              </>
            ) : null}
          </div>
          {hasGallery ? (
            <div className="detail-thumbnails" role="tablist" aria-label="Product photos">
              {galleryUrls.map((url, i) => (
                <button
                  key={`${product.id}-thumb-${i}`}
                  type="button"
                  role="tab"
                  aria-selected={i === activeImageIndex}
                  className={`detail-thumb ${i === activeImageIndex ? "detail-thumb-active" : ""}`}
                  onClick={() => setActiveImageIndex(i)}
                  aria-label={`Photo ${i + 1} of ${galleryUrls.length}`}
                >
                  <img src={url} alt="" />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="detail-content">
          <span className="eyebrow">{product.category}</span>
          <h1>{product.name}</h1>
          <p className="detail-price">Rs. {product.price}</p>
          <p>{product.description}</p>

          <ul className="feature-list">
            {(product.features || []).map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>

          <div className="card-actions">
            {quantity === 0 ? (
              <button type="button" className="button" onClick={handleAddToCart}>
                Add to cart
              </button>
            ) : (
              <div className="quantity-controls">
                <button type="button" className="quantity-btn" onClick={handleDecrease}>
                  -
                </button>
                <span className="quantity-display">{quantity}</span>
                <button type="button" className="quantity-btn" onClick={handleIncrease}>
                  +
                </button>
              </div>
            )}
            <Link to={`/${vendor.slug}/cart`} className="button button-secondary">
              Go to cart
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductDetailPage;
