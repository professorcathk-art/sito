"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";

interface User {
  id: string;
  email: string;
  name: string | null;
  verified: boolean;
  is_admin: boolean;
  listed_on_marketplace: boolean;
  created_at: string;
}

interface PlatformStats {
  totalUsers: number;
  totalExperts: number;
  totalCourses: number;
  totalBlogPosts: number;
}

export function AdminDashboard() {
  const { user } = useAuth();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<PlatformStats>({
    totalUsers: 0,
    totalExperts: 0,
    totalCourses: 0,
    totalBlogPosts: 0,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [filterVerified, setFilterVerified] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkAdmin() {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", user.id)
          .single();

        if (error) throw error;
        setIsAdmin(data?.is_admin === true);

        if (data?.is_admin) {
          fetchData();
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error("Error checking admin status:", err);
        setLoading(false);
      }
    }

    checkAdmin();
  }, [user, supabase]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchData = async () => {
    try {
      // Fetch platform stats
      const [usersRes, coursesRes, blogPostsRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("courses").select("id", { count: "exact", head: true }),
        supabase.from("blog_posts").select("id", { count: "exact", head: true }),
      ]);

      setStats({
        totalUsers: usersRes.count || 0,
        totalExperts: usersRes.count || 0, // Same for now
        totalCourses: coursesRes.count || 0,
        totalBlogPosts: blogPostsRes.count || 0,
      });

      // Fetch users
      let query = supabase
        .from("profiles")
        .select("id, name, email, verified, is_admin, listed_on_marketplace, created_at")
        .order("created_at", { ascending: false })
        .limit(100);

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }

      const { data: usersData, error: usersError } = await query;

      if (usersError) throw usersError;

      let filteredUsers = usersData || [];
      if (filterVerified !== null) {
        filteredUsers = filteredUsers.filter((u) => u.verified === filterVerified);
      }

      setUsers(filteredUsers);
    } catch (err) {
      console.error("Error fetching admin data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyToggle = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ verified: !currentStatus })
        .eq("id", userId);

      if (error) throw error;
      fetchData();
    } catch (err) {
      console.error("Error updating verification:", err);
      alert("Failed to update verification status");
    }
  };

  const handleSuspendUser = async (userId: string) => {
    if (!confirm("Are you sure you want to suspend this user?")) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ listed_on_marketplace: false })
        .eq("id", userId);

      if (error) throw error;
      alert("User suspended successfully");
      fetchData();
    } catch (err) {
      console.error("Error suspending user:", err);
      alert("Failed to suspend user");
    }
  };

  const handleActivateUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ listed_on_marketplace: true })
        .eq("id", userId);

      if (error) throw error;
      alert("User activated successfully");
      fetchData();
    } catch (err) {
      console.error("Error activating user:", err);
      alert("Failed to activate user");
    }
  };

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-dark-green-800/50 rounded w-1/3 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-dark-green-800/50 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-dark-green-800/30 border border-red-500/30 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-red-400 mb-4">Access Denied</h2>
          <p className="text-custom-text/80">You do not have admin privileges.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-4xl font-bold text-custom-text mb-8">Admin Dashboard</h1>

      {/* Platform Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-dark-green-800/30 border border-cyber-green/30 rounded-lg p-6">
          <h3 className="text-sm text-custom-text/70 mb-2">Total Users</h3>
          <p className="text-3xl font-bold text-custom-text">{stats.totalUsers}</p>
        </div>
        <div className="bg-dark-green-800/30 border border-cyber-green/30 rounded-lg p-6">
          <h3 className="text-sm text-custom-text/70 mb-2">Total Experts</h3>
          <p className="text-3xl font-bold text-custom-text">{stats.totalExperts}</p>
        </div>
        <div className="bg-dark-green-800/30 border border-cyber-green/30 rounded-lg p-6">
          <h3 className="text-sm text-custom-text/70 mb-2">Total Courses</h3>
          <p className="text-3xl font-bold text-custom-text">{stats.totalCourses}</p>
        </div>
        <div className="bg-dark-green-800/30 border border-cyber-green/30 rounded-lg p-6">
          <h3 className="text-sm text-custom-text/70 mb-2">Total Blog Posts</h3>
          <p className="text-3xl font-bold text-custom-text">{stats.totalBlogPosts}</p>
        </div>
      </div>

      {/* User Management */}
      <div className="bg-dark-green-800/30 border border-cyber-green/30 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-custom-text mb-6">User Management</h2>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg text-custom-text placeholder-custom-text/50"
          />
          <select
            value={filterVerified === null ? "all" : filterVerified ? "verified" : "unverified"}
            onChange={(e) => {
              const value = e.target.value;
              setFilterVerified(value === "all" ? null : value === "verified");
            }}
            className="px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg text-custom-text"
          >
            <option value="all">All Users</option>
            <option value="verified">Verified Only</option>
            <option value="unverified">Unverified Only</option>
          </select>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-cyber-green/30">
                <th className="text-left py-3 px-4 text-custom-text font-semibold">Name</th>
                <th className="text-left py-3 px-4 text-custom-text font-semibold">Email</th>
                <th className="text-left py-3 px-4 text-custom-text font-semibold">Status</th>
                <th className="text-left py-3 px-4 text-custom-text font-semibold">Verified</th>
                <th className="text-left py-3 px-4 text-custom-text font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-cyber-green/10">
                  <td className="py-3 px-4 text-custom-text">{user.name || "N/A"}</td>
                  <td className="py-3 px-4 text-custom-text/80">{user.email}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        user.listed_on_marketplace
                          ? "bg-green-900/50 text-green-300"
                          : "bg-red-900/50 text-red-300"
                      }`}
                    >
                      {user.listed_on_marketplace ? "Active" : "Suspended"}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => handleVerifyToggle(user.id, user.verified)}
                      className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                        user.verified
                          ? "bg-cyber-green/20 text-cyber-green border border-cyber-green/30"
                          : "bg-dark-green-900/50 text-custom-text/70 border border-cyber-green/20"
                      }`}
                    >
                      {user.verified ? "✓ Verified" : "Unverified"}
                    </button>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      {user.listed_on_marketplace ? (
                        <button
                          onClick={() => handleSuspendUser(user.id)}
                          className="px-3 py-1 bg-red-900/50 text-red-300 rounded text-sm hover:bg-red-900/70 transition-colors"
                        >
                          Suspend
                        </button>
                      ) : (
                        <button
                          onClick={() => handleActivateUser(user.id)}
                          className="px-3 py-1 bg-green-900/50 text-green-300 rounded text-sm hover:bg-green-900/70 transition-colors"
                        >
                          Activate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

