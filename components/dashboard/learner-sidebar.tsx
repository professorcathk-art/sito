"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

export interface LearnerNavItem {
  name: string;
  href: string;
  icon: string;
  match?: (pathname: string, search: string) => boolean;
}

export const LEARNER_NAV_ITEMS: LearnerNavItem[] = [
  {
    name: "My Courses",
    href: "/dashboard/learning",
    icon: "📚",
    match: (p) => p === "/dashboard/learning" || p.startsWith("/learn/"),
  },
  {
    name: "My Bookings",
    href: "/dashboard/learning/bookings",
    icon: "📅",
    match: (p, s) =>
      p.startsWith("/dashboard/learning/bookings") ||
      p.startsWith("/dashboard/my-bookings") ||
      (p.startsWith("/appointments/manage") && s.includes("tab=my-bookings")),
  },
  {
    name: "Subscriptions & Saved",
    href: "/dashboard/learning/subscriptions",
    icon: "⭐",
    match: (p) =>
      p.startsWith("/dashboard/learning/subscriptions") ||
      p === "/subscriptions" ||
      p.startsWith("/blog/watch-later"),
  },
  {
    name: "Purchase History",
    href: "/dashboard/learning/history",
    icon: "🧾",
    match: (p) =>
      p.startsWith("/dashboard/learning/history") || p.startsWith("/dashboard/purchases"),
  },
];

function isActive(
  pathname: string,
  href: string,
  search: string,
  match?: LearnerNavItem["match"]
) {
  if (match) return match(pathname, search);
  if (pathname === href) return true;
  if (href !== "/" && pathname.startsWith(href + "/")) return true;
  return false;
}

interface LearnerSidebarProps {
  onClose?: () => void;
  footer?: React.ReactNode;
}

export function LearnerSidebar({ onClose, footer }: LearnerSidebarProps) {
  const pathname = usePathname() || "";
  const searchParams = useSearchParams();
  const search = searchParams?.toString() || "";

  return (
    <div className="space-y-0.5">
      <div className="mb-2 px-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          My Learning
        </h3>
      </div>
      {LEARNER_NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href, search, item.match);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => onClose?.()}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all ${
              active
                ? "bg-slate-100 text-slate-950 font-semibold shadow-sm"
                : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
            }`}
          >
            <span aria-hidden className="text-base leading-none">
              {item.icon}
            </span>
            <span className="flex-1 truncate">{item.name}</span>
          </Link>
        );
      })}
      {footer}
    </div>
  );
}
