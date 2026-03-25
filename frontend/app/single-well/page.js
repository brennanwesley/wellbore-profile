import AppRouteNav from "@/components/AppRouteNav";
import SingleWellWorkspace from "@/components/SingleWellWorkspace";

export default function SingleWellPage() {
  return (
    <>
      <AppRouteNav currentPath="/single-well" variant="floating" />
      <SingleWellWorkspace />
    </>
  );
}
