"use client";

import { useAuth } from "@/contexts/auth-context";
import Link from "next/link";

interface CourseActionsProps {
  courseId: string;
  expertId: string;
}

export function CourseActions({ courseId, expertId }: CourseActionsProps) {
  const { user } = useAuth();
  const isExpert = user?.id === expertId;

  if (isExpert) {
    return (
      <div className="flex gap-4">
        <Link
          href={`/courses/${courseId}/edit`}
          className="px-6 py-3 bg-cyber-green text-dark-green-900 font-semibold rounded-lg hover:bg-cyber-green-light transition-colors"
        >
          Edit Course
        </Link>
        <Link
          href="/courses/manage"
          className="px-6 py-3 border border-cyber-green/30 text-custom-text rounded-lg hover:bg-dark-green-800/50 transition-colors"
        >
          Back to Courses
        </Link>
      </div>
    );
  }

  return (
    <div className="flex gap-4">
      <Link
        href={`/expert/${expertId}`}
        className="px-6 py-3 bg-cyber-green text-dark-green-900 font-semibold rounded-lg hover:bg-cyber-green-light transition-colors"
      >
        View Expert Profile
      </Link>
    </div>
  );
}

