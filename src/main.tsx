import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

window.onerror = (msg, src, line, col, err) => {
  document.body.innerHTML = `<pre style="color:#ff6b6b;background:#1a1a1a;padding:20px;font-size:13px;white-space:pre-wrap">RENDER ERROR:\n${msg}\n${src}:${line}:${col}\n${err?.stack ?? ""}</pre>`;
};
window.addEventListener("unhandledrejection", (e) => {
  document.body.innerHTML = `<pre style="color:#ff6b6b;background:#1a1a1a;padding:20px;font-size:13px;white-space:pre-wrap">UNHANDLED PROMISE:\n${e.reason}</pre>`;
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
