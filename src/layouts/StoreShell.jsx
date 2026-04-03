import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import NotFoundPage from "../pages/NotFoundPage";
import { DEFAULT_VENDOR_THEME } from "../data/vendors";

function StoreShell() {
  const { vendor, vendorMode, cart, isLoadingVendor, firebaseMessage } = useAppContext();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const vendorSlug = vendor?.slug || location.pathname.split("/")[1] || "";
  const isAdminRoute = location.pathname === `/${vendorSlug}/admin`;

  const vendorCartCount = cart
    .filter((item) => item.vendorSlug === vendorSlug)
    .reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  if (isLoadingVendor) {
    return (
      <div className="page-wrap not-found">
        <div className="panel">
          <h1>Loading vendor...</h1>
        </div>
      </div>
    );
  }

  if (!vendor) {
    return <NotFoundPage />;
  }

  return (
    <div
      className="app-shell"
      style={{
        "--vendor-accent": vendor.accent || DEFAULT_VENDOR_THEME.accent,
        "--vendor-surface": vendor.surface || DEFAULT_VENDOR_THEME.surface,
      }}
    >
      <header className="topbar">
        <div className="brand-block">
          {vendor.logo ? (
            <NavLink to={`/${vendor.slug}`} className="brand-logo-link">
              <img src={vendor.logo} alt={`${vendor.name} logo`} className="brand-logo" />
            </NavLink>
          ) : null}
          <div>
          <NavLink to={`/${vendor.slug}`} className="brand-link">
            {vendor.name}
          </NavLink>
          <p>{vendor.tagline}</p>
          </div>
        </div>

        {!isAdminRoute ? (
          <div className="topbar-actions">
            <button
              type="button"
              className="mobile-menu-toggle"
              onClick={() => setIsMobileMenuOpen((current) => !current)}
              aria-expanded={isMobileMenuOpen}
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            >
              <span />
              <span />
              <span />
            </button>
            <nav className="navbar">
              <NavLink to={`/${vendor.slug}`} end>
                Home
              </NavLink>
              <NavLink to={`/${vendor.slug}/products`}>{vendorMode === "booking" ? "Facilities" : "Products"}</NavLink>
              <NavLink to={`/${vendor.slug}/orders`}>{vendorMode === "booking" ? "My bookings" : "My orders"}</NavLink>
              {vendorMode === "commerce" ? (
                <NavLink to={`/${vendor.slug}/cart`}>Cart ({vendorCartCount})</NavLink>
              ) : null}
            </nav>
          </div>
        ) : null}
      </header>

      {!isAdminRoute ? (
        <>
          <div
            className={`mobile-menu-backdrop ${isMobileMenuOpen ? "mobile-menu-backdrop-open" : ""}`}
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <aside className={`mobile-menu-panel ${isMobileMenuOpen ? "mobile-menu-panel-open" : ""}`}>
            <div className="mobile-menu-header">
              <div>
                <span className="brand-kicker">Menu</span>
                {vendor.logo ? <img src={vendor.logo} alt={`${vendor.name} logo`} className="mobile-menu-logo" /> : null}
                <strong>{vendor.name}</strong>
              </div>
              <button
                type="button"
                className="mobile-menu-close"
                onClick={() => setIsMobileMenuOpen(false)}
                aria-label="Close menu"
              >
                ×
              </button>
            </div>
            <nav className="mobile-menu-nav">
              <NavLink to={`/${vendor.slug}`} end>
                Home
              </NavLink>
              <NavLink to={`/${vendor.slug}/products`}>{vendorMode === "booking" ? "Facilities" : "Products"}</NavLink>
              <NavLink to={`/${vendor.slug}/orders`}>{vendorMode === "booking" ? "My bookings" : "My orders"}</NavLink>
              {vendorMode === "commerce" ? <NavLink to={`/${vendor.slug}/cart`}>Cart ({vendorCartCount})</NavLink> : null}
            </nav>
          </aside>
        </>
      ) : null}

      <main className="page-wrap">
        {firebaseMessage ? <div className="panel info-strip">{firebaseMessage}</div> : null}
        <Outlet />
      </main>
    </div>
  );
}

export default StoreShell;
