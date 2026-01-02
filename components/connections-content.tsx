"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { createClient } from "@/lib/supabase/client";

interface Connection {
  id: string;
  user_id: string;
  expert_id: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  user_name?: string;
  expert_name?: string;
}

export function ConnectionsContent() {
  const { user } = useAuth();
  const supabase = createClient();
  const [sentRequests, setSentRequests] = useState<Connection[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<Connection[]>([]);
  const [acceptedConnections, setAcceptedConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"sent" | "received" | "accepted">("received");

  useEffect(() => {
    async function fetchConnections() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Fetch connections where user is the requester
        const { data: sentData } = await supabase
          .from("connections")
          .select("id, user_id, expert_id, status, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        // Fetch connections where user is the expert (received requests)
        const { data: receivedData } = await supabase
          .from("connections")
          .select("id, user_id, expert_id, status, created_at")
          .eq("expert_id", user.id)
          .order("created_at", { ascending: false });

        // Fetch profile names for sent connections (expert names)
        if (sentData && sentData.length > 0) {
          const expertIds = sentData.map((c: any) => c.expert_id);
          const { data: expertProfiles } = await supabase
            .from("profiles")
            .select("id, name")
            .in("id", expertIds);

          const expertMap = new Map(expertProfiles?.map((p: any) => [p.id, p.name]) || []);

          const formatted = sentData.map((conn: any) => ({
            id: conn.id,
            user_id: conn.user_id,
            expert_id: conn.expert_id,
            status: conn.status,
            created_at: conn.created_at,
            expert_name: expertMap.get(conn.expert_id) || "Unknown",
          }));
          setSentRequests(formatted.filter((c) => c.status === "pending"));
          setAcceptedConnections(formatted.filter((c) => c.status === "accepted"));
        }

        // Fetch profile names for received connections (requester names)
        if (receivedData && receivedData.length > 0) {
          const requesterIds = receivedData.map((c: any) => c.user_id);
          const { data: requesterProfiles } = await supabase
            .from("profiles")
            .select("id, name")
            .in("id", requesterIds);

          const requesterMap = new Map(requesterProfiles?.map((p: any) => [p.id, p.name]) || []);

          const formatted = receivedData.map((conn: any) => ({
            id: conn.id,
            user_id: conn.user_id,
            expert_id: conn.expert_id,
            status: conn.status,
            created_at: conn.created_at,
            user_name: requesterMap.get(conn.user_id) || "Unknown",
          }));
          setReceivedRequests(formatted.filter((c) => c.status === "pending"));
          
          // Add accepted received connections
          const acceptedReceived = formatted.filter((c) => c.status === "accepted");
          setAcceptedConnections((prev) => [...prev, ...acceptedReceived]);
        }
      } catch (error) {
        console.error("Error fetching connections:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchConnections();
  }, [user, supabase]);

  const handleAccept = async (connectionId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("connections")
        .update({ status: "accepted" })
        .eq("id", connectionId)
        .eq("expert_id", user.id);

      if (error) throw error;

      // Update local state
      const connection = receivedRequests.find((c) => c.id === connectionId);
      if (connection) {
        setReceivedRequests(receivedRequests.filter((c) => c.id !== connectionId));
        setAcceptedConnections([...acceptedConnections, { ...connection, status: "accepted" }]);
      }
    } catch (error) {
      console.error("Error accepting connection:", error);
      alert("Failed to accept connection request. Please try again.");
    }
  };

  const handleReject = async (connectionId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("connections")
        .update({ status: "rejected" })
        .eq("id", connectionId)
        .eq("expert_id", user.id);

      if (error) throw error;

      // Update local state
      setReceivedRequests(receivedRequests.filter((c) => c.id !== connectionId));
    } catch (error) {
      console.error("Error rejecting connection:", error);
      alert("Failed to reject connection request. Please try again.");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="animate-pulse">
          <div className="h-10 bg-dark-green-800/50 rounded w-1/4 mb-8"></div>
          <div className="bg-dark-green-800/30 border border-cyber-green/30 rounded-xl p-6 h-64"></div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-4xl font-bold text-custom-text mb-8">Connections</h1>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-cyber-green/30">
        <button
          onClick={() => setActiveTab("received")}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === "received"
              ? "text-cyber-green border-b-2 border-cyber-green"
              : "text-custom-text/70 hover:text-custom-text"
          }`}
        >
          Received Requests
          {receivedRequests.length > 0 && (
            <span className="ml-2 bg-cyber-green text-dark-green-950 text-xs px-2 py-0.5 rounded-full">
              {receivedRequests.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("sent")}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === "sent"
              ? "text-cyber-green border-b-2 border-cyber-green"
              : "text-custom-text/70 hover:text-custom-text"
          }`}
        >
          Sent Requests
        </button>
        <button
          onClick={() => setActiveTab("accepted")}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === "accepted"
              ? "text-cyber-green border-b-2 border-cyber-green"
              : "text-custom-text/70 hover:text-custom-text"
          }`}
        >
          Accepted Connections
        </button>
      </div>

      {/* Content */}
      {activeTab === "received" && (
        <div className="bg-dark-green-800/30 backdrop-blur-sm border border-cyber-green/30 rounded-xl p-6">
          {receivedRequests.length === 0 ? (
            <p className="text-custom-text/70 text-center py-8">No pending connection requests</p>
          ) : (
            <div className="space-y-4">
              {receivedRequests.map((connection) => (
                <div
                  key={connection.id}
                  className="bg-dark-green-900/30 border border-cyber-green/20 rounded-lg p-4 flex items-center justify-between"
                >
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-custom-text mb-1">
                      {connection.user_name}
                    </h3>
                    <p className="text-sm text-custom-text/70">Sent {formatDate(connection.created_at)}</p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleAccept(connection.id)}
                      className="px-4 py-2 bg-cyber-green text-custom-text rounded-lg font-semibold hover:bg-cyber-green-light transition-colors shadow-[0_0_15px_rgba(0,255,136,0.3)]"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleReject(connection.id)}
                      className="px-4 py-2 border border-cyber-green/30 text-custom-text rounded-lg hover:bg-dark-green-800/50 transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "sent" && (
        <div className="bg-dark-green-800/30 backdrop-blur-sm border border-cyber-green/30 rounded-xl p-6">
          {sentRequests.length === 0 ? (
            <p className="text-custom-text/70 text-center py-8">No pending sent requests</p>
          ) : (
            <div className="space-y-4">
              {sentRequests.map((connection) => (
                <div
                  key={connection.id}
                  className="bg-dark-green-900/30 border border-cyber-green/20 rounded-lg p-4 flex items-center justify-between"
                >
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-custom-text mb-1">
                      {connection.expert_name}
                    </h3>
                    <p className="text-sm text-custom-text/70">Sent {formatDate(connection.created_at)}</p>
                  </div>
                  <span className="px-4 py-2 border border-cyber-green/50 text-cyber-green rounded-lg">
                    Pending
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "accepted" && (
        <div className="bg-dark-green-800/30 backdrop-blur-sm border border-cyber-green/30 rounded-xl p-6">
          {acceptedConnections.length === 0 ? (
            <p className="text-custom-text/70 text-center py-8">No accepted connections yet</p>
          ) : (
            <div className="space-y-4">
              {acceptedConnections.map((connection) => (
                <div
                  key={connection.id}
                  className="bg-dark-green-900/30 border border-cyber-green/20 rounded-lg p-4 flex items-center justify-between"
                >
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-custom-text mb-1">
                      {connection.expert_name || connection.user_name}
                    </h3>
                    <p className="text-sm text-custom-text/70">
                      Connected {formatDate(connection.created_at)}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Link
                      href={`/expert/${connection.expert_id === user?.id ? connection.user_id : connection.expert_id}`}
                      className="px-4 py-2 border border-cyber-green/30 text-custom-text rounded-lg hover:bg-dark-green-800/50 transition-colors"
                    >
                      View Profile
                    </Link>
                    <Link
                      href={`/messages?expert=${connection.expert_id === user?.id ? connection.user_id : connection.expert_id}`}
                      className="px-4 py-2 bg-cyber-green text-custom-text rounded-lg font-semibold hover:bg-cyber-green-light transition-colors shadow-[0_0_15px_rgba(0,255,136,0.3)]"
                    >
                      Message
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

