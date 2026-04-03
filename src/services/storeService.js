import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, hasFirebaseConfig, storage } from "../firebase";

function requireFirebase() {
  if (!hasFirebaseConfig || !db) {
    throw new Error("Firebase is not configured. Add your VITE_FIREBASE_* variables first.");
  }
}

function mapSnapshot(snapshot) {
  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  }));
}

export function subscribeVendors(callback, onError) {
  if (!hasFirebaseConfig || !db) {
    callback([]);
    return () => {};
  }

  return onSnapshot(
    collection(db, "vendors"),
    (snapshot) => {
      callback(mapSnapshot(snapshot).sort((left, right) => left.name.localeCompare(right.name)));
    },
    (error) => {
      if (onError) {
        onError(error);
      }
    },
  );
}

export function subscribeVendor(vendorSlug, callback, onError) {
  if (!hasFirebaseConfig || !db || !vendorSlug) {
    callback(null);
    return () => {};
  }

  const vendorQuery = query(collection(db, "vendors"), where("slug", "==", vendorSlug));

  return onSnapshot(
    vendorQuery,
    (snapshot) => {
      callback(snapshot.empty ? null : { id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
    },
    (error) => {
      if (onError) {
        onError(error);
      }
    },
  );
}

export function subscribeProducts(vendorSlug, callback, onError) {
  if (!hasFirebaseConfig || !db || !vendorSlug) {
    callback([]);
    return () => {};
  }

  const productsQuery = query(collection(db, "products"), where("vendorSlug", "==", vendorSlug));

  return onSnapshot(
    productsQuery,
    (snapshot) => {
      callback(mapSnapshot(snapshot));
    },
    (error) => {
      if (onError) {
        onError(error);
      }
    },
  );
}

export function subscribeBookingResources(vendorSlug, callback, onError) {
  if (!hasFirebaseConfig || !db || !vendorSlug) {
    callback([]);
    return () => {};
  }

  const resourcesQuery = query(collection(db, "bookingResources"), where("vendorSlug", "==", vendorSlug));

  return onSnapshot(
    resourcesQuery,
    (snapshot) => {
      callback(
        mapSnapshot(snapshot).sort((left, right) => {
          const leftOrder = Number(left.displayOrder || 0);
          const rightOrder = Number(right.displayOrder || 0);

          if (leftOrder !== rightOrder) {
            return leftOrder - rightOrder;
          }

          return String(left.name || "").localeCompare(String(right.name || ""));
        }),
      );
    },
    (error) => {
      if (onError) {
        onError(error);
      }
    },
  );
}

export async function createVendor(vendor) {
  requireFirebase();

  const vendorRef = doc(db, "vendors", vendor.slug);
  await setDoc(vendorRef, {
    ...vendor,
    createdAt: serverTimestamp(),
  });

  return vendorRef.id;
}

export async function updateVendor(vendorId, values) {
  requireFirebase();

  await updateDoc(doc(db, "vendors", vendorId), values);
}

async function syncVendorReferences(previousVendor, nextVendor) {
  const previousSlug = previousVendor.slug;
  const nextSlug = nextVendor.slug;
  const nextName = nextVendor.name;
  const slugChanged = previousSlug && nextSlug && previousSlug !== nextSlug;
  const nameChanged = previousVendor.name && nextName && previousVendor.name !== nextName;

  if (!slugChanged && !nameChanged) {
    return;
  }

  const relatedCollections = ["products", "orders", "users", "bookingResources"];
  const snapshots = await Promise.all(
    relatedCollections.map((name) => getDocs(query(collection(db, name), where("vendorSlug", "==", previousSlug)))),
  );

  await Promise.all(
    snapshots.flatMap((snapshot, index) =>
      snapshot.docs.map((item) => {
        const collectionName = relatedCollections[index];
        const updateValues = {};

        if (slugChanged) {
          updateValues.vendorSlug = nextSlug;
        }

        if (collectionName === "products" && nameChanged) {
          updateValues.vendorName = nextName;
        }

        if (!Object.keys(updateValues).length) {
          return Promise.resolve();
        }

        return updateDoc(doc(db, collectionName, item.id), updateValues);
      }),
    ),
  );
}

export async function updateVendorAndReferences(vendorId, values, previousVendor) {
  requireFirebase();

  await updateVendor(vendorId, values);
  await syncVendorReferences(previousVendor, values);
}

export async function createProduct(product) {
  requireFirebase();

  const productRef = await addDoc(collection(db, "products"), {
    ...product,
    createdAt: serverTimestamp(),
  });

  return productRef.id;
}

export async function createBookingResource(resource) {
  requireFirebase();

  const resourceRef = await addDoc(collection(db, "bookingResources"), {
    ...resource,
    createdAt: serverTimestamp(),
  });

  return resourceRef.id;
}

export async function updateBookingResource(resourceId, values) {
  requireFirebase();

  await updateDoc(doc(db, "bookingResources", resourceId), values);
}

export async function updateProduct(productId, values) {
  requireFirebase();

  await updateDoc(doc(db, "products", productId), values);
}

export async function uploadProductImage(vendorSlug, file) {
  requireFirebase();

  if (!storage) {
    throw new Error("Firebase Storage is not configured.");
  }

  if (!file) {
    throw new Error("Please choose an image to upload.");
  }

  const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const storageRef = ref(storage, `vendors/${vendorSlug}/products/${Date.now()}-${safeFileName}`);

  await uploadBytes(storageRef, file, {
    contentType: file.type || "application/octet-stream",
  });

  return getDownloadURL(storageRef);
}

export async function createOrder({ vendorSlug, cartItems, customer, totalAmount }) {
  requireFirebase();

  const normalizedEmail = normalizeContactValue(customer.email);
  const normalizedPhone = normalizePhoneValue(customer.phone);

  const payload = {
    vendorSlug,
    orderType: "commerce",
    cartItems,
    customer,
    customerLookup: {
      email: normalizedEmail,
      phone: normalizedPhone,
    },
    totalAmount,
    status: "payment_pending",
    createdAt: new Date().toISOString(),
  };

  const orderRef = await addDoc(collection(db, "orders"), {
    ...payload,
    createdAt: serverTimestamp(),
  });

  await addDoc(collection(db, "users"), {
    vendorSlug,
    ...customer,
    normalizedEmail,
    normalizedPhone,
    orderId: orderRef.id,
    createdAt: serverTimestamp(),
  });

  return { id: orderRef.id, ...payload };
}

export async function createBooking({ vendorSlug, customer, bookingDetails }) {
  requireFirebase();

  const normalizedEmail = normalizeContactValue(customer.email);
  const normalizedPhone = normalizePhoneValue(customer.phone);
  const totalAmount = Number(bookingDetails.price || 0);

  const payload = {
    vendorSlug,
    orderType: "booking",
    customer,
    customerLookup: {
      email: normalizedEmail,
      phone: normalizedPhone,
    },
    bookingDetails,
    totalAmount,
    status: "booking_pending",
    createdAt: new Date().toISOString(),
  };

  const orderRef = await addDoc(collection(db, "orders"), {
    ...payload,
    createdAt: serverTimestamp(),
  });

  await addDoc(collection(db, "users"), {
    vendorSlug,
    ...customer,
    normalizedEmail,
    normalizedPhone,
    orderId: orderRef.id,
    createdAt: serverTimestamp(),
  });

  return { id: orderRef.id, ...payload };
}

export function subscribeToOrders(vendorSlug, callback, onError) {
  if (!hasFirebaseConfig || !db) {
    callback([]);
    return () => {};
  }

  const ordersQuery = query(collection(db, "orders"), where("vendorSlug", "==", vendorSlug));

  return onSnapshot(
    ordersQuery,
    (snapshot) => {
      callback(
        snapshot.docs
          .map((item) => ({
            id: item.id,
            ...item.data(),
          }))
          .sort((left, right) => {
            const leftTime = left.createdAt?.seconds
              ? left.createdAt.seconds * 1000
              : new Date(left.createdAt || 0).getTime();
            const rightTime = right.createdAt?.seconds
              ? right.createdAt.seconds * 1000
              : new Date(right.createdAt || 0).getTime();
            return rightTime - leftTime;
          }),
      );
    },
    (error) => {
      if (onError) {
        onError(error);
      }
    },
  );
}

export async function updateOrderStatus(orderId, nextStatus) {
  requireFirebase();

  await updateDoc(doc(db, "orders", orderId), {
    status: nextStatus,
  });
}

function normalizeContactValue(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizePhoneValue(value) {
  return normalizeContactValue(value).replace(/\s+/g, "");
}

export async function findTrackableOrder({ vendorSlug, orderId, email, phone }) {
  requireFirebase();

  const normalizedOrderId = String(orderId || "").trim();
  const normalizedEmail = normalizeContactValue(email);
  const normalizedPhone = normalizePhoneValue(phone);

  if (!normalizedOrderId) {
    throw new Error("Enter your order ID.");
  }

  if (!normalizedEmail && !normalizedPhone) {
    throw new Error("Enter the email or phone number used during checkout.");
  }

  const orderSnapshot = await getDoc(doc(db, "orders", normalizedOrderId));

  if (!orderSnapshot.exists()) {
    throw new Error("We could not find an order with that ID.");
  }

  const order = { id: orderSnapshot.id, ...orderSnapshot.data() };

  if (order.vendorSlug !== vendorSlug) {
    throw new Error("That order does not belong to this storefront.");
  }

  const orderEmail = normalizeContactValue(order.customer?.email);
  const orderPhone = normalizePhoneValue(order.customer?.phone);
  const matchesEmail = normalizedEmail && orderEmail === normalizedEmail;
  const matchesPhone = normalizedPhone && orderPhone === normalizedPhone;

  if (!matchesEmail && !matchesPhone) {
    throw new Error("The email or phone number does not match this order.");
  }

  return order;
}

export async function fetchOrdersByIds(vendorSlug, orderIds) {
  requireFirebase();

  const uniqueOrderIds = [...new Set(orderIds.map((item) => String(item || "").trim()).filter(Boolean))];

  if (!uniqueOrderIds.length) {
    return [];
  }

  const snapshots = await Promise.all(uniqueOrderIds.map((orderId) => getDoc(doc(db, "orders", orderId))));

  return snapshots
    .filter((snapshot) => snapshot.exists())
    .map((snapshot) => ({ id: snapshot.id, ...snapshot.data() }))
    .filter((order) => order.vendorSlug === vendorSlug);
}

export async function findOrdersByContact({ vendorSlug, email, phone }) {
  requireFirebase();

  const trimmedEmail = String(email || "").trim();
  const trimmedPhone = String(phone || "").trim();
  const normalizedEmail = normalizeContactValue(trimmedEmail);
  const normalizedPhone = normalizePhoneValue(trimmedPhone);

  if (!normalizedEmail && !normalizedPhone) {
    throw new Error("Enter the email or phone number used during checkout.");
  }

  const lookups = [];

  if (normalizedEmail) {
    lookups.push(getDocs(query(collection(db, "users"), where("normalizedEmail", "==", normalizedEmail))));
    lookups.push(getDocs(query(collection(db, "users"), where("email", "==", trimmedEmail))));
  }

  if (normalizedPhone) {
    lookups.push(getDocs(query(collection(db, "users"), where("normalizedPhone", "==", normalizedPhone))));
    lookups.push(getDocs(query(collection(db, "users"), where("phone", "==", trimmedPhone))));
  }

  const userSnapshots = await Promise.all(lookups);
  const orderIds = [
    ...new Set(
      userSnapshots
        .flatMap((snapshot) => snapshot.docs.map((item) => item.data()))
        .filter((item) => item.vendorSlug === vendorSlug)
        .map((item) => item.orderId),
    ),
  ];

  if (!orderIds.length) {
    throw new Error("We could not find any orders for that email or phone number.");
  }

  const orders = await fetchOrdersByIds(vendorSlug, orderIds);

  return orders.sort((left, right) => {
    const leftTime = left.createdAt?.seconds ? left.createdAt.seconds * 1000 : new Date(left.createdAt || 0).getTime();
    const rightTime = right.createdAt?.seconds ? right.createdAt.seconds * 1000 : new Date(right.createdAt || 0).getTime();
    return rightTime - leftTime;
  });
}
