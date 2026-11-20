"use client";

import RouteErrorState from "@/components/RouteErrorState";

export default function SurveyCompareError({ reset }) {
  return (
    <RouteErrorState
      currentPath="/survey-compare"
      reset={reset}
      title="We could not load the survey comparison workspace."
      description="Try the route again or move back to the workspace while the comparison state reloads."
    />
  );
}
