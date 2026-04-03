import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  createBooking,
  createBookingResource,
  createOrder,
  createProduct,
  subscribeBookingResources,
  subscribeProducts,
  subscribeVendor,
  subscribeToOrders,
  updateBookingResource,
  updateOrderStatus,
} from "../services/storeService";

const CART_STORAGE_KEY = "mv_cart";

const AppContext = createContext(null);

function readCart() {
  return JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) || "[]");
}

function writeCart(cart) {
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
}

export function AppProvider({ children }) {
  const { vendorSlug } = useParams();
  const [vendor, setVendor] = useState(null);
  const [products, setProducts] = useState([]);
  const [bookingResources, setBookingResources] = useState([]);
  const [orders, setOrders] = useState([]);
  const [cart, setCart] = useState(readCart);
  const [isLoadingVendor, setIsLoadingVendor] = useState(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isLoadingBookingResources, setIsLoadingBookingResources] = useState(true);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [firebaseMessage, setFirebaseMessage] = useState("");

  useEffect(() => {
    setIsLoadingVendor(true);
    setFirebaseMessage("");

    const unsubscribe = subscribeVendor(
      vendorSlug,
      (nextVendor) => {
        setVendor(nextVendor);
        setIsLoadingVendor(false);
      },
      (error) => {
        setVendor(null);
        setFirebaseMessage(error.message);
        setIsLoadingVendor(false);
      },
    );

    return unsubscribe;
  }, [vendorSlug]);

  useEffect(() => {
    if (!vendorSlug) {
      setBookingResources([]);
      return () => {};
    }

    setIsLoadingBookingResources(true);
    const unsubscribe = subscribeBookingResources(
      vendorSlug,
      (items) => {
        setBookingResources(items);
        setIsLoadingBookingResources(false);
      },
      (error) => {
        setBookingResources([]);
        setFirebaseMessage(error.message);
        setIsLoadingBookingResources(false);
      },
    );

    return unsubscribe;
  }, [vendorSlug]);

  useEffect(() => {
    if (!vendorSlug) {
      setProducts([]);
      return () => {};
    }

    setIsLoadingProducts(true);
    const unsubscribe = subscribeProducts(
      vendorSlug,
      (items) => {
        setProducts(items);
        setIsLoadingProducts(false);
      },
      (error) => {
        setProducts([]);
        setFirebaseMessage(error.message);
        setIsLoadingProducts(false);
      },
    );

    return unsubscribe;
  }, [vendorSlug]);

  useEffect(() => {
    if (!vendorSlug) {
      setOrders([]);
      return () => {};
    }

    const unsubscribe = subscribeToOrders(
      vendorSlug,
      setOrders,
      (error) => {
        setOrders([]);
        setFirebaseMessage(error.message);
      },
    );
    return unsubscribe;
  }, [vendorSlug]);

  useEffect(() => {
    writeCart(cart);
  }, [cart]);

  function addToCart(product) {
    setCart((currentCart) => {
      const existing = currentCart.find((item) => item.id === product.id && item.vendorSlug === vendor.slug);

      if (existing) {
        return currentCart.map((item) =>
          item.id === product.id && item.vendorSlug === vendor.slug
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }

      return [...currentCart, { ...product, vendorSlug: vendor.slug, quantity: 1 }];
    });
  }

  function updateCartItem(productId, quantity) {
    setCart((currentCart) =>
      currentCart
        .map((item) =>
          item.id === productId && item.vendorSlug === vendor.slug ? { ...item, quantity } : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }

  function clearCart() {
    setCart([]);
  }

  async function placeOrder(customer) {
    setIsPlacingOrder(true);

    const vendorCart = cart.filter((item) => item.vendorSlug === vendor.slug);
    const totalAmount = vendorCart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    try {
      setFirebaseMessage("");
      const order = await createOrder({
        vendorSlug: vendor.slug,
        cartItems: vendorCart,
        customer,
        totalAmount,
      });

      setCart((currentCart) => currentCart.filter((item) => item.vendorSlug !== vendor.slug));
      return order;
    } catch (error) {
      setFirebaseMessage(error.message);
      throw error;
    } finally {
      setIsPlacingOrder(false);
    }
  }

  async function addProductForVendor(product) {
    setFirebaseMessage("");
    return createProduct({
      ...product,
      vendorSlug,
      vendorName: vendor?.name || "",
    });
  }

  async function addBookingResourceForVendor(resource) {
    setFirebaseMessage("");
    return createBookingResource({
      ...resource,
      vendorSlug,
      vendorName: vendor?.name || "",
    });
  }

  async function updateBookingResourceForVendor(resourceId, values) {
    setFirebaseMessage("");
    return updateBookingResource(resourceId, values);
  }

  async function placeBookingRequest(customer, bookingDetails) {
    setIsPlacingOrder(true);

    try {
      setFirebaseMessage("");
      const booking = await createBooking({
        vendorSlug: vendor.slug,
        customer,
        bookingDetails,
      });

      return booking;
    } catch (error) {
      setFirebaseMessage(error.message);
      throw error;
    } finally {
      setIsPlacingOrder(false);
    }
  }

  const vendorMode = vendor?.businessModel || "commerce";

  const value = useMemo(
    () => ({
      vendor,
      vendorMode,
      vendorSlug,
      products,
      bookingResources,
      orders,
      cart,
      isLoadingVendor,
      isLoadingProducts,
      isLoadingBookingResources,
      isPlacingOrder,
      firebaseMessage,
      addToCart,
      updateCartItem,
      clearCart,
      placeOrder,
      placeBookingRequest,
      updateOrderStatus,
      addProductForVendor,
      addBookingResourceForVendor,
      updateBookingResourceForVendor,
    }),
    [
      vendor,
      vendorMode,
      vendorSlug,
      products,
      bookingResources,
      orders,
      cart,
      isLoadingVendor,
      isLoadingProducts,
      isLoadingBookingResources,
      isPlacingOrder,
      firebaseMessage,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error("useAppContext must be used within AppProvider");
  }

  return context;
}
