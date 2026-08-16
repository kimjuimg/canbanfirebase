import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./firebase";
import App from "./App.tsx";
import { CurrentUserProvider } from "./context/CurrentUserContext";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <CurrentUserProvider>
      <App />
    </CurrentUserProvider>
  </StrictMode>,
);
