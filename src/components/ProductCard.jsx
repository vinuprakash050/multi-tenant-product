import { Link } from "react-router-dom";
import { useAppContext } from "../context/AppContext";

function ProductCard({ product }) {
  const { vendor, addToCart } = useAppContext();

  return (
    <article className="product-card">
      <div className="product-image-wrap">
        <img src={product.image} alt={product.name} className="product-image" />
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
          <button type="button" className="button" onClick={() => addToCart(product)}>
            Add to cart
          </button>
        </div>
      </div>
    </article>
  );
}

export default ProductCard;
