"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { createClient } from "@/lib/supabase/client";

interface Message {
  id: string;
  from: string;
  fromId: string;
  subject: string;
  preview: string;
  content: string;
  timestamp: string;
  unread: boolean;
}

interface ConversationMessage {
  id: string;
  from_id: string;
  to_id: string;
  from_name: string;
  to_name: string;
  subject: string;
  content: string;
  read: boolean;
  created_at: string;
  is_sent: boolean; // true if sent by current user, false if received
}

export function MessagesContent() {
  const searchParams = useSearchParams();
  const expertId = searchParams.get("expert");
  const { user } = useAuth();
  const supabase = createClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    return date.toLocaleDateString();
  };

  useEffect(() => {
    async function fetchMessages() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Fetch received messages
        const { data: receivedData, error: receivedError } = await supabase
          .from("messages")
          .select("id, from_id, subject, content, read, created_at")
          .eq("to_id", user.id)
          .order("created_at", { ascending: false });

        // Fetch sent messages
        const { data: sentData, error: sentError } = await supabase
          .from("messages")
          .select("id, to_id, subject, content, created_at")
          .eq("from_id", user.id)
          .order("created_at", { ascending: false });

        if (receivedError || sentError) {
          console.error("Error fetching messages:", receivedError || sentError);
        } else {
          // Get unique conversation partners (people user has messaged with)
          const allPartnerIds = new Set<string>();
          receivedData?.forEach((msg: any) => allPartnerIds.add(msg.from_id));
          sentData?.forEach((msg: any) => allPartnerIds.add(msg.to_id));

          if (allPartnerIds.size > 0) {
            // Fetch profile names
            const { data: profiles } = await supabase
              .from("profiles")
              .select("id, name")
              .in("id", Array.from(allPartnerIds));

            const profileMap = new Map(profiles?.map((p: any) => [p.id, p.name]) || []);

            // Group messages by conversation partner (use most recent message per partner)
            const conversationMap = new Map<string, any>();
            
            receivedData?.forEach((msg: any) => {
              const partnerId = msg.from_id;
              if (!conversationMap.has(partnerId) || 
                  new Date(msg.created_at) > new Date(conversationMap.get(partnerId).created_at)) {
                conversationMap.set(partnerId, {
                  ...msg,
                  partnerId,
                  isReceived: true,
                });
              }
            });

            sentData?.forEach((msg: any) => {
              const partnerId = msg.to_id;
              if (!conversationMap.has(partnerId) || 
                  new Date(msg.created_at) > new Date(conversationMap.get(partnerId).created_at)) {
                conversationMap.set(partnerId, {
                  ...msg,
                  partnerId,
                  isReceived: false,
                });
              }
            });

            // Convert to Message format for display
            const formattedMessages: Message[] = Array.from(conversationMap.values())
              .map((msg: any) => ({
                id: msg.id,
                from: profileMap.get(msg.partnerId) || "Unknown",
                fromId: msg.partnerId,
                subject: msg.subject,
                preview: msg.content.substring(0, 100) + (msg.content.length > 100 ? "..." : ""),
                content: msg.content,
                timestamp: formatTimeAgo(msg.created_at),
                unread: msg.isReceived && !msg.read,
              }))
              .sort((a, b) => {
                // Sort by most recent conversation
                const aTime = receivedData?.find((m: any) => m.from_id === a.fromId)?.created_at ||
                             sentData?.find((m: any) => m.to_id === a.fromId)?.created_at || "";
                const bTime = receivedData?.find((m: any) => m.from_id === b.fromId)?.created_at ||
                             sentData?.find((m: any) => m.to_id === b.fromId)?.created_at || "";
                return new Date(bTime).getTime() - new Date(aTime).getTime();
              });

            setMessages(formattedMessages);
          } else {
            setMessages([]);
          }
        }
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchMessages();
  }, [user, supabase]);

  const markAsRead = async (messageId: string) => {
    if (!user) return;
    
    try {
      await supabase
        .from("messages")
        .update({ read: true })
        .eq("id", messageId)
        .eq("to_id", user.id);
      
      // Update local state
      setMessages(messages.map(msg => 
        msg.id === messageId ? { ...msg, unread: false } : msg
      ));
    } catch (error) {
      console.error("Error marking message as read:", error);
    }
  };

  const fetchConversationHistory = async (partnerId: string) => {
    if (!user) return;
    
    setLoadingHistory(true);
    try {
      // Fetch all messages between current user and partner
      const { data: receivedMessages } = await supabase
        .from("messages")
        .select("id, from_id, to_id, subject, content, read, created_at")
        .eq("to_id", user.id)
        .eq("from_id", partnerId)
        .order("created_at", { ascending: true });

      const { data: sentMessages } = await supabase
        .from("messages")
        .select("id, from_id, to_id, subject, content, created_at")
        .eq("from_id", user.id)
        .eq("to_id", partnerId)
        .order("created_at", { ascending: true });

      // Fetch profile names
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name")
        .in("id", [user.id, partnerId]);

      const profileMap = new Map(profiles?.map((p: any) => [p.id, p.name]) || []);

      // Combine and format messages
      const allMessages: ConversationMessage[] = [
        ...(receivedMessages || []).map((msg: any) => ({
          id: msg.id,
          from_id: msg.from_id,
          to_id: msg.to_id,
          from_name: profileMap.get(msg.from_id) || "Unknown",
          to_name: profileMap.get(msg.to_id) || "Unknown",
          subject: msg.subject,
          content: msg.content,
          read: msg.read,
          created_at: msg.created_at,
          is_sent: false,
        })),
        ...(sentMessages || []).map((msg: any) => ({
          id: msg.id,
          from_id: msg.from_id,
          to_id: msg.to_id,
          from_name: profileMap.get(msg.from_id) || "Unknown",
          to_name: profileMap.get(msg.to_id) || "Unknown",
          subject: msg.subject,
          content: msg.content,
          read: true,
          created_at: msg.created_at,
          is_sent: true,
        })),
      ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      setConversationHistory(allMessages);

      // Mark received messages as read
      const unreadIds = allMessages.filter(m => !m.is_sent && !m.read).map(m => m.id);
      if (unreadIds.length > 0) {
        await supabase
          .from("messages")
          .update({ read: true })
          .in("id", unreadIds);
      }
    } catch (error) {
      console.error("Error fetching conversation history:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleMessageSelect = (message: Message) => {
    setSelectedMessage(message);
    fetchConversationHistory(message.fromId);
    if (message.unread) {
      markAsRead(message.id);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="animate-pulse">
          <div className="h-10 bg-dark-green-800/50 rounded w-1/4 mb-8"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-dark-green-800/30 border border-cyber-green/30 rounded-2xl p-4 h-96"></div>
            <div className="lg:col-span-2 bg-dark-green-800/30 border border-cyber-green/30 rounded-2xl p-8 h-96"></div>
          </div>
        </div>
      </div>
    );
  }

  const [showCompose, setShowCompose] = useState(false);
  const [composeExpertId, setComposeExpertId] = useState<string | null>(null);
  const [composeExpertName, setComposeExpertName] = useState<string>("");

  useEffect(() => {
    if (expertId) {
      setShowCompose(true);
      setComposeExpertId(expertId);
      // Fetch expert name
      supabase
        .from("profiles")
        .select("name")
        .eq("id", expertId)
        .single()
        .then(({ data }) => {
          if (data) {
            setComposeExpertName(data.name);
          }
        });
    }
  }, [expertId, supabase]);

  return (
    <div className="w-full">
      <h1 className="text-4xl font-bold text-custom-text mb-8">Messages</h1>
      
      {/* Compose Form */}
      {showCompose && composeExpertId && (
        <div className="mb-6 bg-dark-green-800/30 backdrop-blur-sm border border-cyber-green/30 rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-custom-text">
              {composeExpertName ? `Send Message to ${composeExpertName}` : "Send Message"}
            </h2>
            <button
              onClick={() => {
                setShowCompose(false);
                setComposeExpertId(null);
                setComposeExpertName("");
                window.history.replaceState({}, "", "/messages");
              }}
              className="text-custom-text/70 hover:text-custom-text"
            >
              ✕
            </button>
          </div>
          <MessageComposeForm 
            expertId={composeExpertId} 
            onSent={() => {
              setShowCompose(false);
              setComposeExpertId(null);
              setComposeExpertName("");
              window.history.replaceState({}, "", "/messages");
              // Refresh messages
              window.location.reload();
            }}
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-dark-green-800/30 backdrop-blur-sm border border-cyber-green/30 rounded-2xl shadow-lg">
            <div className="p-4 border-b border-cyber-green/30">
              <h2 className="text-xl font-bold text-custom-text">Inbox</h2>
            </div>
            <div className="divide-y divide-cyber-green/20 max-h-[600px] overflow-y-auto">
              {messages.length === 0 ? (
                <div className="p-8 text-center text-custom-text/70">No messages yet</div>
              ) : (
                messages.map((message) => (
                  <button
                    key={message.id}
                    onClick={() => handleMessageSelect(message)}
                    className={`w-full text-left p-4 hover:bg-dark-green-900/50 transition-colors ${
                      selectedMessage?.id === message.id ? "bg-dark-green-900/50" : ""
                    } ${message.unread ? "font-semibold" : ""}`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <span className={`${message.unread ? "text-custom-text" : "text-custom-text/80"}`}>
                        {message.from}
                      </span>
                      {message.unread && (
                        <span className="h-2 w-2 bg-cyber-green rounded-full"></span>
                      )}
                    </div>
                    <p className={`text-sm truncate ${message.unread ? "text-custom-text/90" : "text-custom-text/70"}`}>
                      {message.subject}
                    </p>
                    <p className="text-xs text-custom-text/60 mt-1">{message.timestamp}</p>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
        <div className="lg:col-span-2">
          {selectedMessage ? (
            <div className="bg-dark-green-800/30 backdrop-blur-sm border border-cyber-green/30 rounded-2xl shadow-lg p-8 flex flex-col h-full">
              <div className="mb-6 pb-4 border-b border-cyber-green/30">
                <h2 className="text-2xl font-bold text-custom-text mb-2">Conversation with {selectedMessage.from}</h2>
                <p className="text-custom-text/70 text-sm">Subject: {selectedMessage.subject}</p>
              </div>
              
              {loadingHistory ? (
                <div className="flex-1 flex items-center justify-center min-h-[400px]">
                  <div className="animate-pulse text-custom-text/70">Loading conversation...</div>
                </div>
              ) : conversationHistory.length > 0 ? (
                <div className="flex-1 overflow-y-auto space-y-4 mb-6 pr-2 max-h-[600px]">
                  {conversationHistory.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.is_sent ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-4 ${
                          msg.is_sent
                            ? "bg-cyber-green/20 border border-cyber-green/30"
                            : "bg-dark-green-900/30 border border-cyber-green/20"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-custom-text">
                            {msg.is_sent ? "You" : msg.from_name}
                          </span>
                          <span className="text-xs text-custom-text/60">
                            {formatTimeAgo(msg.created_at)}
                          </span>
                        </div>
                        <p className="text-custom-text/90 whitespace-pre-wrap text-sm">{msg.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center min-h-[400px] text-custom-text/70">
                  No conversation history found
                </div>
              )}
              
              <div className="pt-6 border-t border-cyber-green/30">
                <button
                  onClick={() => {
                    setShowCompose(true);
                    setComposeExpertId(selectedMessage.fromId);
                    setComposeExpertName(selectedMessage.from);
                  }}
                  className="bg-cyber-green text-custom-text px-6 py-3 rounded-lg font-semibold hover:bg-cyber-green-light transition-colors shadow-[0_0_15px_rgba(0,255,136,0.3)]"
                >
                  Reply
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-dark-green-800/30 backdrop-blur-sm border border-cyber-green/30 rounded-2xl shadow-lg p-8 text-center text-custom-text/70">
              Select a message to view conversation
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MessageComposeForm({ expertId, onSent }: { expertId: string; onSent?: () => void }) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { user } = useAuth();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!user) {
      setError("You must be logged in to send a message");
      setLoading(false);
      return;
    }

    try {
      const { error: sendError } = await supabase
        .from("messages")
        .insert({
          from_id: user.id,
          to_id: expertId,
          subject: subject,
          content: message,
          read: false,
        });

      if (sendError) {
        throw sendError;
      }

      // Send email notification to recipient
      try {
        const { data: userProfile } = await supabase
          .from("profiles")
          .select("name")
          .eq("id", user.id)
          .single();

        await fetch("/api/notify-message", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            to_id: expertId,
            from_name: userProfile?.name || "Someone",
            subject: subject,
          }),
        });
      } catch (emailError) {
        console.error("Failed to send email notification:", emailError);
        // Don't fail the message send if email fails
      }

      alert("Message sent successfully!");
      setSubject("");
      setMessage("");
      if (onSent) {
        onSent();
      } else {
        window.location.href = "/messages";
      }
    } catch (err: any) {
      setError(err.message || "Failed to send message. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-900/30 border border-red-500/50 text-red-200 rounded-lg">
          {error}
        </div>
      )}
      <div>
        <label htmlFor="subject" className="block text-sm font-medium text-custom-text mb-2">
          Subject
        </label>
        <input
          id="subject"
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
          className="w-full px-4 py-3 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg focus:ring-2 focus:ring-cyber-green focus:border-cyber-green text-custom-text placeholder-custom-text/50"
          placeholder="What would you like to discuss?"
        />
      </div>
      <div>
        <label htmlFor="message" className="block text-sm font-medium text-custom-text mb-2">
          Message
        </label>
        <textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          rows={10}
          className="w-full px-4 py-3 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg focus:ring-2 focus:ring-cyber-green focus:border-cyber-green text-custom-text placeholder-custom-text/50"
          placeholder="Write your message here..."
        />
      </div>
      <div className="flex gap-4">
        <button
          type="submit"
          disabled={loading}
          className="bg-cyber-green text-custom-text px-6 py-3 rounded-lg font-semibold hover:bg-cyber-green-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(0,255,136,0.3)]"
        >
          {loading ? "Sending..." : "Send Message"}
        </button>
        <a
          href="/messages"
          className="px-6 py-3 border border-cyber-green/30 text-custom-text rounded-lg hover:bg-dark-green-800/50 transition-colors"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}

