"use client";

import Link from "next/link";
import { CourseEnrollment } from "@/components/course-enrollment";

interface CourseActionsProps {
  courseId: string;
  expertId: string;
  currentUserId?: string;
  coursePrice: number;
  isFree: boolean;
  enrollmentOnRequest?: boolean;
}

export function CourseActions({ courseId, expertId, currentUserId, coursePrice, isFree, enrollmentOnRequest }: CourseActionsProps) {
  // Ensure boolean value
  const isEnrollmentOnRequest = enrollmentOnRequest === true;
  const isExpert = currentUserId === expertId;

  if (isExpert) {
    return (
      <div className="flex gap-4">
        <Link
          href="/courses/manage"
          className="px-6 py-3 bg-cyber-green text-dark-green-900 font-semibold rounded-lg hover:bg-cyber-green-light transition-colors"
        >
          Manage in Classroom
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <CourseEnrollment
        courseId={courseId}
        expertId={expertId}
        coursePrice={coursePrice}
        isFree={isFree}
        currentUserId={currentUserId}
        enrollmentOnRequest={isEnrollmentOnRequest}
        returnUrl={typeof window !== 'undefined' ? window.location.pathname + window.location.search : undefined}
      />
      <Link
        href={`/expert/${expertId}`}
        className="block px-6 py-3 border border-cyber-green/30 text-custom-text rounded-lg hover:bg-dark-green-800/50 transition-colors text-center"
      >
        View Expert Profile
      </Link>
    </div>
  );
}

