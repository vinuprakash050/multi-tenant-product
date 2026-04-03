import { Link, useNavigate, useParams } from "react-router-dom";
import { useAppContext } from "../context/AppContext";

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
        <img src={product.image} alt={product.name} className="detail-image" />

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
