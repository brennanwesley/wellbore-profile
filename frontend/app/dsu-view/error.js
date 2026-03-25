"use client";

import RouteErrorState from "@/components/RouteErrorState";

export default function DsuViewError({ reset }) {
  return (
    <RouteErrorState
      currentPath="/dsu-view"
      reset={reset}
      title="We could not load the DSU workspace."
      description="Try the route again or move back to the workspace while the multi-well setup state reloads."
    />
  );
}
