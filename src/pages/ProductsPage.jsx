import { Link } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import { useAppContext } from "../context/AppContext";

function ProductsPage() {
  const { products, bookingResources, isLoadingProducts, isLoadingBookingResources, vendor, vendorMode } =
    useAppContext();

  if (vendorMode === "booking") {
    return (
      <div className="page-stack">
        <div className="page-nav-bar">
          <Link to={`/${vendor.slug}`} className="button button-secondary page-nav-button">
            Back to home
          </Link>
        </div>

        <section className="section-header">
          <div>
            <span className="eyebrow">Facilities</span>
            <h1>{vendor.name} {vendor.bookingResourceLabel || "Spaces"}</h1>
            <p>Browse all bookable spaces and the slot timings configured for this vendor.</p>
          </div>
        </section>

        {isLoadingBookingResources ? (
          <div className="panel">Loading facilities...</div>
        ) : !bookingResources.length ? (
          <div className="panel">No facilities available yet. Add them from the admin page.</div>
        ) : (
          <section className="booking-grid">
            {bookingResources.map((resource) => (
              <article key={resource.id} className="panel booking-card">
                <div className="booking-card-top">
                  <div>
                    <span className="eyebrow">{resource.category || vendor.shopCategory || "Booking"}</span>
                    <h3>{resource.name}</h3>
                  </div>
                  <strong>Rs. {resource.price || 0}</strong>
                </div>
                <p>{resource.description}</p>
                <div className="booking-meta-list">
                  <span>{resource.location || "Location coming soon"}</span>
                  <span>{resource.slotDuration || 60} mins / slot</span>
                </div>
                <div className="slot-chip-list">
                  {(resource.availableSlots || []).map((slot) => (
                    <span key={`${resource.id}-${slot}`} className="slot-chip">
                      {slot}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    );
  }

  return (
    <div className="page-stack">
      <div className="page-nav-bar">
        <Link to={`/${vendor.slug}`} className="button button-secondary page-nav-button">
          Back to home
        </Link>
      </div>

      <section className="section-header">
        <div>
          <span className="eyebrow">Catalog</span>
          <h1>{vendor.name} Products</h1>
          <p>Browse the full product catalog for this vendor storefront.</p>
        </div>
      </section>

      {isLoadingProducts ? (
        <div className="panel">Loading products...</div>
      ) : !products.length ? (
        <div className="panel">No products available for this vendor yet. Add them from the admin page.</div>
      ) : (
        <section className="product-grid">
          {products.map((product) => (
            <ProductCard key={product.sku || product.id} product={product} />
          ))}
        </section>
      )}
    </div>
  );
}

export default ProductsPage;
