import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Service worker : uniquement nécessaire pour les notifications push (voir public/sw.js) —
// l'installation sur l'écran d'accueil (PWA) fonctionne déjà sans lui via le manifest.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => { /* pas bloquant */ });
  });
}
