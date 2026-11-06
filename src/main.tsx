import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ServiceWorkerUpdate } from "./components/ServiceWorkerUpdate";
import "./style.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
    <ServiceWorkerUpdate />
  </React.StrictMode>,
);
