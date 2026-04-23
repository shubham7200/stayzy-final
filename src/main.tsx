import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerSW } from "virtual:pwa-register";

registerSW({ immediate: true });

const rootEl = document.getElementById("root");

if (rootEl) {
  try {
    createRoot(rootEl).render(<App />);
  } catch (err) {
    console.error("[Stayzy] Critical render error:", err);
    rootEl.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#666"><p>Configuration error. Please try again later.</p></div>';
  }
} else {
  console.error("[Stayzy] Root element not found");
}
