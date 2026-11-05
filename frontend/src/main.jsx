
import React from "react";
import ReactDOM from "react-dom/client";

import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import App from "./App";
import { AuthProvider } from "./context/AuthContext";

import "./index.css";
import "./App.css";

ReactDOM.createRoot(
  document.getElementById("root")
).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />

        <Toaster
          position="top-right"
          reverseOrder={false}
          gutter={10}
          toastOptions={{
            duration: 3500,
            style: {
              background: "#ffffff",
              color: "#1e293b",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "12px 16px",
              fontSize: "13px",
              fontWeight: 500,
              boxShadow: "0 8px 25px rgba(15, 23, 42, 0.10)",
              maxWidth: "420px",
            },
            success: {
              iconTheme: {
                primary: "#16a34a",
                secondary: "#ffffff",
              },
            },
            error: {
              iconTheme: {
                primary: "#dc2626",
                secondary: "#ffffff",
              },
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
