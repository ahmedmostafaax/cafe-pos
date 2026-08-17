import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import OrdersPage from "./pages/OrdersPage";
import MenuPage from "./pages/MenuPage";
import CategoriesPage from "./pages/CategoriesPage";
import KitchenPage from "./pages/KitchenPage";
import BarPage from "./pages/BarPage";
import TablesPage from "./pages/TablesPage";
import UsersPage from "./pages/UsersPage";
import OffersPage from "./pages/OffersPage";
import AttendancePage from "./pages/AttendancePage";
import CustomerMenu from "./pages/CustomerMenu";
import TrackOrder from "./pages/TrackOrder";
import TableView from "./pages/TableView";
import OnlineOrder from "./pages/OnlineOrder";
import CustomerLogin from "./pages/CustomerLogin";
import CustomerRegister from "./pages/CustomerRegister";
import ServiceCallsPage from "./pages/ServiceCallsPage";
import POS from "./pages/POS";
import CashPage from "./pages/CashPage";
import BusyModePage from "./pages/BusyModePage";
import AboutPage from "./pages/AboutPage";

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="text-white p-10">جاري التحميل...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const App = () => (
  <AuthProvider>
    <BrowserRouter>
      <Routes>
        {/* موقع المطعم والعملاء */}
        <Route path="/order" element={<OnlineOrder />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/customer-login" element={<CustomerLogin />} />
        <Route path="/customer-register" element={<CustomerRegister />} />
        <Route path="/track/:token" element={<TrackOrder />} />
        <Route path="/table/:tableNo" element={<CustomerMenu />} />

        {/* موظفين / كاشير / مدير */}
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="pos" element={<POS />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="kitchen" element={<KitchenPage />} />
          <Route path="bar" element={<BarPage />} />
          <Route path="cash" element={<CashPage />} />
          <Route path="menu" element={<MenuPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="tables" element={<TablesPage />} />
          <Route path="offers" element={<OffersPage />} />
          <Route path="attendance" element={<AttendancePage />} />
          <Route path="service-calls" element={<ServiceCallsPage />} />
          <Route path="busy-mode" element={<BusyModePage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="table-view/:tableNo" element={<TableView />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </AuthProvider>
);

export default App;
