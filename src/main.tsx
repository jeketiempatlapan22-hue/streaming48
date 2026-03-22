import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Security guard - only in production
if (import.meta.env.PROD) {
  import("./lib/security").then(({ initSecurityGuard }) => {
    initSecurityGuard();
  });
}

createRoot(document.getElementById("root")!).render(<App />);

