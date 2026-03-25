import AppRouteNav from "@/components/AppRouteNav";

export default function RouteLoadingState({
  currentPath,
  eyebrow = "Loading Route",
  title = "Preparing this workspace.",
  description = "We are assembling the route shell, navigation state, and viewer surface now.",
}) {
  return (
    <main className="route-fallback-page loading-state-page">
      <section className="route-fallback-shell loading-state-shell">
        {currentPath ? <AppRouteNav currentPath={currentPath} /> : null}
        <div className="loading-state-indicator" aria-hidden="true">
          <span className="loading-state-spinner" />
          <span className="loading-state-progress" />
        </div>
        <p className="route-fallback-eyebrow">{eyebrow}</p>
        <h1 className="route-fallback-title">{title}</h1>
        <p className="route-fallback-description">{description}</p>
      </section>
    </main>
  );
}
