"use client";

import RouteErrorState from "@/components/RouteErrorState";

export default function GlobalError({ reset }) {
  return <RouteErrorState reset={reset} title="We hit an unexpected error." description="Try the route again or return to a stable page in the app. This fallback prevents the blank-screen failure mode while the feature set grows." />;
}
