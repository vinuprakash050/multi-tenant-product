import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import StatusBadge, { orderStatuses } from "../components/StatusBadge";
import { useAppContext } from "../context/AppContext";
import { findTrackableOrder } from "../services/storeService";

const statusDetails = {
  payment_pending: "We have received your order. The vendor is waiting to confirm payment.",
  payment_confirmed: "Payment has been confirmed and the order is ready for processing.",
  order_in_progress: "Your order is being packed and prepared by the vendor.",
  order_shipped: "Your order has left the shop and is on the way.",
  order_delivered: "This order has been marked as delivered.",
};

const formatOrderDate = (createdAt) => {
  const timestamp = createdAt?.seconds ? createdAt.seconds * 1000 : new Date(createdAt || "").getTime();

  if (!timestamp || Number.isNaN(timestamp)) {
    return "Date unavailable";
  }

  return new Date(timestamp).toLocaleString();
};

function TrackOrderPage() {
  const { vendor, vendorMode } = useAppContext();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({
    orderId: searchParams.get("orderId") || "",
    email: "",
    phone: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [order, setOrder] = useState(null);

  useEffect(() => {
    setForm((current) => ({
      ...current,
      orderId: searchParams.get("orderId") || "",
    }));
  }, [searchParams]);

  async function handleSubmit(event) {
    event.preventDefault();
    setIsLoading(true);
    setMessage("");
    setMessageType("info");

    try {
      const nextOrder = await findTrackableOrder({
        vendorSlug: vendor.slug,
        orderId: form.orderId,
        email: form.email,
        phone: form.phone,
      });

      setOrder(nextOrder);
      setMessage("Order found.");
      setMessageType("success");
    } catch (error) {
      setOrder(null);
      setMessage(error.message);
      setMessageType("error");
    } finally {
      setIsLoading(false);
    }
  }

  if (vendorMode === "booking") {
    return (
      <div className="panel empty-state">
        <p>Booking vendors use the My bookings page instead of the order tracker.</p>
        <Link to={`/${vendor.slug}/orders`} className="button">
          Open my bookings
        </Link>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <div className="page-nav-bar">
        <Link to={`/${vendor.slug}`} className="button button-secondary page-nav-button">
          Back to home
        </Link>
        <Link to={`/${vendor.slug}/orders`} className="button button-secondary page-nav-button">
          My orders
        </Link>
      </div>

      <section className="hero-panel">
        <div>
          <span className="eyebrow">Track order</span>
          <h1>Check your order status anytime.</h1>
          <p>Enter your order ID and the same phone number or email used during checkout.</p>
        </div>
        <div className="hero-card">
          <h2>{vendor.name}</h2>
          <p>Use this page after checkout to see the latest payment and delivery progress for your order.</p>
        </div>
      </section>

      <section className="panel">
        <div className="section-header">
          <div>
            <span className="eyebrow">Lookup</span>
            <h2>Find your order</h2>
          </div>
        </div>

        <form className="checkout-form track-form" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Order ID"
            value={form.orderId}
            onChange={(event) => setForm((current) => ({ ...current, orderId: event.target.value }))}
            required
          />
          <input
            type="email"
            placeholder="Email used at checkout"
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
          />
          <input
            type="tel"
            placeholder="Phone used at checkout"
            value={form.phone}
            onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
          />

          <button type="submit" className="button" disabled={isLoading}>
            {isLoading ? "Checking..." : "Track order"}
          </button>
        </form>

        {message ? (
          <p className={`info-message ${messageType === "error" ? "info-message-error" : ""}`}>{message}</p>
        ) : null}
      </section>

      {order ? (
        <section className="panel order-tracker-panel">
          <div className="order-card-top">
            <div>
              <span className="eyebrow">Order details</span>
              <h2>{order.id}</h2>
              <p>Placed on {formatOrderDate(order.createdAt)}</p>
            </div>
            <StatusBadge status={order.status} />
          </div>

          <div className="tracking-steps">
            {orderStatuses.map((status, index) => {
              const activeIndex = orderStatuses.indexOf(order.status);
              const isComplete = index <= activeIndex;

              return (
                <div key={status} className={`tracking-step ${isComplete ? "tracking-step-active" : ""}`}>
                  <div className="tracking-step-marker">{index + 1}</div>
                  <div>
                    <strong>{status.replaceAll("_", " ")}</strong>
                    <p>{statusDetails[status]}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="track-summary-grid">
            <div className="track-summary-card">
              <h3>Customer</h3>
              <p>{order.customer?.name || "Customer"}</p>
              <p>{order.customer?.phone}</p>
              <p>{order.customer?.email}</p>
            </div>
            <div className="track-summary-card">
              <h3>Delivery</h3>
              <p>{order.customer?.address || "Address unavailable"}</p>
              <p>Total: Rs. {order.totalAmount}</p>
            </div>
          </div>

          <div className="order-items">
            {order.cartItems?.map((item) => (
              <div key={`${order.id}-${item.id}`} className="order-item-row">
                <span>
                  {item.name} x {item.quantity}
                </span>
                <strong>Rs. {item.price * item.quantity}</strong>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

export default TrackOrderPage;
