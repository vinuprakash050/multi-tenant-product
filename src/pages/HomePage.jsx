import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import { useAppContext } from "../context/AppContext";

const initialBookingCustomer = {
  name: "",
  email: "",
  phone: "",
  note: "",
};

function bookingBlocksSlot(status) {
  return ["booking_pending", "booking_confirmed", "already_booked"].includes(status);
}

function createDateSlotKey(date, slot) {
  return `${date}::${slot}`;
}

function HomePage() {
  const {
    vendor,
    vendorMode,
    products,
    bookingResources,
    orders,
    isLoadingProducts,
    isLoadingBookingResources,
    isPlacingOrder,
    placeBookingRequest,
  } = useAppContext();
  const [selectedResourceId, setSelectedResourceId] = useState("");
  const [bookingDate, setBookingDate] = useState("");
  const [selectedTimeSlot, setSelectedTimeSlot] = useState("");
  const [customer, setCustomer] = useState(initialBookingCustomer);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");
  const bookingFormRef = useRef(null);

  const selectedResource =
    bookingResources.find((item) => item.id === selectedResourceId) || bookingResources[0] || null;

  const bookedSlotKeys = useMemo(
    () =>
      new Set(
        orders
          .filter((item) => item.orderType === "booking" && bookingBlocksSlot(item.status))
          .map((item) =>
            [
              item.bookingDetails?.resourceId,
              item.bookingDetails?.bookingDate,
              item.bookingDetails?.timeSlot,
            ].join("::"),
          ),
      ),
    [orders],
  );

  const selectableSlots = useMemo(() => {
    if (!selectedResource || !bookingDate) {
      return [];
    }

    const blockedDateSlots = new Set(selectedResource.blockedDateSlots || []);

    return (selectedResource.availableSlots || []).filter((slot) => {
      if (blockedDateSlots.has(createDateSlotKey(bookingDate, slot))) {
        return false;
      }

      if (bookedSlotKeys.has([selectedResource.id, bookingDate, slot].join("::"))) {
        return false;
      }

      return true;
    });
  }, [selectedResource, bookingDate, bookedSlotKeys]);

  useEffect(() => {
    if (selectedTimeSlot && !selectableSlots.includes(selectedTimeSlot)) {
      setSelectedTimeSlot("");
    }
  }, [selectableSlots, selectedTimeSlot]);

  async function handleBookingSubmit(event) {
    event.preventDefault();
    setMessage("");
    setMessageType("success");

    if (!selectedResource) {
      setMessage(`Add a ${vendor.bookingResourceLabel || "resource"} from the admin panel first.`);
      setMessageType("error");
      return;
    }

    if (!bookingDate || !selectedTimeSlot) {
      setMessage("Choose a booking date and time slot.");
      setMessageType("error");
      return;
    }

    const slotKey = [selectedResource.id, bookingDate, selectedTimeSlot].join("::");
    const dateBlockedKey = createDateSlotKey(bookingDate, selectedTimeSlot);

    if (bookedSlotKeys.has(slotKey) || (selectedResource.blockedDateSlots || []).includes(dateBlockedKey)) {
      setMessage("That slot is already blocked for the selected day. Please choose a different time.");
      setMessageType("error");
      return;
    }

    try {
      const booking = await placeBookingRequest(
        {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          address: customer.note,
        },
        {
          resourceId: selectedResource.id,
          resourceName: selectedResource.name,
          category: selectedResource.category,
          bookingDate,
          timeSlot: selectedTimeSlot,
          price: Number(selectedResource.price || 0),
          durationMinutes: Number(selectedResource.slotDuration || 60),
          location: selectedResource.location || "",
          note: customer.note,
        },
      );

      setCustomer(initialBookingCustomer);
      setSelectedTimeSlot("");
      setMessage(`Booking request sent successfully. Reference ID: ${booking.id}`);
    } catch (error) {
      setMessage(error.message);
      setMessageType("error");
    }
  }

  function jumpToBooking(resourceId) {
    setSelectedResourceId(resourceId);
    setMessage("");
    bookingFormRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  if (vendorMode === "booking") {
    return (
      <div className="page-stack">
        <section className="hero-panel">
          <div>
            <span className="eyebrow">{vendor.shopCategory || "Booking"}</span>
            <h1>{vendor.tagline}</h1>
            <p>
              {vendor.heroDescription ||
                "Browse the available spaces, compare time slots, and submit your booking request online."}
            </p>
            <div className="hero-actions">
              <Link to={`/${vendor.slug}/products`} className="button">
                View all {vendor.bookingResourceLabel || "spaces"}
              </Link>
            </div>
          </div>

          <div className="hero-card">
            <h2>{vendor.name}</h2>
            <p>{vendor.overview || "Booking details and availability are managed directly from the admin dashboard."}</p>
            <ul className="feature-list">
              {(vendor.highlights || []).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="section-header">
          <div>
            <span className="eyebrow">Availability</span>
            <h2>{vendor.featuredHeading || `Book a ${vendor.bookingResourceLabel || "slot"} at ${vendor.name}`}</h2>
            <p>Each listing can have its own timings, price, location, and slot duration.</p>
          </div>
        </section>

        {isLoadingBookingResources ? (
          <div className="panel">Loading facilities...</div>
        ) : !bookingResources.length ? (
          <div className="panel">No booking spaces have been added yet. Create them from the vendor admin page.</div>
        ) : (
          <section className="booking-grid">
            {bookingResources.map((resource) => (
              <article
                key={resource.id}
                className={`panel booking-card ${selectedResource?.id === resource.id ? "booking-card-selected" : ""}`}
              >
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
                <div className="card-actions">
                  <button
                    type="button"
                    className="button"
                    onClick={() => jumpToBooking(resource.id)}
                  >
                    {vendor.bookingLabel || "Book now"}
                  </button>
                </div>
              </article>
            ))}
          </section>
        )}

        <section ref={bookingFormRef} className="panel">
          <div className="section-header">
            <div>
              <span className="eyebrow">Booking request</span>
              <h2>{vendor.bookingLabel || "Reserve your slot"}</h2>
              <p>
                {selectedResource
                  ? `Now booking: ${selectedResource.name}. Choose a date and slot below.`
                  : "Submit a request and the admin can keep it pending, accept it, or mark it as already booked."}
              </p>
            </div>
          </div>

          <form className="checkout-form booking-form-grid" onSubmit={handleBookingSubmit}>
            <select
              value={selectedResource?.id || ""}
              onChange={(event) => setSelectedResourceId(event.target.value)}
              required
            >
              <option value="">Choose {vendor.bookingResourceLabel || "resource"}</option>
              {bookingResources.map((resource) => (
                <option key={resource.id} value={resource.id}>
                  {resource.name}
                </option>
              ))}
            </select>
            <input type="date" value={bookingDate} onChange={(event) => setBookingDate(event.target.value)} required />
            <select value={selectedTimeSlot} onChange={(event) => setSelectedTimeSlot(event.target.value)} required>
              <option value="">Choose time slot</option>
              {selectableSlots.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
            </select>
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
              rows="4"
              placeholder="Special request or note"
              value={customer.note}
              onChange={(event) => setCustomer((current) => ({ ...current, note: event.target.value }))}
            />

            <button type="submit" className="button" disabled={isPlacingOrder}>
              {isPlacingOrder ? "Sending request..." : vendor.bookingLabel || "Book now"}
            </button>
          </form>

          {message ? <p className={`info-message ${messageType === "error" ? "info-message-error" : ""}`}>{message}</p> : null}
        </section>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div>
          <span className="eyebrow">{vendor.name}</span>
          <h1>{vendor.tagline}</h1>
          <p>{vendor.heroDescription || "Discover this vendor's catalog and place your order directly from the storefront."}</p>
          <div className="hero-actions">
            <Link to={`/${vendor.slug}/products`} className="button">
              Explore products
            </Link>
          </div>
        </div>

        <div className="hero-card">
          <h2>{vendor.name}</h2>
          <p>{vendor.overview || "Vendor details are managed from Firebase and shown here automatically."}</p>
          <ul className="feature-list">
            {(vendor.highlights || []).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section-header">
        <div>
          <span className="eyebrow">Featured products</span>
          <h2>{vendor.featuredHeading || `Featured products from ${vendor.name}.`}</h2>
        </div>
        <Link to={`/${vendor.slug}/products`} className="button button-secondary">
          View all
        </Link>
      </section>

      {isLoadingProducts ? (
        <div className="panel">Loading products...</div>
      ) : !products.length ? (
        <div className="panel">No products have been added for this vendor yet.</div>
      ) : (
        <section className="product-grid">
          {products.slice(0, 3).map((product) => (
            <ProductCard key={product.sku || product.id} product={product} />
          ))}
        </section>
      )}
    </div>
  );
}

export default HomePage;
