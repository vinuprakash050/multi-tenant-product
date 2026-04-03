import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { demoOrders, demoProducts, demoVendors } from '../data/demoData';
import { createOrder, fetchCollection, updateOrder } from '../lib/firebase';

const StoreContext = createContext(null);

function normalizeProducts(products, vendors) {
  return products.map((product) => ({
    ...product,
    vendorName: product.vendorName || vendors.find((vendor) => vendor.id === product.vendorId)?.name || 'Vendor',
  }));
}

export function StoreProvider({ children }) {
  const [vendors, setVendors] = useState(demoVendors);
  const [allProducts, setAllProducts] = useState(demoProducts);
  const [orders, setOrders] = useState(demoOrders);
  const [selectedVendor, setSelectedVendor] = useState(demoVendors[0].id);
  const [cart, setCart] = useState([]);
  const [placingOrder, setPlacingOrder] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [vendorData, productData, orderData] = await Promise.all([
          fetchCollection('vendors'),
          fetchCollection('products'),
          fetchCollection('orders'),
        ]);

        if (vendorData.length) {
          setVendors(vendorData);
          setSelectedVendor(vendorData[0].id);
        }

        if (productData.length) {
          setAllProducts(normalizeProducts(productData, vendorData.length ? vendorData : demoVendors));
        }

        if (orderData.length) {
          setOrders(orderData);
        }
      } catch (error) {
        console.warn('Using demo data because Firebase is not configured or reachable.', error);
      }
    }

    loadData();
  }, []);

  const currentVendor = useMemo(
    () => vendors.find((vendor) => vendor.id === selectedVendor) || vendors[0],
    [vendors, selectedVendor],
  );

  const filteredProducts = useMemo(
    () => allProducts.filter((product) => product.vendorId === selectedVendor),
    [allProducts, selectedVendor],
  );

  const featuredProducts = useMemo(
    () => filteredProducts.filter((product) => product.featured).slice(0, 3),
    [filteredProducts],
  );

  const stats = useMemo(
    () => ({
      productCount: filteredProducts.length,
      orderCount: orders.filter((order) => order.vendorId === selectedVendor).length,
      pendingCount: orders.filter(
        (order) => order.vendorId === selectedVendor && order.status === 'pending-payment',
      ).length,
    }),
    [filteredProducts.length, orders, selectedVendor],
  );

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);

      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }

      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateCartQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((item) => item.id !== productId));
      return;
    }

    setCart((prev) =>
      prev.map((item) => (item.id === productId ? { ...item, quantity } : item)),
    );
  };

  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((item) => item.id !== productId));
  };

  const placeOrder = async (customer) => {
    setPlacingOrder(true);

    try {
      const order = {
        vendorId: selectedVendor,
        customer,
        items: cart.map(({ id, name, quantity, price }) => ({ id, name, quantity, price })),
        total: cart.reduce((sum, item) => sum + item.quantity * item.price, 0),
        status: 'pending-payment',
      };

      const createdId = await createOrder(order);
      const nextOrder = { ...order, id: createdId };
      setOrders((prev) => [nextOrder, ...prev]);
      setCart([]);
      return { ok: true };
    } catch (error) {
      const offlineOrder = {
        id: `ORD-${Date.now()}`,
        vendorId: selectedVendor,
        customer,
        items: cart.map(({ id, name, quantity, price }) => ({ id, name, quantity, price })),
        total: cart.reduce((sum, item) => sum + item.quantity * item.price, 0),
        status: 'pending-payment',
      };

      setOrders((prev) => [offlineOrder, ...prev]);
      setCart([]);
      return { ok: true, fallback: true, error };
    } finally {
      setPlacingOrder(false);
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    const previousOrders = orders;
    setOrders((prev) => prev.map((order) => (order.id === orderId ? { ...order, status } : order)));

    try {
      await updateOrder(orderId, { status });
    } catch (error) {
      console.warn('Order status updated locally only.', error);
      setOrders(previousOrders);
      setOrders((prev) => prev.map((order) => (order.id === orderId ? { ...order, status } : order)));
    }
  };

  const value = {
    vendors,
    selectedVendor,
    setSelectedVendor,
    currentVendor,
    allProducts,
    filteredProducts,
    featuredProducts,
    cart,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    orders,
    updateOrderStatus,
    placeOrder,
    placingOrder,
    stats,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used inside StoreProvider');
  }

  return context;
}
