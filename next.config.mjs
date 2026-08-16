/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/dashboard/my-bookings",
        destination: "/dashboard/learning/bookings",
        permanent: false,
      },
      {
        source: "/dashboard/purchases",
        destination: "/dashboard/learning/history",
        permanent: false,
      },
      {
        source: "/subscriptions",
        destination: "/dashboard/learning/subscriptions",
        permanent: false,
      },
      {
        source: "/blog/watch-later",
        destination: "/dashboard/learning/subscriptions?tab=saved",
        permanent: false,
      },
      {
        source: "/courses/create",
        destination: "/dashboard/products",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;

