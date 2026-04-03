import { NavLink } from 'react-router-dom';
import { useStore } from '../store/StoreContext';

function Navbar() {
  const { cart, selectedVendor, setSelectedVendor, vendors } = useStore();
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <header className="navbar">
      <div className="brand-block">
        <p className="eyebrow">Modular Commerce</p>
        <NavLink to="/" className="brand-link">
          VendorFlex Store
        </NavLink>
      </div>

      <nav className="nav-links">
        <NavLink to="/">Home</NavLink>
        <NavLink to="/products">Products</NavLink>
        <NavLink to="/cart">Cart ({cartCount})</NavLink>
        <NavLink to="/admin">Admin</NavLink>
      </nav>

      <label className="vendor-switcher">
        <span>Vendor</span>
        <select value={selectedVendor} onChange={(event) => setSelectedVendor(event.target.value)}>
          {vendors.map((vendor) => (
            <option key={vendor.id} value={vendor.id}>
              {vendor.name}
            </option>
          ))}
        </select>
      </label>
    </header>
  );
}

export default Navbar;
