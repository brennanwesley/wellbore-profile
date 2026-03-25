import Link from "next/link";

const NAV_ITEMS = [
  { href: "/", label: "Public Home" },
  { href: "/workspace", label: "Workspace" },
  { href: "/single-well", label: "Single Well" },
  { href: "/dsu-view", label: "DSU View" },
];

export default function AppRouteNav({ currentPath, variant = "inline" }) {
  return (
    <nav className={`app-route-nav app-route-nav-${variant}`} aria-label="Application navigation">
      {NAV_ITEMS.map((item) => {
        const isActive = item.href === currentPath;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`app-route-nav-link ${isActive ? "is-active" : ""}`}
            aria-current={isActive ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
