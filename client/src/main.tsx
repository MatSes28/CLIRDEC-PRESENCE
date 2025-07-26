import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Suppress Vite development WebSocket errors
const originalError = window.console.error;
window.console.error = (...args) => {
  const message = args.join(' ');
  if (message.includes('Failed to construct \'WebSocket\'') && 
      message.includes('localhost:undefined')) {
    // Skip Vite HMR WebSocket errors in development
    return;
  }
  originalError.apply(console, args);
};

createRoot(document.getElementById("root")!).render(<App />);
