import { useState } from "react";
import { Link } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { getPrimaryProductImageUrl, getProductImageUrls } from "../lib/productImages";
import {
  getEffectiveRazorpayKeyId,
  isRazorpayTestCheckoutAvailable,
  loadRazorpayScript,
  openRazorpayTestCheckout,
} from "../lib/razorpay";

const initialCustomer = {
  name: "",
  email: "",
  phone: "",
  address: "",
};

function CartPage() {
  const { vendor, vendorMode, cart, updateCartItem, placeOrder, isPlacingOrder, updateOrderStatus } = useAppContext();
  const [customer, setCustomer] = useState(initialCustomer);
  const [message, setMessage] = useState("");
  const [placedOrder, setPlacedOrder] = useState(null);
  const [isPaying, setIsPaying] = useState(false);
  const [payMessage, setPayMessage] = useState("");

  const razorpayAvailable = isRazorpayTestCheckoutAvailable(vendor);

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
      setPayMessage("");
      setMessage("Order placed successfully. You can track its status anytime.");
    } catch (error) {
      setPlacedOrder(null);
      setMessage(error.message);
    }
  }

  async function handleRazorpayTestPay() {
    if (!placedOrder?.id) {
      return;
    }

    const keyId = getEffectiveRazorpayKeyId(vendor);
    if (!keyId) {
      setPayMessage("Add a Razorpay Key ID on the vendor or set VITE_RAZORPAY_KEY_ID in .env.");
      return;
    }

    setPayMessage("");
    setIsPaying(true);

    try {
      await loadRazorpayScript();
      const cust = placedOrder.customer || {};
      const response = await openRazorpayTestCheckout({
        keyId,
        amountRupees: placedOrder.totalAmount,
        vendorName: vendor.name,
        orderId: placedOrder.id,
        customerName: cust.name,
        customerEmail: cust.email,
        customerPhone: cust.phone,
      });

      if (!response) {
        setPayMessage("Payment window closed. Your order is still saved as payment pending.");
        return;
      }

      await updateOrderStatus(placedOrder.id, "payment_confirmed");
      setPayMessage(
        `Test payment received (id: ${response.razorpay_payment_id || "n/a"}). Order marked payment confirmed (dev only—verify on server for live).`,
      );
    } catch (error) {
      setPayMessage(error.message || "Razorpay could not complete.");
    } finally {
      setIsPaying(false);
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
            {vendorCart.map((item) => {
              const photoCount = getProductImageUrls(item).length;
              return (
              <article key={item.id} className="cart-item">
                <div className="cart-item-image-wrap">
                  <img src={getPrimaryProductImageUrl(item)} alt={item.name} className="cart-item-image" />
                  {photoCount > 1 ? <span className="cart-item-photo-count">{photoCount} photos</span> : null}
                </div>
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
            );
            })}
          </div>
        )}
      </section>

      <section className="panel">
        <div className="section-header">
          <div>
            <span className="eyebrow">Checkout</span>
            <h2>{razorpayAvailable ? "Place order, then pay (Razorpay test)" : "Place order"}</h2>
            <p>
              {razorpayAvailable
                ? "This vendor has Razorpay test checkout enabled. Place the order first, then use Pay with Razorpay (test) to simulate payment."
                : "The admin can verify payment manually and update the order status."}
            </p>
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
            {razorpayAvailable ? (
              <div className="razorpay-test-panel">
                <p className="razorpay-test-note">
                  Dev/test: uses Razorpay Checkout with your test Key ID. Updating status from the browser is not safe for
                  production—add a backend before going live.
                </p>
                <button type="button" className="button" onClick={handleRazorpayTestPay} disabled={isPaying}>
                  {isPaying ? "Opening Razorpay…" : `Pay Rs. ${placedOrder.totalAmount} with Razorpay (test)`}
                </button>
                {payMessage ? (
                  <p
                    className={`info-message ${
                      payMessage.startsWith("Test payment") || payMessage.includes("Payment window closed")
                        ? ""
                        : "info-message-error"
                    }`}
                  >
                    {payMessage}
                  </p>
                ) : null}
              </div>
            ) : null}
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
