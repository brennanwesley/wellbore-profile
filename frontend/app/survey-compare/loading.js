import RouteLoadingState from "@/components/RouteLoadingState";

export default function SurveyCompareLoading() {
  return (
    <RouteLoadingState
      currentPath="/survey-compare"
      eyebrow="Loading Survey Compare"
      title="Preparing the gyro vs. drilling survey comparison."
      description="We are loading the dual survey upload flow and side-by-side 3D viewers now."
    />
  );
}
