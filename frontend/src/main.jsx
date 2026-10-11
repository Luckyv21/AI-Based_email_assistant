import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { EmailProvider } from "./context/EmailContext";
import "./styles/index.css";
import "./styles/message-fix.css";
import "./styles/auth.css";
import "./styles/dashboard.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <EmailProvider>
          <App />
        </EmailProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
