import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Opened inside the ShuleCloud 360 phone app (?embed=1): the app shows its own
// navigation, so the web hides its sidebar and top bar for this tab.
try {
    if (new URLSearchParams(window.location.search).get("embed") === "1") sessionStorage.setItem("sc_embed", "1");
    if (sessionStorage.getItem("sc_embed") === "1") document.documentElement.classList.add("sc-embed");
} catch { /* storage blocked */ }

createRoot(document.getElementById("root")!).render(<App />);

// Installable app (PWA): the service worker makes ShuleCloud installable and keeps the app shell available offline.
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => { navigator.serviceWorker.register("/sw.js").catch(() => { /* not fatal */ }); });
}
