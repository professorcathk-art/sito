"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Expert {
  id: string;
  name: string;
  title: string;
  category: string;
  bio: string;
  location: string;
  website?: string;
  linkedin?: string;
  verified: boolean;
}

// Mock data - will be replaced with Supabase queries
const mockExpert: Expert = {
  id: "1",
  name: "Sarah Chen",
  title: "Senior Full-Stack Developer",
  category: "Website Development",
  bio: "10+ years of experience building scalable web applications. Specialized in React, Node.js, and cloud infrastructure. I've helped dozens of startups scale their tech stack and build robust applications.",
  location: "San Francisco, CA",
  website: "https://sarahchen.dev",
  linkedin: "https://linkedin.com/in/sarahchen",
  verified: true,
};

export function ExpertProfile({ expertId }: { expertId: string }) {
  const [expert, setExpert] = useState<Expert | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch expert data from Supabase
    // For now, use mock data
    setTimeout(() => {
      setExpert(mockExpert);
      setLoading(false);
    }, 500);
  }, [expertId]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!expert) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <p className="text-gray-600">Expert not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{expert.name}</h1>
              {expert.verified && (
                <span className="text-blue-500 text-xl" title="Verified Expert">
                  ✓
                </span>
              )}
            </div>
            <p className="text-xl text-gray-600 mb-2">{expert.title}</p>
            <div className="flex items-center gap-4 text-gray-500">
              <span className="bg-gray-100 px-3 py-1 rounded-full text-sm">{expert.category}</span>
              {expert.location && <span>{expert.location}</span>}
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-3">About</h2>
          <p className="text-gray-700 leading-relaxed">{expert.bio}</p>
        </div>

        {(expert.website || expert.linkedin) && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-3">Links</h2>
            <div className="flex flex-wrap gap-4">
              {expert.website && (
                <a
                  href={expert.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  Website
                </a>
              )}
              {expert.linkedin && (
                <a
                  href={expert.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  LinkedIn
                </a>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-4 pt-6 border-t border-gray-200">
          <Link
            href={`/messages?expert=${expert.id}`}
            className="flex-1 bg-gray-900 text-white py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors text-center"
          >
            Send Message
          </Link>
          <button className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
            Connect
          </button>
        </div>
      </div>
    </div>
  );
}

