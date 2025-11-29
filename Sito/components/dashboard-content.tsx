"use client";

import Link from "next/link";

export function DashboardContent() {
  // TODO: Fetch user data and profile status from Supabase
  const hasProfile = false; // This will come from Supabase
  const isListed = false; // This will come from Supabase

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-bold text-gray-900 mb-8">Dashboard</h1>

      {!hasProfile ? (
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Complete Your Profile</h2>
          <p className="text-gray-600 mb-6">
            Set up your expert profile to start connecting with others and be discovered on the
            marketplace.
          </p>
          <Link
            href="/profile/setup"
            className="inline-block bg-gray-900 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors"
          >
            Set Up Profile
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Profile Status</h3>
            <p className="text-gray-600 mb-4">
              {isListed ? "Your profile is listed on the marketplace" : "Your profile is private"}
            </p>
            <Link
              href="/profile/edit"
              className="text-gray-900 font-semibold hover:underline"
            >
              Edit Profile →
            </Link>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Messages</h3>
            <p className="text-gray-600 mb-4">View and respond to messages</p>
            <Link href="/messages" className="text-gray-900 font-semibold hover:underline">
              Open Messages →
            </Link>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Connections</h3>
            <p className="text-gray-600 mb-4">Manage your connections</p>
            <Link href="/connections" className="text-gray-900 font-semibold hover:underline">
              View Connections →
            </Link>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-lg p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/directory"
            className="p-6 border-2 border-gray-200 rounded-lg hover:border-gray-900 transition-colors"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Browse Experts</h3>
            <p className="text-gray-600">Explore the directory of industry experts</p>
          </Link>
          <Link
            href="/profile/edit"
            className="p-6 border-2 border-gray-200 rounded-lg hover:border-gray-900 transition-colors"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Edit Profile</h3>
            <p className="text-gray-600">Update your expert profile information</p>
          </Link>
        </div>
      </div>
    </div>
  );
}

