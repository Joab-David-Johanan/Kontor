"use client";

// Client component: it needs usePathname(), which only works in the browser,
// to highlight the link of the page you're on.

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home", adminOnly: false },
  { href: "/conversations", label: "Tickets", adminOnly: false },
  { href: "/dashboard", label: "Dashboard", adminOnly: false },
  { href: "/security", label: "Security", adminOnly: true },
  { href: "/support", label: "Support", adminOnly: false },
];

// isAdmin only hides links for convenience; the API refuses non-admins anyway.
export function NavLinks({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname(); // e.g. "/dashboard"
  const visible = links.filter((link) => isAdmin || !link.adminOnly);

  return (
    <nav aria-label="Main" className="flex flex-wrap gap-1">
      {visible.map((link) => {
        // "/" must match exactly; the others also match their sub-pages later
        // (e.g. /conversations/c-1001).
        const active =
          link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              active
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
