"use client";

import Link from "next/link";
import AppRouteNav from "@/components/AppRouteNav";

export default function RouteErrorState({
  currentPath,
  reset,
  eyebrow = "Something Went Wrong",
  title = "We hit an unexpected route error.",
  description = "Try this route again or move to a stable page in the app.",
}) {
  return (
    <main className="route-fallback-page">
      <section className="route-fallback-shell">
        {currentPath ? <AppRouteNav currentPath={currentPath} /> : null}
        <p className="route-fallback-eyebrow">{eyebrow}</p>
        <h1 className="route-fallback-title">{title}</h1>
        <p className="route-fallback-description">{description}</p>
        <div className="route-fallback-actions">
          <button type="button" className="landing-primary-link route-fallback-button" onClick={() => reset?.()}>
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
