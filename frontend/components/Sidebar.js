'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Dashboard", href: "/" },
  { label: "Cases", href: "/cases" },
  { label: "Campaigns", href: "/campaigns" },
  { label: "Reports", href: "/reports" },
  { label: "Settings", href: "#" },
];

function NavIcon({ name }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  if (name === "Dashboard") {
    return (
      <svg {...common}>
        <rect x="3" y="3" width="7" height="9" rx="1" />
        <rect x="14" y="3" width="7" height="5" rx="1" />
        <rect x="14" y="12" width="7" height="9" rx="1" />
        <rect x="3" y="16" width="7" height="5" rx="1" />
      </svg>
    );
  }

  if (name === "Cases") {
    return (
      <svg {...common}>
        <path d="M9 3h6l1 3h4v14H4V6h4z" />
      </svg>
    );
  }

  if (name === "Campaigns") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
      </svg>
    );
  }

  if (name === "Reports") {
    return (
      <svg {...common}>
        <path d="M6 3h9l5 5v13H6z" />
        <path d="M15 3v5h5M8 13h8M8 17h5" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

import SidebarProfile from "./SidebarProfile";

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-screen w-[220px] shrink-0 flex-col justify-between border-r border-edge bg-surface px-4 py-5">
      <div>
        <Link
          href="/"
          className="mb-8 block text-sm font-semibold tracking-wide text-ink hover:text-accent transition-colors"
        >
          Email Forensics
        </Link>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive =
              (item.label === "Dashboard" && pathname === "/") ||
              (item.label === "Cases" && (pathname === "/cases" || pathname?.startsWith("/cases/"))) ||
              (item.label === "Reports" && (pathname === "/reports" || pathname?.startsWith("/reports/"))) ||
              (item.label === "Campaigns" && (pathname === "/campaigns" || pathname?.startsWith("/campaigns/")));

            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-canvas text-accent"
                    : "text-dim hover:bg-canvas/50 hover:text-ink"
                }`}
              >
                <NavIcon name={item.label} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="pt-4 border-t border-edge/60">
        <SidebarProfile />
      </div>
    </aside>
  );
}
