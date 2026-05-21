/**
 * App.jsx — POS System Root App (v5 · Design A · Trattoria)
 * 仅含路由 shell。AppProvider 与对话框、ToastBridge 抽到 providers/AppProvider。
 */
import "./index.css";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import TablePage from "./pages/TablePage";
import LoginPage from "./pages/LoginPage";
import FrontPanel from "./pages/FrontPanel";
import PadOrderPanel from "./pages/PadOrderPanel";
import StationPanel from "./pages/StationPanel";
import CommissionReportPanel from "./pages/CommissionReportPanel";
import AdminPanel from "./pages/AdminPanel";
import AdminPhonePage from "./pages/AdminPhonePage";
import TopBar from "./components/TopBar";
import AppProvider, { ToastBridge } from "./providers/AppProvider";
import { useApp } from "./hooks/useApp";
import { ROLE_PATHS } from "./lib/constants";

function ProtectedRoute({ roles, redirect = "/login", children }) {
  const { user, authBootstrapReady } = useApp();
  const location = useLocation();
  if (!authBootstrapReady) return null;
  if (!user) return <Navigate to={redirect} state={{ from: location }} replace />;
  if (roles && !roles.some((role) => user.roles.includes(role))) return <Navigate to={ROLE_PATHS[user.roles[0]]} replace />;
  return children;
}

function RouterCore() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage variant="main" />} />
        <Route path="/pad/login" element={<LoginPage variant="pad" />} />
        <Route path="/adminphone/login" element={<LoginPage variant="phone" />} />
        <Route path="/front" element={<ProtectedRoute roles={["front"]}><TopBar /><FrontPanel /></ProtectedRoute>} />
        <Route path="/kitchen" element={<ProtectedRoute roles={["kitchen"]}><TopBar /><StationPanel type="kitchen" /></ProtectedRoute>} />
        <Route path="/bar" element={<ProtectedRoute roles={["bar"]}><TopBar /><StationPanel type="bar" /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute roles={["admin"]}><TopBar /><AdminPanel /></ProtectedRoute>} />
        <Route path="/adminphone" element={<ProtectedRoute roles={["admin"]} redirect="/adminphone/login"><AdminPhonePage /></ProtectedRoute>} />
        <Route path="/commission" element={<ProtectedRoute roles={["front", "kitchen", "bar", "admin"]}><TopBar /><div className="commission-page"><CommissionReportPanel /></div></ProtectedRoute>} />
        <Route path="/pad" element={<ProtectedRoute roles={["front", "admin"]} redirect="/pad/login"><TopBar variant="pad" /><PadOrderPanel /></ProtectedRoute>} />
        <Route path="/table/:id" element={<TablePage />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      <ToastBridge />
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <RouterCore />
      </BrowserRouter>
    </AppProvider>
  );
}
