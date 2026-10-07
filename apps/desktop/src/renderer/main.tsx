import { Component, StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import "./styles.css";

class AppErrorBoundary extends Component<
  { readonly children: ReactNode },
  { readonly failed: boolean }
> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override render() {
    if (this.state.failed) {
      return (
        <main className="workspace-status" role="alert">
          <p className="eyebrow">Stave needs a fresh start</p>
          <h1>We couldn't display your workspace.</h1>
          <p>Reload the workspace to try again.</p>
          <button
            className="button button--primary"
            type="button"
            onClick={() => window.location.reload()}
          >
            Reload workspace
          </button>
        </main>
      );
    }
    return this.props.children;
  }
}

const root = document.getElementById("root");

if (!root) {
  throw new Error("Stave renderer root was not found");
}

createRoot(root).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
);
