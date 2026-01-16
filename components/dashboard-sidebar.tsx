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

interface DashboardSidebarProps {
  onClose?: () => void;
}

export function DashboardSidebar({ onClose }: DashboardSidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const supabase = createClient();
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingConnections, setPendingConnections] = useState(0);
  const [isExpert, setIsExpert] = useState(false);

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

  const [profileComplete, setProfileComplete] = useState(false);

  useEffect(() => {
    async function checkAdminAndExpert() {
      if (!user) return;
      try {
        const { data } = await supabase
          .from("profiles")
          .select("is_admin, category_id, bio, name, title, country_id, language_supported, phone_number")
          .eq("id", user.id)
          .single();
        setIsAdmin(data?.is_admin === true);
        // Check if user has completed expert profile (has category_id and bio)
        setIsExpert(!!(data?.category_id && data?.bio && data?.name));
        // Check if profile is complete (all mandatory fields filled)
        // Handle language_supported as array or null - check if it exists and has items
        const hasLanguages = data?.language_supported && 
          Array.isArray(data.language_supported) && 
          data.language_supported.length > 0;
        
        const hasAllMandatoryFields = !!(
          data?.name &&
          data?.title &&
          data?.category_id &&
          data?.bio &&
          data?.country_id &&
          hasLanguages &&
          data?.phone_number &&
          data.phone_number.trim().length > 0
        );
        setProfileComplete(hasAllMandatoryFields);
      } catch (error) {
        console.error("Error checking admin/expert status:", error);
      }
    }
    checkAdminAndExpert();
  }, [user, supabase]); // eslint-disable-line react-hooks/exhaustive-deps

  const menuItems: SidebarItem[] = [
    {
      name: "Profile",
      href: "/profile",
      icon: "👤",
    },
    ...(isExpert && profileComplete
      ? [
          {
            name: "Products",
            href: "/products",
            icon: "🛍️",
          },
          {
            name: "Sharing Posts",
            href: "/dashboard/blog",
            icon: "✍️",
          },
          {
            name: "Classroom",
            href: "/courses/manage",
            icon: "📚",
          },
          {
            name: "Manage Appointments",
            href: "/appointments/manage",
            icon: "📅",
          },
          {
            name: "Payment Setup",
            href: "/dashboard/stripe-connect",
            icon: "💳",
          },
        ]
      : []),
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
      name: "Purchase History",
      href: "/dashboard/purchases",
      icon: "🛒",
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
    <aside className="w-64 bg-dark-green-800/95 md:bg-dark-green-800/30 backdrop-blur-sm border-r border-cyber-green/30 min-h-[calc(100vh-4rem)] pt-20 md:pt-8 pb-8 overflow-y-auto">
      <nav className="px-4 space-y-2">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || (item.href === "/dashboard" && pathname === "/dashboard");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => onClose?.()}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-sm md:text-base ${
                isActive
                  ? "bg-cyber-green/20 border border-cyber-green/50 text-cyber-green font-semibold"
                  : "text-custom-text/80 hover:bg-dark-green-900/30 hover:text-custom-text border border-transparent"
              }`}
            >
              <span className="text-xl flex-shrink-0">{item.icon}</span>
              <span className="flex-1 truncate">{item.name}</span>
              {item.badge && (
                <span className="bg-cyber-green text-dark-green-950 text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center flex-shrink-0">
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

