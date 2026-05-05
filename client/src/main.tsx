import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { ConvexShell } from "./lib/convex";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ConvexShell>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ConvexShell>
  </React.StrictMode>
);
