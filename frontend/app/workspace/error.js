"use client";

import RouteErrorState from "@/components/RouteErrorState";

export default function WorkspaceError({ reset }) {
  return (
    <RouteErrorState
      currentPath="/workspace"
      reset={reset}
      title="We could not load the workspace selector."
      description="Try the route again or return to a stable page while the workspace surface reloads."
    />
  );
}
