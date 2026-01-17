import { createClient } from "@/lib/supabase/server";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { CourseActions } from "@/components/course-actions";
import { notFound } from "next/navigation";
import Link from "next/link";

interface CoursePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function CoursePage({ params }: CoursePageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  try {
    const { data: course, error } = await supabase
      .from("courses")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching course:", error);
      notFound();
    }

    if (!course) {
      notFound();
    }

    // Fetch expert profile separately
    let expertProfile = null;
    if (course.expert_id) {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, name, title, avatar_url")
        .eq("id", course.expert_id)
        .single();
      
      // Don't fail if profile not found, just use defaults
      if (!profileError && profile) {
        expertProfile = profile;
      }
    }

    // Fetch product information to get e_learning_subtype, enrollment_on_request, and webinar_date_time
    // Note: category is stored in courses table, not products table
    let productInfo = null;
    
    // First try with product_type filter
    let { data: product, error: productError } = await supabase
      .from("products")
      .select("id, e_learning_subtype, enrollment_on_request, webinar_date_time, product_type, course_id")
      .eq("course_id", course.id)
      .eq("product_type", "e-learning")
      .maybeSingle();
    
    // If not found, try without product_type filter (in case it's null or different)
    if (!product && !productError) {
      const { data: productAlt, error: productAltError } = await supabase
        .from("products")
        .select("id, e_learning_subtype, enrollment_on_request, webinar_date_time, product_type, course_id")
        .eq("course_id", course.id)
        .maybeSingle();
      
      if (productAlt) {
        product = productAlt;
        productError = productAltError;
      }
    }
    
    if (product) {
      productInfo = product;
    } else {
      // Fallback: Check all products for this course_id if detailed query failed
      const { data: allProducts } = await supabase
        .from("products")
        .select("id, product_type, course_id, enrollment_on_request, e_learning_subtype, webinar_date_time")
        .eq("course_id", course.id);
      
      // If we found products but the detailed query failed, use the first e-learning product
      if (allProducts && allProducts.length > 0) {
        const eLearningProduct = allProducts.find(p => p.product_type === "e-learning") || allProducts[0];
        if (eLearningProduct) {
          productInfo = {
            id: eLearningProduct.id,
            e_learning_subtype: eLearningProduct.e_learning_subtype,
            enrollment_on_request: eLearningProduct.enrollment_on_request,
            webinar_date_time: eLearningProduct.webinar_date_time,
            product_type: eLearningProduct.product_type,
            course_id: eLearningProduct.course_id
          };
        }
      }
    }

    // Get lessons
    const { data: lessons, error: lessonsError } = await supabase
      .from("course_lessons")
      .select("*")
      .eq("course_id", course.id)
      .order("order_index", { ascending: true });

    if (lessonsError) {
      console.error("Error fetching lessons:", lessonsError);
    }

    return (
    <div className="min-h-screen bg-custom-bg flex flex-col">
      <Navigation />
      <div className="pt-16 pb-12 px-4 sm:px-6 lg:px-8 flex-1">
        <div className="max-w-4xl mx-auto">
          {course.cover_image_url && (
            <img
              src={course.cover_image_url}
              alt={course.title}
              className="w-full h-64 object-cover rounded-lg mb-8"
            />
          )}
          
          <div className="mt-8">
            <h1 className="text-4xl font-bold text-custom-text mb-4">{course.title}</h1>
            
            {/* Sub-type and Category */}
            {(productInfo?.e_learning_subtype || course.category) && (
              <div className="flex flex-wrap gap-2 mb-4">
                {productInfo?.e_learning_subtype && (
                  <span className="px-3 py-1 bg-cyber-green/20 text-cyber-green rounded-full text-sm font-medium">
                    {productInfo.e_learning_subtype === 'online-course' ? 'Online Course' :
                     productInfo.e_learning_subtype === 'ebook' ? 'Ebook' :
                     productInfo.e_learning_subtype === 'ai-prompt' ? 'AI Prompt' :
                     productInfo.e_learning_subtype === 'live-webinar' ? 'Live Webinar' :
                     productInfo.e_learning_subtype === 'other' ? 'Other' :
                     productInfo.e_learning_subtype}
                  </span>
                )}
                {course.category && (
                  <span className="px-3 py-1 bg-dark-green-800/50 text-custom-text/80 rounded-full text-sm">
                    {course.category}
                  </span>
                )}
              </div>
            )}
            
            {expertProfile && (
              <div className="flex items-center gap-4 mb-6">
                {expertProfile.avatar_url && (
                  <img
                    src={expertProfile.avatar_url}
                    alt={expertProfile.name || "Expert"}
                    className="w-12 h-12 rounded-full"
                  />
                )}
                <div>
                  <Link 
                    href={`/expert/${course.expert_id}`}
                    className="text-custom-text font-semibold hover:text-cyber-green transition-colors"
                  >
                    {expertProfile.name || "Expert"}
                  </Link>
                  {expertProfile.title && (
                    <p className="text-custom-text/70 text-sm">{expertProfile.title}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="bg-dark-green-800/30 border border-cyber-green/30 rounded-lg p-6 mb-8">
            {course.description && (
              <div 
                className="prose prose-invert prose-lg max-w-none blog-content text-custom-text/80 mb-4"
                dangerouslySetInnerHTML={{ __html: course.description }}
              />
            )}
            {/* Show webinar date/time for live webinars */}
            {productInfo?.e_learning_subtype === "live-webinar" && productInfo?.webinar_date_time && (
              <div className="mb-4 p-4 bg-cyber-green/10 border border-cyber-green/30 rounded-lg">
                <p className="text-sm text-custom-text/70 mb-1">Live Webinar Date & Time:</p>
                <p className="text-lg font-semibold text-cyber-green">
                  {new Date(productInfo.webinar_date_time).toLocaleString('en-US', {
                    timeZone: 'Asia/Hong_Kong',
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                  })} (Hong Kong Time)
                </p>
              </div>
            )}
            
            {/* Show price - "On Request" if enrollment_on_request, otherwise show price or Free */}
            <div className="flex items-center gap-4">
              {productInfo?.enrollment_on_request === true ? (
                <span className="text-2xl font-bold text-cyber-green">On Request</span>
              ) : (
                <>
                  <span className="text-2xl font-bold text-cyber-green">
                    {course.is_free ? "Free" : `$${course.price}`}
                  </span>
                  {!course.is_free && (
                    <span className="text-custom-text/60">One-time payment</span>
                  )}
                </>
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

          <CourseActions 
            courseId={course.id} 
            expertId={course.expert_id} 
            currentUserId={user?.id}
            coursePrice={course.price}
            isFree={course.is_free}
            enrollmentOnRequest={
              productInfo ? (
                productInfo.enrollment_on_request === true || 
                productInfo.enrollment_on_request === "true" ||
                productInfo.enrollment_on_request === 1
              ) : false
            }
          />
        </div>
      </div>
      <Footer />
    </div>
    );
  } catch (err) {
    console.error("Error in course page:", err);
    notFound();
  }
}

