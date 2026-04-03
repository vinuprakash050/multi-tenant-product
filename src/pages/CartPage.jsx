import { useState } from "react";
import { Link } from "react-router-dom";
import { useAppContext } from "../context/AppContext";

const initialCustomer = {
  name: "",
  email: "",
  phone: "",
  address: "",
};

function CartPage() {
  const { vendor, vendorMode, cart, updateCartItem, placeOrder, isPlacingOrder } = useAppContext();
  const [customer, setCustomer] = useState(initialCustomer);
  const [message, setMessage] = useState("");
  const [placedOrder, setPlacedOrder] = useState(null);

  const vendorCart = cart.filter((item) => item.vendorSlug === vendor.slug);
  const totalAmount = vendorCart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  async function onSubmit(event) {
    event.preventDefault();

    if (!vendorCart.length) {
      setPlacedOrder(null);
      setMessage("Your cart is empty.");
      return;
    }

    try {
      const order = await placeOrder(customer);
      setCustomer(initialCustomer);
      setPlacedOrder(order);
      setMessage("Order placed successfully. You can track its status anytime.");
    } catch (error) {
      setPlacedOrder(null);
      setMessage(error.message);
    }
  }

  if (vendorMode === "booking") {
    return (
      <div className="panel empty-state">
        <p>This vendor uses booking requests instead of a shopping cart.</p>
        <Link to={`/${vendor.slug}`} className="button">
          Back to booking page
        </Link>
      </div>
    );
  }

  return (
    <div className="cart-layout">
      <section className="panel">
        <div className="section-header">
          <div>
            <span className="eyebrow">Cart</span>
            <h1>Your items</h1>
          </div>
        </div>

        {!vendorCart.length ? (
          <div className="empty-state">
            <p>No products in cart yet.</p>
            <Link to={`/${vendor.slug}/products`} className="button">
              Continue shopping
            </Link>
          </div>
        ) : (
          <div className="cart-list">
            {vendorCart.map((item) => (
              <article key={item.id} className="cart-item">
                <img src={item.image} alt={item.name} />
                <div>
                  <h3>{item.name}</h3>
                  <p>Rs. {item.price}</p>
                </div>
                <label className="quantity-box">
                  <span>Qty</span>
                  <input
                    type="number"
                    min="0"
                    value={item.quantity}
                    onChange={(event) => updateCartItem(item.id, Number(event.target.value))}
                  />
                </label>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <div className="section-header">
          <div>
            <span className="eyebrow">Checkout</span>
            <h2>Place order without payment</h2>
            <p>The admin will verify the payment manually and update the order status.</p>
          </div>
        </div>

        <p className="total-line">Total: Rs. {totalAmount}</p>

        <form className="checkout-form" onSubmit={onSubmit}>
          <input
            type="text"
            placeholder="Full name"
            value={customer.name}
            onChange={(event) => setCustomer((current) => ({ ...current, name: event.target.value }))}
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={customer.email}
            onChange={(event) => setCustomer((current) => ({ ...current, email: event.target.value }))}
            required
          />
          <input
            type="tel"
            placeholder="Phone"
            value={customer.phone}
            onChange={(event) => setCustomer((current) => ({ ...current, phone: event.target.value }))}
            required
          />
          <textarea
            placeholder="Delivery address"
            rows="4"
            value={customer.address}
            onChange={(event) => setCustomer((current) => ({ ...current, address: event.target.value }))}
            required
          />

          <button type="submit" className="button" disabled={isPlacingOrder}>
            {isPlacingOrder ? "Placing order..." : "Place order"}
          </button>
        </form>

        {message ? <p className="info-message">{message}</p> : null}
        {placedOrder ? (
          <div className="order-success-card">
            <strong>Order ID: {placedOrder.id}</strong>
            <p>Your order is saved. Use your phone number or email in My Orders to check the latest status later.</p>
            <div className="card-actions">
              <Link to={`/${vendor.slug}/orders`} className="button button-secondary">
                View my orders
              </Link>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

export default CartPage;
