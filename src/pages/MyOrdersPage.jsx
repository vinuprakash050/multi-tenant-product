import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import StatusBadge, { bookingStatuses, orderStatuses } from "../components/StatusBadge";
import { useAppContext } from "../context/AppContext";
import { findOrdersByContact } from "../services/storeService";

const statusDetails = {
  payment_pending: "We have received your order. The vendor is waiting to confirm payment.",
  payment_confirmed: "Payment has been confirmed and the order is ready for processing.",
  order_in_progress: "Your order is being packed and prepared by the vendor.",
  order_shipped: "Your order has left the shop and is on the way.",
  order_delivered: "This order has been marked as delivered.",
  booking_pending: "Your booking request has been received and is waiting for review.",
  booking_confirmed: "Your booking has been confirmed for the selected date and time.",
  already_booked: "That slot is no longer available and has been marked as already booked.",
};

function formatOrderDate(createdAt) {
  const timestamp = createdAt?.seconds ? createdAt.seconds * 1000 : new Date(createdAt || "").getTime();

  if (!timestamp || Number.isNaN(timestamp)) {
    return "Date unavailable";
  }

  return new Date(timestamp).toLocaleString();
}

function MyOrdersPage() {
  const { vendor, vendorMode } = useAppContext();
  const [orders, setOrders] = useState([]);
  const [lookupContact, setLookupContact] = useState("");
  const [lookupMessage, setLookupMessage] = useState("");
  const [lookupMessageType, setLookupMessageType] = useState("success");
  const [isSearching, setIsSearching] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState("");

  useEffect(() => {
    if (!orders.length) {
      setSelectedOrderId("");
      return;
    }

    if (!selectedOrderId || !orders.some((item) => item.id === selectedOrderId)) {
      setSelectedOrderId(orders[0].id);
    }
  }, [orders, selectedOrderId]);

  const selectedOrder = useMemo(
    () => orders.find((item) => item.id === selectedOrderId) || null,
    [orders, selectedOrderId],
  );
  const progressStatuses = vendorMode === "booking" ? bookingStatuses : orderStatuses;

  async function handleLookup(event) {
    event.preventDefault();
    setLookupMessage("");
    setLookupMessageType("success");
    setIsSearching(true);

    try {
      const foundOrders = await findOrdersByContact({
        vendorSlug: vendor.slug,
        email: lookupContact,
        phone: lookupContact,
      });

      setOrders(
        foundOrders.filter((item) => (vendorMode === "booking" ? item.orderType === "booking" || item.bookingDetails : true)),
      );
      setSelectedOrderId(foundOrders[0]?.id || "");
      setLookupMessage(
        `Found ${foundOrders.length} ${vendorMode === "booking" ? "booking" : "order"}${foundOrders.length > 1 ? "s" : ""}.`,
      );
    } catch (error) {
      setOrders([]);
      setSelectedOrderId("");
      setLookupMessage(error.message);
      setLookupMessageType("error");
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <div className="page-stack">
      <div className="page-nav-bar">
        <Link to={`/${vendor.slug}`} className="button button-secondary page-nav-button">
          Back to home
        </Link>
        {vendorMode === "commerce" ? (
          <Link to={`/${vendor.slug}/products`} className="button button-secondary page-nav-button">
            Browse products
          </Link>
        ) : null}
      </div>

      <section className="hero-panel">
        <div>
          <span className="eyebrow">{vendorMode === "booking" ? "My bookings" : "My orders"}</span>
          <h1>
            {vendorMode === "booking"
              ? "Find your bookings with phone or email."
              : "Find your orders with phone or email."}
          </h1>
          <p>
            {vendorMode === "booking"
              ? "Search your booking history any time using the same phone number or email used while requesting a slot."
              : "Search your order history any time using the same phone number or email used during checkout."}
          </p>
        </div>
        <div className="hero-card">
          <h2>{vendor.name}</h2>
          <p>
            {vendorMode === "booking"
              ? "Bookings are shown only after a fresh search by email or phone number."
              : "Orders are shown only after a fresh search by email or phone number."}
          </p>
        </div>
      </section>

      <section className="panel">
        <div className="section-header">
          <div>
            <span className="eyebrow">{vendorMode === "booking" ? "Find my bookings" : "Find my orders"}</span>
            <h2>{vendorMode === "booking" ? "Search by booking contact" : "Search by checkout contact"}</h2>
            <p>
              {vendorMode === "booking"
                ? "Enter the phone number or email used while making the booking request."
                : "Enter your phone number or email used during checkout."}
            </p>
          </div>
        </div>

        <form className="checkout-form" onSubmit={handleLookup}>
          <input
            type="text"
            placeholder="Enter phone number or email"
            value={lookupContact}
            onChange={(event) => setLookupContact(event.target.value)}
          />

          <button type="submit" className="button" disabled={isSearching}>
            {isSearching
              ? vendorMode === "booking"
                ? "Finding bookings..."
                : "Finding orders..."
              : vendorMode === "booking"
                ? "Find my bookings"
                : "Find my orders"}
          </button>
        </form>

        {lookupMessage ? (
          <p className={`info-message ${lookupMessageType === "error" ? "info-message-error" : ""}`}>{lookupMessage}</p>
        ) : null}
      </section>

      {selectedOrder ? (
        <section className="panel order-tracker-panel">
          <div className="order-tracker-top">
            <div>
              <span className="eyebrow">{vendorMode === "booking" ? "Booking status" : "Order status"}</span>
              <h2>{selectedOrder.id}</h2>
              <p>Placed on {formatOrderDate(selectedOrder.createdAt)}</p>
            </div>
            <StatusBadge status={selectedOrder.status} />
          </div>

          <div className="tracking-progress">
            {progressStatuses.map((status, index) => {
              const activeIndex = progressStatuses.indexOf(selectedOrder.status);
              const isComplete = index <= activeIndex;
              const isCurrent = index === activeIndex;

              return (
                <div key={status} className={`progress-step ${isComplete ? "progress-step-complete" : ""}`}>
                  <div className="progress-rail">
                    <div className={`progress-step-marker ${isCurrent ? "progress-step-marker-current" : ""}`}>
                      {index + 1}
                    </div>
                    {index < progressStatuses.length - 1 ? (
                      <div className={`progress-step-line ${index < activeIndex ? "progress-step-line-complete" : ""}`} />
                    ) : null}
                  </div>
                  <div className="progress-step-copy">
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
              <p>{selectedOrder.customer?.name || "Customer"}</p>
              <p>{selectedOrder.customer?.phone || "Phone unavailable"}</p>
              <p>{selectedOrder.customer?.email || "Email unavailable"}</p>
            </div>
            <div className="track-summary-card">
              <h3>{vendorMode === "booking" ? "Booking details" : "Delivery"}</h3>
              {vendorMode === "booking" ? (
                <>
                  <p>{selectedOrder.bookingDetails?.resourceName || "Resource unavailable"}</p>
                  <p>{selectedOrder.bookingDetails?.bookingDate || "Date unavailable"}</p>
                  <p>{selectedOrder.bookingDetails?.timeSlot || "Slot unavailable"}</p>
                  <p>{selectedOrder.bookingDetails?.location || "Location unavailable"}</p>
                </>
              ) : (
                <>
                  <p>{selectedOrder.customer?.address || "Address unavailable"}</p>
                  <p>Total: Rs. {selectedOrder.totalAmount}</p>
                </>
              )}
            </div>
          </div>

          {vendorMode === "booking" ? (
            <div className="compact-order-items">
              <p>
                <strong>Special note:</strong> {selectedOrder.bookingDetails?.note || "No special request added."}
              </p>
              <p>
                <strong>Amount:</strong> Rs. {selectedOrder.totalAmount}
              </p>
            </div>
          ) : (
            <div className="order-items compact-order-items">
              {selectedOrder.cartItems?.map((item) => (
                <div key={`${selectedOrder.id}-${item.id}`} className="order-item-row">
                  <span>
                    {item.name} x {item.quantity}
                  </span>
                  <strong>Rs. {item.price * item.quantity}</strong>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {!orders.length ? (
        <section className="panel empty-state">
          <p>
            {vendorMode === "booking"
              ? "No bookings loaded yet. Search with your phone number or email to fetch them."
              : "No orders loaded yet. Search with your phone number or email to fetch them."}
          </p>
          <Link to={vendorMode === "booking" ? `/${vendor.slug}` : `/${vendor.slug}/products`} className="button">
            {vendorMode === "booking" ? "View booking options" : "Start shopping"}
          </Link>
        </section>
      ) : (
        <section className="order-history-list">
          {orders.map((order) => (
            <article key={order.id} className="panel order-history-card">
              <div className="order-card-top compact-order-top">
                <div>
                  <span className="eyebrow">{vendorMode === "booking" ? "Booking ID" : "Order ID"}</span>
                  <h3>{order.id}</h3>
                  <p>{formatOrderDate(order.createdAt)}</p>
                </div>
                <StatusBadge status={order.status} />
              </div>

              <div className="compact-order-meta">
                <span>
                  {vendorMode === "booking"
                    ? `${order.bookingDetails?.bookingDate || "Date pending"} • ${order.bookingDetails?.timeSlot || "Slot pending"}`
                    : `Total: Rs. ${order.totalAmount}`}
                </span>
                <span>{order.customer?.phone || order.customer?.email || "Contact unavailable"}</span>
              </div>

              <div className="card-actions">
                <button type="button" className="button" onClick={() => setSelectedOrderId(order.id)}>
                  {selectedOrderId === order.id ? "Viewing status" : "View / Track"}
                </button>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}

export default MyOrdersPage;
