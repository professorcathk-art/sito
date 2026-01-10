import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    const body = await request.json();
    const { action, courseId, userId, userEmail } = body;

    if (!action || !courseId) {
      return NextResponse.json({ error: "Missing required fields: action, courseId" }, { status: 400 });
    }

    // Use service role client for database operations that need to bypass RLS
    const supabaseAdmin = createServiceRoleClient();

    // Verify the expert owns the course
    const { data: course, error: courseError } = await supabaseAdmin
      .from("courses")
      .select("expert_id")
      .eq("id", courseId)
      .single();

    if (courseError || !course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    if (course.expert_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized. You can only manage enrollments for your own courses." }, { status: 403 });
    }

    if (action === "invite") {
      // Invite user by email
      if (!userEmail) {
        return NextResponse.json({ error: "Missing required field: userEmail" }, { status: 400 });
      }

      // Find user by email in profiles table
      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("id, email")
        .ilike("email", userEmail)
        .maybeSingle();

      if (profileError) {
        console.error("Error finding user:", profileError);
        return NextResponse.json({ error: "Failed to find user" }, { status: 500 });
      }

      if (!profile) {
        return NextResponse.json({ error: `User with email ${userEmail} not found. Please ask them to sign up first.` }, { status: 404 });
      }

      const targetUserId = profile.id;

      // Check if enrollment already exists
      const { data: existingEnrollment } = await supabaseAdmin
        .from("course_enrollments")
        .select("id")
        .eq("course_id", courseId)
        .eq("user_id", targetUserId)
        .maybeSingle();

      if (existingEnrollment) {
        return NextResponse.json({ error: "User is already enrolled in this course" }, { status: 400 });
      }

      // Create enrollment
      const { data: enrollment, error: enrollError } = await supabaseAdmin
        .from("course_enrollments")
        .insert({
          course_id: courseId,
          user_id: targetUserId,
          user_email: userEmail, // Store email for reference
          payment_intent_id: null, // Free enrollment
        })
        .select()
        .single();

      if (enrollError) {
        console.error("Error creating enrollment:", enrollError);
        return NextResponse.json({ error: "Failed to enroll user" }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: `Successfully invited ${userEmail} to the course`,
        enrollment,
      });

    } else if (action === "remove") {
      // Remove user from course
      const { enrollmentId, userId, userEmail } = body;

      // If enrollmentId is provided, use it directly (most reliable)
      if (enrollmentId) {
        // Verify the enrollment belongs to this course
        const { data: enrollment } = await supabaseAdmin
          .from("course_enrollments")
          .select("id, course_id")
          .eq("id", enrollmentId)
          .single();

        if (!enrollment) {
          return NextResponse.json({ error: "Enrollment not found" }, { status: 404 });
        }

        if (enrollment.course_id !== courseId) {
          return NextResponse.json({ error: "Enrollment does not belong to this course" }, { status: 403 });
        }

        // Delete enrollment by ID
        const { error: deleteError } = await supabaseAdmin
          .from("course_enrollments")
          .delete()
          .eq("id", enrollmentId);

        if (deleteError) {
          console.error("Error removing enrollment:", deleteError);
          return NextResponse.json({ error: "Failed to remove user from course" }, { status: 500 });
        }

        return NextResponse.json({
          success: true,
          message: "User successfully removed from course",
        });
      }

      // Fallback: use userId or userEmail
      if (!userId && !userEmail) {
        return NextResponse.json({ error: "Missing required field: enrollmentId, userId, or userEmail" }, { status: 400 });
      }

      let targetUserId = userId;

      // If only email provided, find user ID
      if (!targetUserId && userEmail) {
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .ilike("email", userEmail)
          .maybeSingle();

        if (!profile) {
          return NextResponse.json({ error: `User with email ${userEmail} not found` }, { status: 404 });
        }
        targetUserId = profile.id;
      }

      // Delete enrollment
      const { error: deleteError } = await supabaseAdmin
        .from("course_enrollments")
        .delete()
        .eq("course_id", courseId)
        .eq("user_id", targetUserId);

      if (deleteError) {
        console.error("Error removing enrollment:", deleteError);
        return NextResponse.json({ error: "Failed to remove user from course" }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: "User successfully removed from course",
      });

    } else {
      return NextResponse.json({ error: "Invalid action. Use 'invite' or 'remove'" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Error managing enrollment:", error);
    return NextResponse.json({ error: error.message || "Failed to manage enrollment" }, { status: 500 });
  }
}
