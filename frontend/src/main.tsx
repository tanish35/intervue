import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import axios from "axios";

// Configure axios defaults
axios.defaults.baseURL = "http://localhost:3000";
axios.defaults.withCredentials = true;

// Render React application
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
