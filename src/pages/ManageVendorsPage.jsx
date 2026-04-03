import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DEFAULT_VENDOR_THEME, slugifyVendorName } from "../data/vendors";
import { createVendor, subscribeVendors, updateVendorAndReferences } from "../services/storeService";

const ACCENT_PRESETS = ["#1f6feb", "#ea580c", "#dc2626", "#0f766e", "#7c3aed", "#ca8a04", "#db2777", "#2563eb"];
const SURFACE_PRESETS = ["#eef5ff", "#fff7ed", "#fef2f2", "#ecfdf5", "#f5f3ff", "#fefce8", "#fdf2f8", "#eff6ff"];

const initialVendor = {
  name: "",
  slug: "",
  logo: "",
  tagline: "",
  businessModel: "commerce",
  shopCategory: "buy_sell",
  heroDescription: "",
  overview: "",
  highlights: "",
  featuredHeading: "",
  accent: DEFAULT_VENDOR_THEME.accent,
  surface: DEFAULT_VENDOR_THEME.surface,
  supportEmail: "",
  adminPhone: "",
  adminPassword: "",
  bookingLabel: "Book a slot",
  bookingResourceLabel: "Court",
  paymentsEnabled: false,
  razorpayKeyId: "",
};

function ManageVendorsPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginForm, setLoginForm] = useState({ phone: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [vendors, setVendors] = useState([]);
  const [form, setForm] = useState(initialVendor);
  const [editingVendor, setEditingVendor] = useState(null);
  const [message, setMessage] = useState("");
  const [isLoadingVendors, setIsLoadingVendors] = useState(true);
  const [isAdminPasswordVisible, setIsAdminPasswordVisible] = useState(false);

  const CREATOR_AUTH_KEY = "vendor_creator_auth";

  function normalizePhone(value) {
    return String(value || "").replace(/\s+/g, "").trim();
  }

  useEffect(() => {
    const authData = window.localStorage.getItem(CREATOR_AUTH_KEY);
    if (authData) {
      try {
        JSON.parse(authData);
        setIsAuthenticated(true);
      } catch {
        // Invalid
      }
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubscribe = subscribeVendors(
      (items) => {
        setVendors(items);
        setIsLoadingVendors(false);
      },
      (error) => {
        setMessage(error.message);
        setIsLoadingVendors(false);
      },
    );
    return unsubscribe;
  }, [isAuthenticated]);

  const handleCreatorLogin = (event) => {
    event.preventDefault();
    const expectedPhone = normalizePhone("9994292890");
    const expectedPassword = "123@Dragvin@qwerty";
    const phoneMatches = normalizePhone(loginForm.phone) === expectedPhone;
    const passwordMatches = loginForm.password === expectedPassword;

    if (!phoneMatches || !passwordMatches) {
      setLoginError("Incorrect phone number or password.");
      return;
    }

    window.localStorage.setItem(CREATOR_AUTH_KEY, JSON.stringify({ phone: loginForm.phone, timestamp: Date.now() }));
    setIsAuthenticated(true);
    setLoginError("");
    setLoginForm({ phone: "", password: "" });
  };

  const handleCreatorLogout = () => {
    window.localStorage.removeItem(CREATOR_AUTH_KEY);
    setIsAuthenticated(false);
    setLoginForm({ phone: "", password: "" });
    setLoginError("");
  };

  if (!isAuthenticated) {
    return (
      <div className="page-stack">
        <section className="panel admin-auth-panel">
          <div className="section-header">
            <div>
              <span className="eyebrow">Vendor Setup Login</span>
              <h1>Multi-Vendor Creator</h1>
              <p>Enter phone and password to access vendor creation tools.</p>
            </div>
          </div>
          <form className="checkout-form admin-auth-form" onSubmit={handleCreatorLogin}>
            <input
              type="tel"
              placeholder="Phone number"
              value={loginForm.phone}
              onChange={(event) => setLoginForm((current) => ({ ...current, phone: event.target.value }))}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={loginForm.password}
              onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
              required
            />
            <button type="submit" className="button">
              Login to Vendor Setup
            </button>
          </form>
          {loginError ? <p className="info-message info-message-error">{loginError}</p> : null}
        </section>
      </div>
    );
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      if (!file) {
        reject(new Error("Please choose a logo file."));
        return;
      }

      if (!file.type.startsWith("image/")) {
        reject(new Error("Please choose a valid image file for the logo."));
        return;
      }

      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Could not read the selected logo file."));
      reader.readAsDataURL(file);
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");

    const slug = form.slug || slugifyVendorName(form.name);
    const payload = {
      ...form,
      slug,
      paymentsEnabled: Boolean(form.paymentsEnabled),
      razorpayKeyId: String(form.razorpayKeyId || "").trim(),
      highlights: form.highlights
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
    };

    try {
      if (editingVendor) {
        await updateVendorAndReferences(editingVendor.id || editingVendor.slug, payload, editingVendor);
        setMessage(`Vendor updated successfully at /${slug}`);
      } else {
        await createVendor(payload);
        setMessage(`Vendor created successfully at /${slug}`);
      }

      setForm(initialVendor);
      setEditingVendor(null);
    } catch (error) {
      setMessage(error.message);
    }
  }

  function startEditingVendor(vendor) {
    setEditingVendor(vendor);
    setForm({
      name: vendor.name || "",
      slug: vendor.slug || "",
      logo: vendor.logo || "",
      tagline: vendor.tagline || "",
      businessModel: vendor.businessModel || "commerce",
      shopCategory: vendor.shopCategory || "buy_sell",
      heroDescription: vendor.heroDescription || "",
      overview: vendor.overview || "",
      highlights: Array.isArray(vendor.highlights) ? vendor.highlights.join("\n") : "",
      featuredHeading: vendor.featuredHeading || "",
      accent: vendor.accent || DEFAULT_VENDOR_THEME.accent,
      surface: vendor.surface || DEFAULT_VENDOR_THEME.surface,
      supportEmail: vendor.supportEmail || "",
      adminPhone: vendor.adminPhone || "",
      adminPassword: vendor.adminPassword || "",
      bookingLabel: vendor.bookingLabel || "Book a slot",
      bookingResourceLabel: vendor.bookingResourceLabel || "Court",
      paymentsEnabled: Boolean(vendor.paymentsEnabled),
      razorpayKeyId: vendor.razorpayKeyId || "",
    });
    setMessage("");
  }

  function resetVendorForm() {
    setForm(initialVendor);
    setEditingVendor(null);
    setMessage("");
    setIsAdminPasswordVisible(false);
  }

  async function handleLogoChange(event) {
    const nextFile = event.target.files?.[0] || null;

    if (!nextFile) {
      return;
    }

    try {
      const logo = await fileToDataUrl(nextFile);
      setForm((current) => ({ ...current, logo }));
      setMessage("");
    } catch (error) {
      setMessage(error.message);
    }
  }

  function renderThemeField({ label, value, presets, field }) {
    return (
      <div className="theme-picker-card">
        <div className="theme-picker-header">
          <div className="theme-picker-title">
            <span className="eyebrow">{label}</span>
            <code>{value}</code>
          </div>
          <span className="theme-color-preview" style={{ background: value }} aria-hidden="true" />
        </div>

        <div className="theme-swatch-grid">
          {presets.map((preset) => (
            <button
              key={`${field}-${preset}`}
              type="button"
              className={`theme-swatch ${value === preset ? "theme-swatch-active" : ""}`}
              style={{ background: preset }}
              onClick={() => setForm((current) => ({ ...current, [field]: preset }))}
              aria-label={`Use ${preset} for ${label.toLowerCase()}`}
            />
          ))}
        </div>

        <div className="theme-picker-controls">
          <label className="theme-color-input">
            <span>Pick</span>
            <input
              type="color"
              value={value}
              onChange={(event) => setForm((current) => ({ ...current, [field]: event.target.value }))}
            />
          </label>
          <input
            type="text"
            placeholder={`${label} hex`}
            value={value}
            onChange={(event) => setForm((current) => ({ ...current, [field]: event.target.value }))}
            required
          />
        </div>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <section className="section-header">
        <div>
          <span className="eyebrow">Vendor Setup</span>
          <h1>Multi-Vendor Dashboard</h1>
          <p>Create and manage vendor storefronts.</p>
        </div>
        <button 
          type="button" 
          className="button button-secondary" 
          onClick={handleCreatorLogout}
        >
          Logout
        </button>
      </section>
      <div className="page-wrap">
        <div className="page-stack">
          <section className="hero-panel">
            <div>
              <span className="eyebrow">Vendor setup</span>
              <h1>Create vendors directly in Firebase.</h1>
              <p>
                This page creates vendor storefronts in Firestore. You can set vendors up as a regular buy/sell store or
                as a booking-based business such as badminton courts, cricket nets, turf grounds, salons, or studios.
              </p>
            </div>
            <div className="hero-card">
              <h2>How it works</h2>
              <ul className="feature-list">
                <li>Create a vendor here</li>
                <li>Choose `commerce` for products or `booking` for slot-based websites</li>
                <li>Open `/{'{vendor-slug}'}/admin` to manage the catalog or booking slots</li>
                <li>Each vendor gets a storefront matched to its category</li>
              </ul>
            </div>
          </section>

          <section className="panel">
            <div className="section-header">
              <div>
                <span className="eyebrow">{editingVendor ? "Edit vendor" : "New vendor"}</span>
                <h2>{editingVendor ? "Update storefront" : "Create storefront"}</h2>
              </div>
              {editingVendor ? (
                <button type="button" className="button button-secondary" onClick={resetVendorForm}>
                  Cancel edit
                </button>
              ) : null}
            </div>

            <form className="checkout-form admin-form-grid" onSubmit={handleSubmit}>
              <input
                type="text"
                placeholder="Vendor name"
                value={form.name}
                onChange={(event) => {
                  const name = event.target.value;
                  setForm((current) => ({
                    ...current,
                    name,
                    slug: slugifyVendorName(name),
                  }));
                }}
                required
              />
              <input
                type="text"
                placeholder="Slug"
                value={form.slug}
                onChange={(event) => setForm((current) => ({ ...current, slug: slugifyVendorName(event.target.value) }))}
                required
              />
              <div className="logo-field">
                <div className="logo-field-preview">
                  {form.logo ? <img src={form.logo} alt={`${form.name || "Vendor"} logo`} /> : <span>No logo</span>}
                </div>
                <div className="logo-field-controls">
                  <input
                    type="text"
                    placeholder="Logo image URL (optional)"
                    value={form.logo}
                    onChange={(event) => setForm((current) => ({ ...current, logo: event.target.value }))}
                  />
                  <label className="file-input-field">
                    <span>Upload logo</span>
                    <input type="file" accept="image/*" onChange={handleLogoChange} />
                  </label>
                </div>
              </div>
              <input
                type="text"
                placeholder="Tagline"
                value={form.tagline}
                onChange={(event) => setForm((current) => ({ ...current, tagline: event.target.value }))}
                required
              />
              <select
                value={form.businessModel}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    businessModel: event.target.value,
                    shopCategory: event.target.value === "booking" ? "booking" : "buy_sell",
                    ...(event.target.value === "booking" ? { paymentsEnabled: false, razorpayKeyId: "" } : {}),
                  }))
                }
              >
                <option value="commerce">Commerce website</option>
                <option value="booking">Booking website</option>
              </select>
              <input
                type="text"
                placeholder="Shop category"
                value={form.shopCategory}
                onChange={(event) => setForm((current) => ({ ...current, shopCategory: event.target.value }))}
                required
              />
              <input
                type="email"
                placeholder="Support email"
                value={form.supportEmail}
                onChange={(event) => setForm((current) => ({ ...current, supportEmail: event.target.value }))}
                required
              />
              <input
                type="tel"
                placeholder="Admin phone number"
                value={form.adminPhone}
                onChange={(event) => setForm((current) => ({ ...current, adminPhone: event.target.value }))}
                required
              />
              <div className="password-field">
                <input
                  type={isAdminPasswordVisible ? "text" : "password"}
                  placeholder="Admin password"
                  value={form.adminPassword}
                  onChange={(event) => setForm((current) => ({ ...current, adminPassword: event.target.value }))}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setIsAdminPasswordVisible((current) => !current)}
                >
                  {isAdminPasswordVisible ? "Hide" : "Show"}
                </button>
              </div>
              <div className="theme-picker-shell">
                {renderThemeField({
                  label: "Accent color",
                  value: form.accent,
                  presets: ACCENT_PRESETS,
                  field: "accent",
                })}
                {renderThemeField({
                  label: "Surface color",
                  value: form.surface,
                  presets: SURFACE_PRESETS,
                  field: "surface",
                })}
              </div>
              <textarea
                rows="4"
                placeholder="Hero description"
                value={form.heroDescription}
                onChange={(event) => setForm((current) => ({ ...current, heroDescription: event.target.value }))}
                required
              />
              <textarea
                rows="4"
                placeholder="Overview"
                value={form.overview}
                onChange={(event) => setForm((current) => ({ ...current, overview: event.target.value }))}
                required
              />
              <textarea
                rows="4"
                placeholder="Highlights, one per line"
                value={form.highlights}
                onChange={(event) => setForm((current) => ({ ...current, highlights: event.target.value }))}
                required
              />
              <input
                type="text"
                placeholder="Featured heading"
                value={form.featuredHeading}
                onChange={(event) => setForm((current) => ({ ...current, featuredHeading: event.target.value }))}
                required
              />
              {form.businessModel === "commerce" ? (
                <div className="vendor-payments-block">
                  <label className="vendor-payments-toggle">
                    <input
                      type="checkbox"
                      checked={form.paymentsEnabled}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, paymentsEnabled: event.target.checked }))
                      }
                    />
                    <span>Enable Razorpay checkout (test / dev)</span>
                  </label>
                  <p className="vendor-payments-help">
                    Per-vendor toggle. Use a Razorpay <strong>test</strong> Key ID from the vendor dashboard (or leave
                    blank and set <code>VITE_RAZORPAY_KEY_ID</code> in <code>.env</code> for local demos). Live mode later
                    needs server-side order creation and signature verification.
                  </p>
                  {form.paymentsEnabled ? (
                    <input
                      type="text"
                      placeholder="Razorpay Key ID (rzp_test_…), optional if using .env fallback"
                      value={form.razorpayKeyId}
                      onChange={(event) => setForm((current) => ({ ...current, razorpayKeyId: event.target.value }))}
                    />
                  ) : null}
                </div>
              ) : null}

              {form.businessModel === "booking" ? (
                <>
                  <input
                    type="text"
                    placeholder="Primary CTA label"
                    value={form.bookingLabel}
                    onChange={(event) => setForm((current) => ({ ...current, bookingLabel: event.target.value }))}
                    required
                  />
                  <input
                    type="text"
                    placeholder="Resource label"
                    value={form.bookingResourceLabel}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, bookingResourceLabel: event.target.value }))
                    }
                    required
                  />
                </>
              ) : null}

              <div className="theme-preview-panel" style={{ "--vendor-accent": form.accent, "--vendor-surface": form.surface }}>
                <div className="theme-preview-copy">
                  <span className="eyebrow">Theme preview</span>
                  <h3>{form.name || "Your storefront"}</h3>
                  <p>{form.tagline || "See how the chosen accent and surface colors will feel on the storefront."}</p>
                </div>
                <div className="theme-preview-actions">
                  <span className="theme-preview-pill">Accent</span>
                  <span className="theme-preview-pill theme-preview-pill-secondary">Surface</span>
                </div>
              </div>

              <button type="submit" className="button">
                {editingVendor ? "Save vendor" : "Create vendor"}
              </button>
            </form>

            {message ? <p className="info-message">{message}</p> : null}
          </section>

          <section className="panel">
            <div className="section-header">
              <div>
                <span className="eyebrow">Existing vendors</span>
                <h2>Firebase storefronts</h2>
              </div>
            </div>

            {isLoadingVendors ? (
              <p>Loading vendors...</p>
            ) : !vendors.length ? (
              <p>No vendors found in Firebase yet.</p>
            ) : (
              <div className="admin-product-list">
                {vendors.map((vendor) => (
                  <article key={vendor.slug} className="product-inline-card">
                    <div>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                        {vendor.logo ? <img src={vendor.logo} alt={`${vendor.name} logo`} className="vendor-list-logo" /> : null}
                        <div>
                          <h3>{vendor.name}</h3>
                        </div>
                      </div>
                      <p>/{vendor.slug}</p>
                      <p>{vendor.tagline}</p>
                      <p>
                        {vendor.businessModel === "booking" ? "Booking website" : "Commerce website"} •{" "}
                        {vendor.shopCategory || "general"}
                      </p>
                      <p>Admin: {vendor.adminPhone || "Not configured"}</p>
                      {vendor.businessModel === "commerce" && vendor.paymentsEnabled ? (
                        <p className="vendor-list-payments-badge">Razorpay test checkout enabled</p>
                      ) : null}
                    </div>
                    <div className="card-actions">
                      <button type="button" className="button button-secondary" onClick={() => startEditingVendor(vendor)}>
                        Edit store
                      </button>
                      <Link to={`/${vendor.slug}`} className="button button-secondary">
                        Open store
                      </Link>
                      <Link to={`/${vendor.slug}/admin`} className="button">
                        Open admin
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default ManageVendorsPage;

