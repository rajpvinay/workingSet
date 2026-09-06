import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import WorkingSet from "./WorkingSet.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <WorkingSet />
  </StrictMode>
);
