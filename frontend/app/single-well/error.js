"use client";

import RouteErrorState from "@/components/RouteErrorState";

export default function SingleWellError({ reset }) {
  return (
    <RouteErrorState
      currentPath="/single-well"
      reset={reset}
      title="We could not load the single-well viewer."
      description="Try the route again or move back to the workspace while the viewer state resets."
    />
  );
}
