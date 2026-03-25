import RouteLoadingState from "@/components/RouteLoadingState";

export default function WorkspaceLoading() {
  return (
    <RouteLoadingState
      currentPath="/workspace"
      eyebrow="Loading Workspace"
      title="Preparing your workspace choices."
      description="We are loading the viewer selection route so you can move into the right workflow."
    />
  );
}
