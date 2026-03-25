"use client";

import Link from "next/link";

export default function GlobalError({ reset }) {
  return (
    <main className="route-fallback-page">
      <section className="route-fallback-shell">
        <p className="route-fallback-eyebrow">Something Went Wrong</p>
        <h1 className="route-fallback-title">We hit an unexpected error.</h1>
        <p className="route-fallback-description">
          Try the route again or return to a stable page in the app. This fallback prevents the blank-screen failure
          mode while the feature set grows.
        </p>
        <div className="route-fallback-actions">
          <button type="button" className="landing-primary-link route-fallback-button" onClick={() => reset()}>
            <span>Try Again</span>
            <span className="landing-primary-link-arrow" aria-hidden="true">
              ↻
            </span>
          </button>
          <Link href="/workspace" className="workspace-card-link workspace-card-link-secondary">
            <span>Open Workspace</span>
            <span aria-hidden="true">→</span>
          </Link>
          <Link href="/" className="workspace-card-link workspace-card-link-secondary">
            <span>Public Home</span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
