"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useDashboardMode } from "@/contexts/dashboard-mode-context";
import { createClient } from "@/lib/supabase/client";
import { useState, useEffect } from "react";
import { LearnerSidebar } from "@/components/dashboard/learner-sidebar";

interface NavLink {
  name: string;
  href: string;
  badge?: number;
  match?: (pathname: string, search: string) => boolean;
}

interface NavSection {
  id: string;
  title: string;
  icon: string;
  items: NavLink[];
}

interface DashboardSidebarProps {
  onClose?: () => void;
}

function linkActive(pathname: string, href: string, search: string, match?: NavLink["match"]) {
  if (match) return match(pathname, search);
  if (pathname === href) return true;
  if (href.includes("?")) {
    const [path, query] = href.split("?");
    return pathname === path && search.includes(query);
  }
  // Hub detail pages should highlight their section root
  if (href !== "/" && pathname.startsWith(href + "/")) return true;
  return false;
}

export function DashboardSidebar({ onClose }: DashboardSidebarProps) {
  const pathname = usePathname() || "";
  const searchParams = useSearchParams();
  const search = searchParams?.toString() || "";
  const { user } = useAuth();
  const { mode, setMode, isCreator } = useDashboardMode();
  const supabase = createClient();

  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingConnections, setPendingConnections] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function fetchCounts() {
      if (!user) return;
      try {
        const [messagesRes, connectionsRes] = await Promise.all([
          supabase
            .from("messages")
            .select("*", { count: "exact", head: true })
            .eq("to_id", user.id)
            .eq("read", false),
          supabase
            .from("connections")
            .select("*", { count: "exact", head: true })
            .eq("expert_id", user.id)
            .eq("status", "pending"),
        ]);
        setUnreadCount(messagesRes.count || 0);
        setPendingConnections(connectionsRes.count || 0);
      } catch (error) {
        console.error("Error fetching counts:", error);
      }
    }
    fetchCounts();
  }, [user, supabase]);

  useEffect(() => {
    if (pathname.startsWith("/dashboard/learning") || pathname.startsWith("/learn/")) {
      setMode("learner");
    }
  }, [pathname, setMode]);

  useEffect(() => {
    async function checkProfile() {
      if (!user) return;
      try {
        const { data } = await supabase
          .from("profiles")
          .select("is_admin, user_intention")
          .eq("id", user.id)
          .single();
        setIsAdmin(data?.is_admin === true);
        if (data?.user_intention === "learn" && !localStorage.getItem("sito_dashboard_mode")) {
          setMode("learner");
        }
      } catch (error) {
        console.error("Error checking profile:", error);
      }
    }
    checkProfile();
  }, [user, supabase, pathname, setMode]);

  const creatorSections: NavSection[] = [
    {
      id: "storefront",
      title: "Storefront",
      icon: "🎨",
      items: [
        {
          name: "Profile & Storefront",
          href: "/dashboard/storefront",
          match: (p, s) =>
            p.startsWith("/dashboard/storefront") &&
            p !== "/dashboard/storefront/theme" &&
            !s.includes("tab=design") &&
            !s.includes("tab=blocks"),
        },
        {
          name: "Theme & Design",
          href: "/dashboard/storefront/theme",
          match: (p, s) =>
            p === "/dashboard/storefront/theme" ||
            (p.startsWith("/dashboard/storefront") && s.includes("tab=design")),
        },
        {
          name: "Section Blocks",
          href: "/dashboard/storefront?tab=blocks",
          match: (p, s) =>
            p.startsWith("/dashboard/storefront") && s.includes("tab=blocks"),
        },
      ],
    },
    {
      id: "products",
      title: "Products",
      icon: "📦",
      items: [
        {
          name: "Overview",
          href: "/dashboard/products",
          match: (p) => p === "/dashboard/products" || p === "/products",
        },
        {
          name: "e-Learning",
          href: "/dashboard/elearning",
          match: (p) => p.startsWith("/dashboard/elearning"),
        },
        {
          name: "Appointments",
          href: "/dashboard/appointments",
          match: (p) => p.startsWith("/dashboard/appointments"),
        },
      ],
    },
    {
      id: "leads",
      title: "Leads & Marketing",
      icon: "🎯",
      items: [
        {
          name: "Lead Magnets & Leads",
          href: "/dashboard/leads",
          match: (p) => p.startsWith("/dashboard/leads"),
        },
        {
          name: "Sharing Posts",
          href: "/dashboard/posts",
          match: (p) => p.startsWith("/dashboard/posts") || p.startsWith("/dashboard/blog"),
        },
      ],
    },
    {
      id: "earnings",
      title: "Earnings & Payouts",
      icon: "💳",
      items: [
        {
          name: "Sales & Balance",
          href: "/dashboard/finance/sales",
          match: (p, s) =>
            p.startsWith("/dashboard/finance/sales") ||
            p.startsWith("/dashboard/finance/balance") ||
            (p.startsWith("/dashboard/earnings") && (s.includes("tab=sales") || s.includes("tab=balance") || !s.includes("tab="))),
        },
        {
          name: "Payout Settings",
          href: "/dashboard/finance/payouts",
          match: (p, s) =>
            p.startsWith("/dashboard/finance/payouts") ||
            p.startsWith("/dashboard/stripe-connect") ||
            (p.startsWith("/dashboard/earnings") && s.includes("tab=payouts")),
        },
        {
          name: "Billing & Plan",
          href: "/dashboard/billing",
          match: (p) => p.startsWith("/dashboard/billing"),
        },
      ],
    },
  ];

  const sharedCreatorFooter: NavLink[] = [
    {
      name: "Messages",
      href: "/messages",
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
    {
      name: "Connections",
      href: "/connections",
      badge: pendingConnections > 0 ? pendingConnections : undefined,
    },
    ...(isAdmin ? [{ name: "Admin", href: "/admin" }] : []),
  ];

  return (
    <aside className="flex h-[calc(100vh-4rem)] w-64 flex-col border-r border-slate-800/80 bg-slate-950 pt-20 md:pt-6 pb-6 overflow-y-auto">
      <div className="px-3 mb-4">
        <div className="grid grid-cols-2 gap-1 rounded-xl border border-slate-800 bg-slate-900/80 p-1">
          <button
            type="button"
            onClick={() => setMode("creator")}
            className={`rounded-lg px-2 py-2 text-xs font-semibold transition-all ${
              mode === "creator" ? "bg-white text-slate-950 shadow-sm" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Creator Studio
          </button>
          <button
            type="button"
            onClick={() => setMode("learner")}
            className={`rounded-lg px-2 py-2 text-xs font-semibold transition-all ${
              mode === "learner" ? "bg-white text-slate-950 shadow-sm" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            My Learning
          </button>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-5">
        {isCreator ? (
          <>
            {creatorSections.map((section) => (
              <div key={section.id}>
                <div className="mb-2 flex items-center gap-2 px-2">
                  <span className="text-sm" aria-hidden>
                    {section.icon}
                  </span>
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {section.title}
                  </h3>
                </div>
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const active = linkActive(pathname, item.href, search, item.match);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => onClose?.()}
                        className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all ${
                          active
                            ? "bg-slate-100 text-slate-950 font-semibold shadow-sm"
                            : "text-slate-400 hover:bg-slate-900 hover:text-slate-100 border border-transparent"
                        }`}
                      >
                        <span className="flex-1 truncate">{item.name}</span>
                        {item.badge ? (
                          <span className="min-w-[1.25rem] rounded-full bg-sky-500 px-1.5 py-0.5 text-center text-[10px] font-bold text-white">
                            {item.badge}
                          </span>
                        ) : null}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
            <div className="border-t border-slate-800 pt-4 space-y-0.5">
              {sharedCreatorFooter.map((item) => {
                const active = linkActive(pathname, item.href, search, item.match);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => onClose?.()}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all ${
                      active
                        ? "bg-slate-100 text-slate-950 font-semibold"
                        : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
                    }`}
                  >
                    <span className="flex-1 truncate">{item.name}</span>
                    {item.badge ? (
                      <span className="min-w-[1.25rem] rounded-full bg-sky-500 px-1.5 py-0.5 text-center text-[10px] font-bold text-white">
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </>
        ) : (
          <LearnerSidebar
            onClose={onClose}
            footer={
              <div className="mt-4 space-y-0.5 border-t border-slate-800 pt-4">
                <Link
                  href="/messages"
                  onClick={() => onClose?.()}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all ${
                    pathname.startsWith("/messages")
                      ? "bg-slate-100 text-slate-950 font-semibold"
                      : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
                  }`}
                >
                  <span className="flex-1 truncate">Messages</span>
                  {unreadCount > 0 ? (
                    <span className="min-w-[1.25rem] rounded-full bg-sky-500 px-1.5 py-0.5 text-center text-[10px] font-bold text-white">
                      {unreadCount}
                    </span>
                  ) : null}
                </Link>
                <Link
                  href="/connections"
                  onClick={() => onClose?.()}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all ${
                    pathname.startsWith("/connections")
                      ? "bg-slate-100 text-slate-950 font-semibold"
                      : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
                  }`}
                >
                  <span className="flex-1 truncate">Connections</span>
                  {pendingConnections > 0 ? (
                    <span className="min-w-[1.25rem] rounded-full bg-sky-500 px-1.5 py-0.5 text-center text-[10px] font-bold text-white">
                      {pendingConnections}
                    </span>
                  ) : null}
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => onClose?.()}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-slate-900 hover:text-slate-100"
                  >
                    Admin
                  </Link>
                )}
              </div>
            }
          />
        )}
      </nav>
    </aside>
  );
}
