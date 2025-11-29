"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

interface Expert {
  id: string;
  name: string;
  title: string;
  category: string;
  bio: string;
  location: string;
  verified: boolean;
}

// Mock data - will be replaced with Supabase queries
const mockExperts: Expert[] = [
  {
    id: "1",
    name: "Sarah Chen",
    title: "Senior Full-Stack Developer",
    category: "Website Development",
    bio: "10+ years of experience building scalable web applications",
    location: "San Francisco, CA",
    verified: true,
  },
  {
    id: "2",
    name: "Michael Rodriguez",
    title: "Mobile App Architect",
    category: "Software Development",
    bio: "Expert in React Native and iOS development",
    location: "New York, NY",
    verified: true,
  },
  {
    id: "3",
    name: "David Kim",
    title: "Trading Strategist",
    category: "Trading",
    bio: "Professional trader with 15+ years in forex and crypto",
    location: "London, UK",
    verified: true,
  },
];

export function ExpertDirectory() {
  const searchParams = useSearchParams();
  const categoryFilter = searchParams.get("category");
  const [experts, setExperts] = useState<Expert[]>(mockExperts);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    // Filter experts by category if provided
    let filtered = mockExperts;
    if (categoryFilter) {
      filtered = filtered.filter((expert) => expert.category === categoryFilter);
    }
    if (searchQuery) {
      filtered = filtered.filter(
        (expert) =>
          expert.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          expert.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          expert.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    setExperts(filtered);
  }, [categoryFilter, searchQuery]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Expert Directory</h1>
        <p className="text-xl text-gray-600 mb-6">
          Discover industry experts ready to guide your journey
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <input
            type="text"
            placeholder="Search experts by name, title, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          />
          {categoryFilter && (
            <Link
              href="/directory"
              className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Clear Filter
            </Link>
          )}
        </div>
      </div>

      {experts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 text-lg">No experts found matching your criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {experts.map((expert) => (
            <Link
              key={expert.id}
              href={`/expert/${expert.id}`}
              className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-xl font-bold text-gray-900">{expert.name}</h3>
                    {expert.verified && (
                      <span className="text-blue-500" title="Verified Expert">
                        ✓
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 font-medium">{expert.title}</p>
                </div>
              </div>
              <p className="text-gray-700 mb-4 line-clamp-2">{expert.bio}</p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                  {expert.category}
                </span>
                <span className="text-sm text-gray-500">{expert.location}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

