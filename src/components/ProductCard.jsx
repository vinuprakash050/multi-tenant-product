import { Link } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import ProductImageGallery from "./ProductImageGallery";

function ProductCard({ product }) {
  const { vendor, cart, addToCart, updateCartItem } = useAppContext();

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

  return (
    <article className="product-card">
      <div className="product-image-wrap">
        <ProductImageGallery product={product} alt={product.name} />
        <span className="product-badge">{product.heroLabel}</span>
      </div>

      <div className="product-content">
        <div className="product-meta">
          <span>{product.category}</span>
          <strong>Rs. {product.price}</strong>
        </div>

        <h3>{product.name}</h3>
        <p>{product.description}</p>

        <div className="card-actions">
          <Link to={`/${vendor.slug}/products/${product.id}`} className="button button-secondary">
            View details
          </Link>
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
        </div>
      </div>
    </article>
  );
}

export default ProductCard;
