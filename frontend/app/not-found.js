import Link from "next/link";

export default function NotFound() {
  return (
    <main className="route-fallback-page">
      <section className="route-fallback-shell">
        <p className="route-fallback-eyebrow">Page Not Found</p>
        <h1 className="route-fallback-title">This page does not exist.</h1>
        <p className="route-fallback-description">
          The route you tried to open is not available. Use one of the links below to get back into the viewer
          experience.
        </p>
        <div className="route-fallback-actions">
          <Link href="/" className="landing-primary-link">
            <span>Public Home</span>
            <span className="landing-primary-link-arrow" aria-hidden="true">
              →
            </span>
          </Link>
          <Link href="/workspace" className="workspace-card-link workspace-card-link-secondary">
            <span>Open Workspace</span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
