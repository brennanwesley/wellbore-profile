import RouteLoadingState from "@/components/RouteLoadingState";

export default function DsuViewLoading() {
  return (
    <RouteLoadingState
      currentPath="/dsu-view"
      eyebrow="Loading DSU View"
      title="Preparing the multi-well DSU workspace."
      description="We are loading the multi-well setup flow and 3D viewer surface now."
    />
  );
}
