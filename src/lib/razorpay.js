/**
 * Dev/test Razorpay helpers. Key ID is public (safe in the browser).
 * Live production should create Orders + verify signatures on a server.
 */

let razorpayScriptPromise;

export function loadRazorpayScript() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Razorpay runs in the browser only."));
  }

  if (window.Razorpay) {
    return Promise.resolve();
  }

  if (!razorpayScriptPromise) {
    razorpayScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Could not load Razorpay checkout script."));
      document.body.appendChild(script);
    });
  }

  return razorpayScriptPromise;
}

/** Vendor’s Key ID, or app-wide test key from env when vendor field is empty. */
export function getEffectiveRazorpayKeyId(vendor) {
  const fromVendor = String(vendor?.razorpayKeyId || "").trim();
  if (fromVendor) {
    return fromVendor;
  }
  return String(import.meta.env.VITE_RAZORPAY_KEY_ID || "").trim();
}

/** Commerce vendor opted in and we have some Key ID (vendor or env). */
export function isRazorpayTestCheckoutAvailable(vendor) {
  if ((vendor?.businessModel || "commerce") !== "commerce") {
    return false;
  }
  if (!vendor?.paymentsEnabled) {
    return false;
  }
  return Boolean(getEffectiveRazorpayKeyId(vendor));
}

/**
 * Opens Razorpay Checkout (amount-based test flow; no server Order).
 * @returns Resolves with payment response object, or null if user closed the modal.
 */
export function openRazorpayTestCheckout({
  keyId,
  amountRupees,
  vendorName,
  orderId,
  customerName,
  customerEmail,
  customerPhone,
}) {
  const amountPaise = Math.round(Number(amountRupees) * 100);
  if (!Number.isFinite(amountPaise) || amountPaise < 100) {
    return Promise.reject(new Error("Amount must be at least Rs. 1."));
  }

  return new Promise((resolve, reject) => {
    let settled = false;

    const options = {
      key: keyId,
      amount: amountPaise,
      currency: "INR",
      name: vendorName || "Store",
      description: `Order ${orderId}`,
      notes: {
        firestore_order_id: orderId,
      },
      prefill: {
        name: customerName || "",
        email: customerEmail || "",
        contact: customerPhone || "",
      },
      theme: {
        color: "#1f6feb",
      },
      handler(response) {
        settled = true;
        resolve(response);
      },
      modal: {
        ondismiss() {
          if (!settled) {
            settled = true;
            resolve(null);
          }
        },
      },
    };

    try {
      const instance = new window.Razorpay(options);
      instance.on("payment.failed", (payload) => {
        if (!settled) {
          settled = true;
          reject(new Error(payload?.error?.description || "Payment failed."));
        }
      });
      instance.open();
    } catch (err) {
      reject(err instanceof Error ? err : new Error("Could not open Razorpay."));
    }
  });
}
