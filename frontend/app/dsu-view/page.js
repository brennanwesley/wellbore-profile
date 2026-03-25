import Link from "next/link";
import AppRouteNav from "@/components/AppRouteNav";

export default function DsuViewPage() {
  return (
    <main className="tool-empty-page">
      <section className="tool-empty-shell">
        <AppRouteNav currentPath="/dsu-view" />
        <p className="tool-empty-eyebrow">Multi-Well DSU Viewer</p>
        <h1 className="tool-empty-title">This workspace is ready for the next build step.</h1>
        <p className="tool-empty-description">
          The DSU route is now live so users can navigate here cleanly, and the next implementation step will turn this
          into the multi-well 3D workflow with surface coordinate inputs, per-well survey uploads, and proximity-aware
          setup guidance.
        </p>
        <div className="tool-empty-actions">
          <Link href="/workspace" className="landing-primary-link">
            <span>Return to Workspace</span>
            <span className="landing-primary-link-arrow" aria-hidden="true">
              →
            </span>
          </Link>
          <Link href="/single-well" className="workspace-card-link workspace-card-link-secondary">
            <span>Open Single Well Viewer</span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
