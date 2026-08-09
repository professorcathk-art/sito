import { redirect } from "next/navigation";

interface LearnCoursePageProps {
  params: Promise<{ courseId: string }>;
}

/** Learner-friendly alias → existing course player */
export default async function LearnCoursePage({ params }: LearnCoursePageProps) {
  const { courseId } = await params;
  redirect(`/courses/${courseId}`);
}
