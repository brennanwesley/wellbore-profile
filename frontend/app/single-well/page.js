import Link from "next/link";
import SingleWellWorkspace from "@/components/SingleWellWorkspace";

export default function SingleWellPage() {
  return (
    <>
      <div className="tool-floating-nav">
        <Link href="/workspace" className="tool-floating-nav-link">
          <span aria-hidden="true">←</span>
          <span>Back to Workspace</span>
        </Link>
      </div>
      <SingleWellWorkspace />
    </>
  );
}
