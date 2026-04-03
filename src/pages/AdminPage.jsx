import { useEffect, useMemo, useRef, useState } from "react";
import StatusBadge, { bookingStatuses, orderStatuses } from "../components/StatusBadge";
import { useAppContext } from "../context/AppContext";
import { updateProduct } from "../services/storeService";

const MAX_IMAGE_SIZE_BYTES = 350 * 1024;
const ADMIN_SESSION_PREFIX = "mv_admin_auth";

const initialProduct = {
  name: "",
  category: "",
  price: "",
  description: "",
  features: "",
  heroLabel: "",
};

const initialBookingResource = {
  name: "",
  category: "",
  price: "",
  location: "",
  slotDuration: "60",
  availableSlots: "",
  blockedDateSlots: [],
  description: "",
  amenities: "",
  displayOrder: "0",
};

const initialSlotBuilder = {
  startTime: "06:00",
  endTime: "22:00",
  interval: "60",
  customSlot: "",
};

function splitLines(value) {
  return String(value || "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function writeLines(items) {
  return items.join("\n");
}

function timeToMinutes(value) {
  const [hours, minutes] = String(value || "")
    .split(":")
    .map((item) => Number(item));

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
}

function minutesToTime(value) {
  const hours = Math.floor(value / 60)
    .toString()
    .padStart(2, "0");
  const minutes = (value % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

function createSlotLabel(startMinutes, durationMinutes) {
  return `${minutesToTime(startMinutes)}-${minutesToTime(startMinutes + durationMinutes)}`;
}

function generateTimeSlots(startTime, endTime, interval) {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  const durationMinutes = Number(interval);

  if (!startMinutes && startMinutes !== 0) {
    return [];
  }

  if (!endMinutes && endMinutes !== 0) {
    return [];
  }

  if (!durationMinutes || durationMinutes <= 0 || startMinutes >= endMinutes) {
    return [];
  }

  const slots = [];

  for (let current = startMinutes; current + durationMinutes <= endMinutes; current += durationMinutes) {
    slots.push(createSlotLabel(current, durationMinutes));
  }

  return slots;
}

function createDateSlotKey(date, slot) {
  return `${date}::${slot}`;
}

function getTodayDateValue() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeSearchableBookingText(order) {
  return [
    order.id,
    order.customer?.name,
    order.customer?.email,
    order.customer?.phone,
    order.bookingDetails?.resourceName,
    order.bookingDetails?.bookingDate,
    order.bookingDetails?.timeSlot,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function bookingBlocksSlot(status) {
  return ["booking_pending", "booking_confirmed", "already_booked"].includes(status);
}

function normalizeAdminPhone(value) {
  return String(value || "").replace(/\s+/g, "").trim();
}

function AdminPage() {
  const {
    orders,
    vendor,
    vendorMode,
    products,
    bookingResources,
    addProductForVendor,
    addBookingResourceForVendor,
    updateBookingResourceForVendor,
    updateOrderStatus,
  } = useAppContext();
  const [activeTab, setActiveTab] = useState(vendorMode === "booking" ? "bookings" : "orders");
  const [productForm, setProductForm] = useState(initialProduct);
  const [resourceForm, setResourceForm] = useState(initialBookingResource);
  const [editingProductId, setEditingProductId] = useState("");
  const [editingResourceId, setEditingResourceId] = useState("");
  const [productImageFile, setProductImageFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");
  const [orderFilter, setOrderFilter] = useState("all");
  const [orderSearch, setOrderSearch] = useState("");
  const [expandedOrderId, setExpandedOrderId] = useState("");
  const [slotBuilder, setSlotBuilder] = useState(initialSlotBuilder);
  const [resourceDateSelections, setResourceDateSelections] = useState({});
  const [loginForm, setLoginForm] = useState({ phone: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!vendor?.slug) {
      return;
    }

    const isLoggedIn = window.sessionStorage.getItem(`${ADMIN_SESSION_PREFIX}:${vendor.slug}`) === "true";
    setIsAuthenticated(isLoggedIn);
  }, [vendor?.slug]);

  useEffect(() => {
    setActiveTab(vendorMode === "booking" ? "bookings" : "orders");
  }, [vendorMode]);

  const activeStatuses = vendorMode === "booking" ? bookingStatuses : orderStatuses;
  const orderFilterOptions = ["all", ...activeStatuses];
  const visibleOrders = useMemo(
    () => orders.filter((order) => (vendorMode === "booking" ? order.orderType === "booking" : order.orderType !== "booking")),
    [orders, vendorMode],
  );

  const orderCounts = useMemo(
    () =>
      orderFilterOptions.reduce(
        (summary, status) => ({
          ...summary,
          [status]:
            status === "all" ? visibleOrders.length : visibleOrders.filter((order) => order.status === status).length,
        }),
        {},
      ),
    [orderFilterOptions, visibleOrders],
  );

  const filteredOrders = useMemo(() => {
    const normalizedSearch = orderSearch.trim().toLowerCase();

    return visibleOrders.filter((order) => {
      const matchesFilter = orderFilter === "all" || order.status === orderFilter;

      if (!matchesFilter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const searchableText =
        vendorMode === "booking"
          ? normalizeSearchableBookingText(order)
          : [
              order.id,
              order.customer?.name,
              order.customer?.email,
              order.customer?.phone,
              order.customer?.address,
              ...(order.cartItems?.map((item) => item.name) || []),
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();

      return searchableText.includes(normalizedSearch);
    });
  }, [orderFilter, orderSearch, vendorMode, visibleOrders]);

  const bookedDateSlotKeys = useMemo(
    () =>
      new Set(
        orders
          .filter((order) => order.orderType === "booking" && bookingBlocksSlot(order.status))
          .map(
            (order) =>
              `${order.bookingDetails?.resourceId || ""}::${createDateSlotKey(
                order.bookingDetails?.bookingDate,
                order.bookingDetails?.timeSlot,
              )}`,
          ),
      ),
    [orders],
  );

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      if (!file) {
        reject(new Error("Please choose an image to upload."));
        return;
      }

      if (!file.type.startsWith("image/")) {
        reject(new Error("Please choose a valid image file."));
        return;
      }

      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        reject(new Error("Image is too large. Please use an image smaller than 350 KB."));
        return;
      }

      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Could not read the selected image."));
      reader.readAsDataURL(file);
    });
  }

  async function handleCreateProduct(event) {
    event.preventDefault();
    setMessage("");
    setMessageType("success");
    setIsSubmitting(true);

    try {
      let image;

      if (productImageFile) {
        image = await fileToDataUrl(productImageFile);
      }

      const payload = {
        name: productForm.name,
        category: productForm.category,
        price: Number(productForm.price),
        ...(image ? { image } : {}),
        description: productForm.description,
        heroLabel: productForm.heroLabel || "New arrival",
        features: productForm.features
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean),
      };

      if (editingProductId) {
        await updateProduct(editingProductId, payload);
      } else {
        if (!image) {
          throw new Error("Please choose an image to upload.");
        }

        await addProductForVendor(payload);
      }

      setProductForm(initialProduct);
      setEditingProductId("");
      setProductImageFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setMessage(editingProductId ? "Product updated successfully." : "Product added successfully.");
    } catch (error) {
      setMessage(error.message);
      setMessageType("error");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSaveBookingResource(event) {
    event.preventDefault();
    setMessage("");
    setMessageType("success");
    setIsSubmitting(true);

    const availableSlots = splitLines(resourceForm.availableSlots);

    if (!availableSlots.length) {
      setMessage("Create at least one slot before saving this resource.");
      setMessageType("error");
      setIsSubmitting(false);
      return;
    }

    const payload = {
      name: resourceForm.name,
      category: resourceForm.category,
      price: Number(resourceForm.price || 0),
      location: resourceForm.location,
      slotDuration: Number(resourceForm.slotDuration || 60),
      description: resourceForm.description,
      amenities: resourceForm.amenities
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
      availableSlots,
      blockedDateSlots: editingResourceId ? resourceForm.blockedDateSlots || [] : [],
      displayOrder: Number(resourceForm.displayOrder || 0),
    };

    try {
      if (editingResourceId) {
        await updateBookingResourceForVendor(editingResourceId, payload);
        setMessage(`${vendor.bookingResourceLabel || "Resource"} updated successfully.`);
      } else {
        await addBookingResourceForVendor(payload);
        setMessage(`${vendor.bookingResourceLabel || "Resource"} added successfully.`);
      }

      setResourceForm(initialBookingResource);
      setEditingResourceId("");
      setSlotBuilder(initialSlotBuilder);
    } catch (error) {
      setMessage(error.message);
      setMessageType("error");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleImageChange(event) {
    const nextFile = event.target.files?.[0] || null;
    setMessage("");
    setMessageType("success");

    if (!nextFile) {
      setProductImageFile(null);
      return;
    }

    if (!nextFile.type.startsWith("image/")) {
      setProductImageFile(null);
      event.target.value = "";
      setMessage("Please choose a valid image file.");
      setMessageType("error");
      return;
    }

    if (nextFile.size > MAX_IMAGE_SIZE_BYTES) {
      setProductImageFile(null);
      event.target.value = "";
      setMessage("Image is too large. Please use an image smaller than 350 KB.");
      setMessageType("error");
      return;
    }

    setProductImageFile(nextFile);
  }

  function startEditingProduct(product) {
    setActiveTab("products");
    setEditingProductId(product.id);
    setProductForm({
      name: product.name || "",
      category: product.category || "",
      price: String(product.price ?? ""),
      description: product.description || "",
      features: Array.isArray(product.features) ? product.features.join("\n") : "",
      heroLabel: product.heroLabel || "",
    });
    setProductImageFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setMessage("");
    setMessageType("success");
  }

  function startEditingResource(resource) {
    setActiveTab("resources");
    setEditingResourceId(resource.id);
    setResourceForm({
      name: resource.name || "",
      category: resource.category || "",
      price: String(resource.price ?? ""),
      location: resource.location || "",
      slotDuration: String(resource.slotDuration ?? 60),
      availableSlots: Array.isArray(resource.availableSlots) ? resource.availableSlots.join("\n") : "",
      blockedDateSlots: Array.isArray(resource.blockedDateSlots) ? resource.blockedDateSlots : [],
      description: resource.description || "",
      amenities: Array.isArray(resource.amenities) ? resource.amenities.join("\n") : "",
      displayOrder: String(resource.displayOrder ?? 0),
    });
    setSlotBuilder((current) => ({
      ...current,
      interval: String(resource.slotDuration ?? 60),
    }));
    setMessage("");
    setMessageType("success");
  }

  function resetProductForm() {
    setProductForm(initialProduct);
    setEditingProductId("");
    setProductImageFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setMessage("");
    setMessageType("success");
  }

  function resetResourceForm() {
    setResourceForm(initialBookingResource);
    setEditingResourceId("");
    setSlotBuilder(initialSlotBuilder);
    setMessage("");
    setMessageType("success");
  }

  const availableSlotList = useMemo(() => splitLines(resourceForm.availableSlots), [resourceForm.availableSlots]);

  function setAvailableSlots(nextSlots) {
    const uniqueSlots = [...new Set(nextSlots)];
    setResourceForm((current) => {
      const nextBlockedDateSlots = (current.blockedDateSlots || []).filter((item) => {
        const [, slot] = String(item).split("::");
        return uniqueSlots.includes(slot);
      });
      return {
        ...current,
        availableSlots: writeLines(uniqueSlots),
        blockedDateSlots: nextBlockedDateSlots,
      };
    });
  }

  function removeSlot(slot) {
    setAvailableSlots(availableSlotList.filter((item) => item !== slot));
  }

  function generateSlotsFromBuilder() {
    const nextSlots = generateTimeSlots(slotBuilder.startTime, slotBuilder.endTime, slotBuilder.interval);

    if (!nextSlots.length) {
      setMessage("Choose a valid start time, end time, and interval to generate slots.");
      setMessageType("error");
      return;
    }

    setAvailableSlots(nextSlots);
    setMessage("Slots generated. Click a slot to block or unblock it.");
    setMessageType("success");
  }

  function addCustomSlot() {
    const nextSlot = slotBuilder.customSlot.trim();

    if (!nextSlot) {
      return;
    }

    setAvailableSlots([...availableSlotList, nextSlot]);
    setSlotBuilder((current) => ({ ...current, customSlot: "" }));
  }

  function getSelectedDateForResource(resourceId) {
    return resourceDateSelections[resourceId] || getTodayDateValue();
  }

  function setSelectedDateForResource(resourceId, value) {
    setResourceDateSelections((current) => ({
      ...current,
      [resourceId]: value,
    }));
  }

  async function toggleDateSpecificSlot(resource, date, slot) {
    const key = createDateSlotKey(date, slot);
    const blockedDateSlots = Array.isArray(resource.blockedDateSlots) ? resource.blockedDateSlots : [];
    const nextBlockedDateSlots = blockedDateSlots.includes(key)
      ? blockedDateSlots.filter((item) => item !== key)
      : [...blockedDateSlots, key];

    await updateBookingResourceForVendor(resource.id, {
      blockedDateSlots: nextBlockedDateSlots,
    });
  }

  const adminTitle = vendorMode === "booking" ? "Booking dashboard" : "Orders dashboard";
  const adminDescription =
    vendorMode === "booking"
      ? "Manage courts, date-specific slot blocks, and incoming booking requests. Confirmed bookings block that same slot on that same day."
      : "Review placed orders, confirm payment manually, and move them through the delivery pipeline.";

  function handleAdminLogin(event) {
    event.preventDefault();
    const expectedPhone = normalizeAdminPhone(vendor?.adminPhone);
    const expectedPassword = String(vendor?.adminPassword || "");
    const phoneMatches = normalizeAdminPhone(loginForm.phone) === expectedPhone;
    const passwordMatches = loginForm.password === expectedPassword;

    if (!expectedPhone || !expectedPassword) {
      setLoginError("This vendor does not have admin credentials configured yet.");
      return;
    }

    if (!phoneMatches || !passwordMatches) {
      setLoginError("Incorrect phone number or password.");
      return;
    }

    window.sessionStorage.setItem(`${ADMIN_SESSION_PREFIX}:${vendor.slug}`, "true");
    setIsAuthenticated(true);
    setLoginError("");
    setLoginForm({ phone: "", password: "" });
  }

  function handleAdminLogout() {
    window.sessionStorage.removeItem(`${ADMIN_SESSION_PREFIX}:${vendor.slug}`);
    setIsAuthenticated(false);
    setLoginForm({ phone: "", password: "" });
    setLoginError("");
  }

  if (!isAuthenticated) {
    return (
      <div className="page-stack">
        <section className="panel admin-auth-panel">
          <div className="section-header">
            <div>
              <span className="eyebrow">Admin login</span>
              <h1>{vendor?.name} Admin</h1>
              <p>Sign in with the admin phone number and password configured while creating this store.</p>
            </div>
          </div>

          <form className="checkout-form admin-auth-form" onSubmit={handleAdminLogin}>
            <input
              type="tel"
              placeholder="Admin phone number"
              value={loginForm.phone}
              onChange={(event) => setLoginForm((current) => ({ ...current, phone: event.target.value }))}
              required
            />
            <input
              type="password"
              placeholder="Admin password"
              value={loginForm.password}
              onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
              required
            />
            <button type="submit" className="button">
              Login to admin
            </button>
          </form>

          {loginError ? <p className="info-message info-message-error">{loginError}</p> : null}
        </section>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <section className="section-header">
        <div>
          <span className="eyebrow">Admin</span>
          <h1>{adminTitle}</h1>
          <p>{adminDescription}</p>
        </div>
        <button type="button" className="button button-secondary" onClick={handleAdminLogout}>
          Logout
        </button>
      </section>

      <section className="panel admin-tab-shell">
        <div className="admin-tabs">
          <button
            type="button"
            className={`admin-tab ${activeTab === (vendorMode === "booking" ? "bookings" : "orders") ? "admin-tab-active" : ""}`}
            onClick={() => setActiveTab(vendorMode === "booking" ? "bookings" : "orders")}
          >
            {vendorMode === "booking" ? "Bookings" : "Orders"}
          </button>
          <button
            type="button"
            className={`admin-tab ${activeTab === (vendorMode === "booking" ? "resources" : "products") ? "admin-tab-active" : ""}`}
            onClick={() => setActiveTab(vendorMode === "booking" ? "resources" : "products")}
          >
            {vendorMode === "booking" ? `${vendor.bookingResourceLabel || "Resources"} ` : "Products"}
          </button>
        </div>

        {vendorMode === "booking" && activeTab === "resources" ? (
          <div className="admin-sections">
            <div className="section-header">
              <div>
                <span className="eyebrow">{editingResourceId ? "Edit resource" : "Resources"}</span>
                <h2>
                  {editingResourceId
                    ? `Update ${vendor.bookingResourceLabel || "resource"}`
                    : `Add ${vendor.bookingResourceLabel || "resource"} for ${vendor?.name}`}
                </h2>
                <p>Add courts, nets, pitches, rooms, or any other slot-based unit, then manage slot blocks by day, including today.</p>
              </div>
              {editingResourceId ? (
                <button type="button" className="button button-secondary" onClick={resetResourceForm}>
                  Cancel edit
                </button>
              ) : null}
            </div>

            <form className="checkout-form admin-form-grid" onSubmit={handleSaveBookingResource}>
              <input
                type="text"
                placeholder={`${vendor.bookingResourceLabel || "Resource"} name`}
                value={resourceForm.name}
                onChange={(event) => setResourceForm((current) => ({ ...current, name: event.target.value }))}
                required
              />
              <input
                type="text"
                placeholder="Category"
                value={resourceForm.category}
                onChange={(event) => setResourceForm((current) => ({ ...current, category: event.target.value }))}
                required
              />
              <input
                type="number"
                min="0"
                placeholder="Price per slot"
                value={resourceForm.price}
                onChange={(event) => setResourceForm((current) => ({ ...current, price: event.target.value }))}
                required
              />
              <input
                type="text"
                placeholder="Location or area"
                value={resourceForm.location}
                onChange={(event) => setResourceForm((current) => ({ ...current, location: event.target.value }))}
                required
              />
              <input
                type="number"
                min="15"
                step="15"
                placeholder="Slot duration in minutes"
                value={resourceForm.slotDuration}
                onChange={(event) => setResourceForm((current) => ({ ...current, slotDuration: event.target.value }))}
                required
              />
              <input
                type="number"
                min="0"
                placeholder="Display order"
                value={resourceForm.displayOrder}
                onChange={(event) => setResourceForm((current) => ({ ...current, displayOrder: event.target.value }))}
              />
              <div className="slot-builder-card">
                <div className="slot-builder-header">
                  <div>
                    <span className="eyebrow">Slot builder</span>
                    <h3>Create slots visually</h3>
                  </div>
                  <button type="button" className="button button-secondary" onClick={generateSlotsFromBuilder}>
                    Generate slots
                  </button>
                </div>

                <div className="slot-builder-controls">
                  <label>
                    <span>Start</span>
                    <input
                      type="time"
                      value={slotBuilder.startTime}
                      onChange={(event) => setSlotBuilder((current) => ({ ...current, startTime: event.target.value }))}
                    />
                  </label>
                  <label>
                    <span>End</span>
                    <input
                      type="time"
                      value={slotBuilder.endTime}
                      onChange={(event) => setSlotBuilder((current) => ({ ...current, endTime: event.target.value }))}
                    />
                  </label>
                  <label>
                    <span>Interval</span>
                    <select
                      value={slotBuilder.interval}
                      onChange={(event) =>
                        setSlotBuilder((current) => ({
                          ...current,
                          interval: event.target.value,
                        }))
                      }
                    >
                      <option value="30">30 mins</option>
                      <option value="45">45 mins</option>
                      <option value="60">60 mins</option>
                      <option value="90">90 mins</option>
                      <option value="120">120 mins</option>
                    </select>
                  </label>
                </div>

                <div className="slot-builder-add">
                  <input
                    type="text"
                    placeholder="Add custom slot like 06:30-07:15"
                    value={slotBuilder.customSlot}
                    onChange={(event) => setSlotBuilder((current) => ({ ...current, customSlot: event.target.value }))}
                  />
                  <button type="button" className="button button-secondary" onClick={addCustomSlot}>
                    Add slot
                  </button>
                </div>

                <div className="slot-builder-legend">
                  <span className="slot-chip">Open</span>
                  <span className="slot-chip slot-chip-blocked">Blocked</span>
                  <span className="slot-legend-copy">Generate or add slots here. Then use the day selector below to block them for today or any future date.</span>
                </div>

                {!availableSlotList.length ? (
                  <p className="slot-builder-empty">No slots yet. Generate them from a time range or add a custom slot.</p>
                ) : (
                  <div className="slot-editor-grid">
                    {availableSlotList.map((slot) => {
                      const isBlocked = resourceForm.blockedDateSlots.some(item => String(item).endsWith(`::${slot}`));

                      return (
                        <div key={slot} className={`slot-editor-chip ${isBlocked ? "slot-editor-chip-blocked" : ""}`}>
                          <button
                            type="button"
                            className={`slot-chip slot-chip-button ${isBlocked ? "slot-chip-blocked" : ""}`}
                            onClick={() => {
                              const key = `::${slot}`;
                              const nextBlocked = resourceForm.blockedDateSlots.filter(item => !String(item).endsWith(key));
                              if (resourceForm.blockedDateSlots.some(item => String(item).endsWith(key))) {
                                nextBlocked.push(key);
                              }
                              setResourceForm(prev => ({ ...prev, blockedDateSlots: nextBlocked }));
                            }}
                          >
                            {slot}
                          </button>
                          <button type="button" className="slot-remove-button" onClick={() => removeSlot(slot)} aria-label={`Remove ${slot}`}>
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <textarea
                rows="4"
                placeholder="Description"
                value={resourceForm.description}
                onChange={(event) => setResourceForm((current) => ({ ...current, description: event.target.value }))}
                required
              />
              <textarea
                rows="4"
                placeholder="Amenities, one per line"
                value={resourceForm.amenities}
                onChange={(event) => setResourceForm((current) => ({ ...current, amenities: event.target.value }))}
              />

              <button type="submit" className="button" disabled={isSubmitting}>
                {isSubmitting
                  ? "Saving..."
                  : editingResourceId
                    ? `Save ${vendor.bookingResourceLabel || "resource"}`
                    : `Add ${vendor.bookingResourceLabel || "resource"}`}
              </button>
            </form>

            {message ? <p className={`info-message ${messageType === "error" ? "info-message-error" : ""}`}>{message}</p> : null}

            <div className="admin-product-list">
              {bookingResources.map((resource) => (
                <article key={resource.id} className="product-inline-card booking-inline-card">
                  <div>
                    <h3>{resource.name}</h3>
                    <p>{resource.category}</p>
                    <p>{resource.location}</p>
                    <p>{resource.slotDuration || 60} mins • Rs. {resource.price || 0}</p>
                    <div className="date-slot-manager">
                      <div className="date-slot-manager-top">
                        <div>
                          <strong>Block selected day</strong>
                          <p>Pick today or any future date, then tap slots to block or unblock only for that day.</p>
                        </div>
                        <input
                          type="date"
                          value={getSelectedDateForResource(resource.id)}
                          min={getTodayDateValue()}
                          onChange={(event) => setSelectedDateForResource(resource.id, event.target.value)}
                        />
                      </div>
                      <div className="slot-chip-list">
                        {(resource.availableSlots || []).map((slot) => {
                          const selectedDate = getSelectedDateForResource(resource.id);
                          const isDateBlocked = (resource.blockedDateSlots || []).includes(
                            createDateSlotKey(selectedDate, slot),
                          );
                          const isBookedForDate = bookedDateSlotKeys.has(
                            `${resource.id}::${createDateSlotKey(selectedDate, slot)}`,
                          );

                          return (
                            <button
                              key={`${resource.id}-date-${slot}`}
                              type="button"
                              className={`slot-chip slot-chip-button ${
                                isDateBlocked || isBookedForDate ? "slot-chip-blocked" : ""
                              }`}
                              onClick={() => toggleDateSpecificSlot(resource, selectedDate, slot)}
                              disabled={isBookedForDate}
                            >
                              {slot}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="card-actions">
                    <button type="button" className="button button-secondary" onClick={() => startEditingResource(resource)}>
                      Edit
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : null}

        {vendorMode === "commerce" && activeTab === "products" ? (
          <div className="admin-sections">
            <div className="section-header">
              <div>
                <span className="eyebrow">{editingProductId ? "Edit product" : "Products"}</span>
                <h2>{editingProductId ? `Update product for ${vendor?.name}` : `Add product for ${vendor?.name}`}</h2>
                <p>Products added here are stored in Firebase and shown in this vendor storefront only.</p>
              </div>
              {editingProductId ? (
                <button type="button" className="button button-secondary" onClick={resetProductForm}>
                  Cancel edit
                </button>
              ) : null}
            </div>

            <form className="checkout-form admin-form-grid" onSubmit={handleCreateProduct}>
              <input
                type="text"
                placeholder="Product name"
                value={productForm.name}
                onChange={(event) => setProductForm((current) => ({ ...current, name: event.target.value }))}
                required
              />
              <input
                type="text"
                placeholder="Category"
                value={productForm.category}
                onChange={(event) => setProductForm((current) => ({ ...current, category: event.target.value }))}
                required
              />
              <input
                type="number"
                min="0"
                placeholder="Price"
                value={productForm.price}
                onChange={(event) => setProductForm((current) => ({ ...current, price: event.target.value }))}
                required
              />
              <input
                type="text"
                placeholder="Badge label"
                value={productForm.heroLabel}
                onChange={(event) => setProductForm((current) => ({ ...current, heroLabel: event.target.value }))}
              />
              <label className="file-input-field">
                <span>Product image</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  required={!editingProductId}
                />
                <small>
                  {editingProductId
                    ? "Choose a new image only if you want to replace the current one."
                    : "Use a small image under 350 KB for this temporary base64 setup."}
                </small>
              </label>
              <textarea
                rows="4"
                placeholder="Product description"
                value={productForm.description}
                onChange={(event) => setProductForm((current) => ({ ...current, description: event.target.value }))}
                required
              />
              <textarea
                rows="4"
                placeholder="Features, one per line"
                value={productForm.features}
                onChange={(event) => setProductForm((current) => ({ ...current, features: event.target.value }))}
              />

              <button type="submit" className="button" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : editingProductId ? "Save product" : "Add product"}
              </button>
            </form>

            {message ? <p className={`info-message ${messageType === "error" ? "info-message-error" : ""}`}>{message}</p> : null}

            <div className="admin-product-list">
              {products.map((product) => (
                <article key={product.id} className="product-inline-card">
                  <img src={product.image} alt={product.name} />
                  <div>
                    <h3>{product.name}</h3>
                    <p>{product.category}</p>
                    <strong>Rs. {product.price}</strong>
                  </div>
                  <div className="card-actions">
                    <button type="button" className="button button-secondary" onClick={() => startEditingProduct(product)}>
                      Edit product
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : null}

        {activeTab !== "products" && activeTab !== "resources" ? (
          <div className="admin-orders-panel">
            <div className="section-header">
              <div>
                <span className="eyebrow">{vendorMode === "booking" ? "Bookings" : "Orders"}</span>
                <h2>{vendorMode === "booking" ? "Manage booking requests" : "Manage incoming orders"}</h2>
                <p>
                  {vendorMode === "booking"
                    ? "Search by customer, date, or slot and then keep the request pending, accept it, or mark it already booked."
                    : "Filter by status, search quickly, and expand only the order you want to process."}
                </p>
              </div>
            </div>

            <div className="admin-order-stats">
              {orderFilterOptions.map((status) => (
                <button
                  key={status}
                  type="button"
                  className={`admin-stat-card ${orderFilter === status ? "admin-stat-card-active" : ""}`}
                  onClick={() => setOrderFilter(status)}
                >
                  <span>{status === "all" ? `All ${vendorMode === "booking" ? "bookings" : "orders"}` : status.replaceAll("_", " ")}</span>
                  <strong>{orderCounts[status] || 0}</strong>
                </button>
              ))}
            </div>

            <div className="admin-toolbar">
              <input
                type="text"
                placeholder={
                  vendorMode === "booking"
                    ? "Search by booking ID, customer, date, slot"
                    : "Search by order ID, customer, phone, email"
                }
                value={orderSearch}
                onChange={(event) => setOrderSearch(event.target.value)}
              />
              <select value={orderFilter} onChange={(event) => setOrderFilter(event.target.value)}>
                {orderFilterOptions.map((status) => (
                  <option key={status} value={status}>
                    {status === "all" ? "All statuses" : status.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </div>

            {!visibleOrders.length ? (
              <p>No {vendorMode === "booking" ? "bookings" : "orders"} yet for this vendor.</p>
            ) : !filteredOrders.length ? (
              <p>No {vendorMode === "booking" ? "bookings" : "orders"} match your current search or filter.</p>
            ) : (
              <div className="admin-order-list">
                {filteredOrders.map((order) => {
                  const isExpanded = order.id === expandedOrderId;

                  return (
                    <article
                      key={order.id}
                      className={`order-card admin-order-card ${isExpanded ? "admin-order-card-active" : ""}`}
                      onClick={() => setExpandedOrderId((current) => (current === order.id ? "" : order.id))}
                    >
                      <div className="admin-order-summary">
                        <div className="admin-order-summary-main">
                          <p className="order-id">{order.id}</p>
                          <h3>{order.customer?.name || "Customer"}</h3>
                          <p>
                            {vendorMode === "booking"
                              ? `${order.bookingDetails?.bookingDate || "Date pending"} • ${order.bookingDetails?.timeSlot || "Slot pending"}`
                              : order.customer?.phone || order.customer?.email}
                          </p>
                        </div>
                        <div className="admin-order-summary-meta">
                          {vendorMode === "booking" ? (
                            <>
                              <span>{order.bookingDetails?.resourceName || "Resource pending"}</span>
                              <strong>Rs. {order.totalAmount}</strong>
                            </>
                          ) : (
                            <>
                              <span>{order.cartItems?.length || 0} item(s)</span>
                              <strong>Rs. {order.totalAmount}</strong>
                            </>
                          )}
                        </div>
                        <StatusBadge status={order.status} />
                      </div>

                      <div className={`admin-order-detail-wrap ${isExpanded ? "admin-order-detail-wrap-open" : ""}`}>
                        <div className="admin-order-detail">
                          <div className="order-card-top">
                            <div>
                              <p>{order.customer?.email}</p>
                              <p>{order.customer?.phone}</p>
                              <p>{vendorMode === "booking" ? order.bookingDetails?.location : order.customer?.address}</p>
                            </div>
                          </div>

                          {vendorMode === "booking" ? (
                            <div className="order-items">
                              <div className="order-item-row">
                                <span>{vendor.bookingResourceLabel || "Resource"}</span>
                                <strong>{order.bookingDetails?.resourceName || "Unavailable"}</strong>
                              </div>
                              <div className="order-item-row">
                                <span>Date</span>
                                <strong>{order.bookingDetails?.bookingDate || "Unavailable"}</strong>
                              </div>
                              <div className="order-item-row">
                                <span>Time slot</span>
                                <strong>{order.bookingDetails?.timeSlot || "Unavailable"}</strong>
                              </div>
                              <div className="order-item-row">
                                <span>Note</span>
                                <strong>{order.bookingDetails?.note || "No note"}</strong>
                              </div>
                            </div>
                          ) : (
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
                          )}

                          <div className="order-footer">
                            <strong>Total: Rs. {order.totalAmount}</strong>
                            <label className="status-select" onClick={(event) => event.stopPropagation()}>
                              <span>Update status</span>
                              <select value={order.status} onChange={(event) => updateOrderStatus(order.id, event.target.value)}>
                                {activeStatuses.map((status) => (
                                  <option key={status} value={status}>
                                    {status}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}

export default AdminPage;
