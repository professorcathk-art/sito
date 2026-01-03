"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { createClient } from "@/lib/supabase/client";
import { useState, useEffect } from "react";

interface SidebarItem {
  name: string;
  href: string;
  icon: string;
  badge?: number;
}

export function DashboardSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const supabase = createClient();
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingConnections, setPendingConnections] = useState(0);

  useEffect(() => {
    async function fetchCounts() {
      if (!user) return;

      try {
        // Fetch unread message count
        const { count: unreadMessages } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("to_id", user.id)
          .eq("read", false);

        setUnreadCount(unreadMessages || 0);

        // Fetch pending connection requests count
        const { count: pendingRequests } = await supabase
          .from("connections")
          .select("*", { count: "exact", head: true })
          .eq("expert_id", user.id)
          .eq("status", "pending");

        setPendingConnections(pendingRequests || 0);
      } catch (error) {
        console.error("Error fetching counts:", error);
      }
    }

    fetchCounts();
  }, [user, supabase]);

  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function checkAdmin() {
      if (!user) return;
      try {
        const { data } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", user.id)
          .single();
        setIsAdmin(data?.is_admin === true);
      } catch (error) {
        console.error("Error checking admin status:", error);
      }
    }
    checkAdmin();
  }, [user, supabase]); // eslint-disable-line react-hooks/exhaustive-deps

  const menuItems: SidebarItem[] = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: "📊",
    },
    {
      name: "Profile",
      href: "/profile",
      icon: "👤",
    },
    {
      name: "Products",
      href: "/products",
      icon: "🛍️",
    },
    {
      name: "Blog Posts",
      href: "/dashboard/blog",
      icon: "✍️",
    },
    {
      name: "Manage Course",
      href: "/courses/manage",
      icon: "📚",
    },
    {
      name: "Messages",
      href: "/messages",
      icon: "💬",
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
    {
      name: "Connections",
      href: "/connections",
      icon: "🔗",
      badge: pendingConnections > 0 ? pendingConnections : undefined,
    },
    {
      name: "Subscriptions",
      href: "/subscriptions",
      icon: "⭐",
    },
    {
      name: "Watch Later",
      href: "/blog/watch-later",
      icon: "💾",
    },
    {
      name: "Questionnaires",
      href: "/questionnaires/manage",
      icon: "📋",
    },
    {
      name: "Manage Appointments",
      href: "/appointments/manage",
      icon: "📅",
    },
    ...(isAdmin
      ? [
          {
            name: "Admin",
            href: "/admin",
            icon: "⚙️",
          },
        ]
      : []),
  ];

  return (
    <aside className="w-64 bg-dark-green-800/30 backdrop-blur-sm border-r border-cyber-green/30 min-h-[calc(100vh-4rem)] pt-8">
      <nav className="px-4 space-y-2">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || (item.href === "/dashboard" && pathname === "/dashboard");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                isActive
                  ? "bg-cyber-green/20 border border-cyber-green/50 text-cyber-green font-semibold"
                  : "text-custom-text/80 hover:bg-dark-green-900/30 hover:text-custom-text border border-transparent"
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="flex-1">{item.name}</span>
              {item.badge && (
                <span className="bg-cyber-green text-dark-green-950 text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

