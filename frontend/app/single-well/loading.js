import RouteLoadingState from "@/components/RouteLoadingState";

export default function SingleWellLoading() {
  return (
    <RouteLoadingState
      currentPath="/single-well"
      eyebrow="Loading Single-Well Viewer"
      title="Preparing the single-well workspace."
      description="We are loading the survey controls and viewer panes now."
    />
  );
}
