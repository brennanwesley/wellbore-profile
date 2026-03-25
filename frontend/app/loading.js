import RouteLoadingState from "@/components/RouteLoadingState";

export default function GlobalLoading() {
  return (
    <RouteLoadingState
      eyebrow="Loading Application"
      title="Preparing the wellbore viewer."
      description="We are loading the route shell, shared navigation, and workspace surface now."
    />
  );
}
