import { Route, Routes } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import StoreShell from "./layouts/StoreShell";
import AdminPage from "./pages/AdminPage";
import CartPage from "./pages/CartPage";
import HomePage from "./pages/HomePage";
import ManageVendorsPage from "./pages/ManageVendorsPage";
import NotFoundPage from "./pages/NotFoundPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import ProductsPage from "./pages/ProductsPage";
import MyOrdersPage from "./pages/MyOrdersPage";
import TrackOrderPage from "./pages/TrackOrderPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<ManageVendorsPage />} />
      <Route path="/manage" element={<ManageVendorsPage />} />
      <Route
        path="/:vendorSlug"
        element={
          <AppProvider>
            <StoreShell />
          </AppProvider>
        }
      >
        <Route index element={<HomePage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="products/:productId" element={<ProductDetailPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="orders" element={<MyOrdersPage />} />
        <Route path="track" element={<TrackOrderPage />} />
        <Route path="admin" element={<AdminPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
