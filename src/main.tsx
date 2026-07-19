import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LangProvider } from "@/contexts/LangContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { initVersionCheck } from "@/lib/versionCheck";

// Ескі кэштелген бундлды автоматты жаңарту (iOS Safari кэш мәселесі)
initVersionCheck();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <LangProvider>
        <AuthProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </AuthProvider>
      </LangProvider>
    </ThemeProvider>
  </StrictMode>
);
