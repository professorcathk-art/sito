"use client";

import Link from "next/link";
import { BlogPostsList } from "@/components/blog-posts-list";

export function FeaturedBlogPosts() {
  return (
    <section className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-custom-text mb-1 sm:mb-2 tracking-tight">
              Latest Blog Posts
            </h2>
            <p className="text-sm sm:text-base text-custom-text/80">
              Insights and knowledge from our experts
            </p>
          </div>
          <Link
            href="/blog"
            className="text-custom-text hover:text-cyber-green font-semibold transition-colors text-sm sm:text-base self-start sm:self-auto"
          >
            View All →
          </Link>
        </div>
        <BlogPostsList limit={5} />
      </div>
    </section>
  );
}

