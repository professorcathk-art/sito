import { createClient } from "@/lib/supabase/server";
import { Navigation } from "@/components/navigation";
import { notFound } from "next/navigation";
import Link from "next/link";

interface CoursePageProps {
  params: {
    id: string;
  };
}

export default async function CoursePage({ params }: CoursePageProps) {
  const supabase = await createClient();
  
  const { data: course, error } = await supabase
    .from("courses")
    .select(`
      *,
      profiles:expert_id (
        id,
        name,
        title,
        avatar_url
      )
    `)
    .eq("id", params.id)
    .single();

  if (error || !course) {
    notFound();
  }

  // Get lessons
  const { data: lessons } = await supabase
    .from("course_lessons")
    .select("*")
    .eq("course_id", course.id)
    .order("order_index", { ascending: true });

  return (
    <div className="min-h-screen bg-custom-bg">
      <Navigation />
      <div className="pt-16 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {course.cover_image_url && (
            <img
              src={course.cover_image_url}
              alt={course.title}
              className="w-full h-64 object-cover rounded-lg mb-8"
            />
          )}
          
          <h1 className="text-4xl font-bold text-custom-text mb-4">{course.title}</h1>
          
          {course.profiles && (
            <div className="flex items-center gap-4 mb-6">
              {course.profiles.avatar_url && (
                <img
                  src={course.profiles.avatar_url}
                  alt={course.profiles.name || "Expert"}
                  className="w-12 h-12 rounded-full"
                />
              )}
              <div>
                <p className="text-custom-text font-semibold">{course.profiles.name || "Expert"}</p>
                {course.profiles.title && (
                  <p className="text-custom-text/70 text-sm">{course.profiles.title}</p>
                )}
              </div>
            </div>
          )}

          <div className="bg-dark-green-800/30 border border-cyber-green/30 rounded-lg p-6 mb-8">
            <p className="text-custom-text/80 mb-4">{course.description}</p>
            <div className="flex items-center gap-4">
              <span className="text-2xl font-bold text-cyber-green">
                {course.is_free ? "Free" : `$${course.price}`}
              </span>
              {!course.is_free && (
                <span className="text-custom-text/60">One-time payment</span>
              )}
            </div>
          </div>

          {lessons && lessons.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-custom-text mb-4">Lessons</h2>
              <div className="space-y-3">
                {lessons.map((lesson, index) => (
                  <div
                    key={lesson.id}
                    className="bg-dark-green-800/30 border border-cyber-green/30 rounded-lg p-4"
                  >
                    <div className="flex items-start gap-4">
                      <span className="flex-shrink-0 w-8 h-8 bg-cyber-green text-dark-green-900 rounded-full flex items-center justify-center font-bold">
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-custom-text mb-1">
                          {lesson.title}
                        </h3>
                        {lesson.description && (
                          <p className="text-custom-text/70 text-sm mb-2">{lesson.description}</p>
                        )}
                        {lesson.video_url && (
                          <a
                            href={lesson.video_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-cyber-green hover:text-cyber-green-light text-sm"
                          >
                            Watch Video →
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <Link
              href={`/courses/${course.id}/edit`}
              className="px-6 py-3 bg-cyber-green text-dark-green-900 font-semibold rounded-lg hover:bg-cyber-green-light transition-colors"
            >
              Edit Course
            </Link>
            <Link
              href="/courses/create"
              className="px-6 py-3 border border-cyber-green/30 text-custom-text rounded-lg hover:bg-dark-green-800/50 transition-colors"
            >
              Back to Courses
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

