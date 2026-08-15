import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./i18n";
import "./index.css";
import { CustomerAuthProvider } from "./contexts/CustomerAuthContext";

const lang = localStorage.getItem("lang") || "ar";
document.documentElement.lang = lang;
document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <CustomerAuthProvider>
      <App />
    </CustomerAuthProvider>
  </React.StrictMode>
);
