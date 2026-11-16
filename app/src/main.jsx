import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { StateProvider } from "./state/AppState.jsx";
import { DataProvider } from "./data/DataProvider.jsx";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <StateProvider>
      <DataProvider>
        <App />
      </DataProvider>
    </StateProvider>
  </React.StrictMode>,
);
