import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { DebugApp } from "./ui/DebugApp";

if (typeof document !== "undefined") {
  const rootElement = document.getElementById("root");
  if (rootElement) {
    createRoot(rootElement).render(
      <StrictMode>
        <DebugApp />
      </StrictMode>,
    );
  }
}
