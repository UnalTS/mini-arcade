import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, HashRouter } from "react-router";
import "./index.css";
import App from "./App.tsx";

// GitHub Pages cannot serve client-side routes such as /sudoku directly.
const Router = import.meta.env.BASE_URL === "/" ? BrowserRouter : HashRouter;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Router>
      <App />
    </Router>
  </StrictMode>,
);
