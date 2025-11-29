"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

interface Message {
  id: string;
  from: string;
  fromId: string;
  subject: string;
  preview: string;
  timestamp: string;
  unread: boolean;
}

// Mock data - will be replaced with Supabase queries
const mockMessages: Message[] = [
  {
    id: "1",
    from: "John Doe",
    fromId: "user1",
    subject: "Looking for mentorship",
    preview: "Hi, I'm interested in learning more about...",
    timestamp: "2 hours ago",
    unread: true,
  },
  {
    id: "2",
    from: "Jane Smith",
    fromId: "user2",
    subject: "Career advice needed",
    preview: "I would love to get your advice on...",
    timestamp: "1 day ago",
    unread: false,
  },
];

export function MessagesContent() {
  const searchParams = useSearchParams();
  const expertId = searchParams.get("expert");
  const [messages] = useState<Message[]>(mockMessages);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

  if (expertId) {
    // Show message compose form for specific expert
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Send Message</h1>
          <MessageComposeForm expertId={expertId} />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-bold text-gray-900 mb-8">Messages</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-lg">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Inbox</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {messages.length === 0 ? (
                <div className="p-8 text-center text-gray-600">No messages yet</div>
              ) : (
                messages.map((message) => (
                  <button
                    key={message.id}
                    onClick={() => setSelectedMessage(message)}
                    className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                      selectedMessage?.id === message.id ? "bg-gray-50" : ""
                    } ${message.unread ? "font-semibold" : ""}`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <span className="text-gray-900">{message.from}</span>
                      {message.unread && (
                        <span className="h-2 w-2 bg-blue-500 rounded-full"></span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 truncate">{message.subject}</p>
                    <p className="text-xs text-gray-500 mt-1">{message.timestamp}</p>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
        <div className="lg:col-span-2">
          {selectedMessage ? (
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedMessage.subject}</h2>
                <div className="flex items-center gap-4 text-gray-600">
                  <span>From: {selectedMessage.from}</span>
                  <span>•</span>
                  <span>{selectedMessage.timestamp}</span>
                </div>
              </div>
              <div className="prose max-w-none">
                <p className="text-gray-700">{selectedMessage.preview}</p>
              </div>
              <div className="mt-8 pt-6 border-t border-gray-200">
                <button className="bg-gray-900 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors">
                  Reply
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center text-gray-600">
              Select a message to view
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MessageComposeForm({ expertId }: { expertId: string }) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // TODO: Integrate with Supabase to send message
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      alert("Message sent successfully!");
      setSubject("");
      setMessage("");
    } catch (err) {
      alert("Failed to send message. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
          Subject
        </label>
        <input
          id="subject"
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          placeholder="What would you like to discuss?"
        />
      </div>
      <div>
        <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
          Message
        </label>
        <textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          rows={10}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          placeholder="Write your message here..."
        />
      </div>
      <div className="flex gap-4">
        <button
          type="submit"
          disabled={loading}
          className="bg-gray-900 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Sending..." : "Send Message"}
        </button>
        <a
          href="/messages"
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}

