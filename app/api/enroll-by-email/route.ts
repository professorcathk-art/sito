/**
 * Create course enrollment by email for free courses (guest checkout).
 * Product is added to account immediately; user then signs in or creates account.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { courseId, email, questionnaireResponseId } = body;

    if (!courseId || !email) {
      return NextResponse.json(
        { error: "courseId and email are required" },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();
    const normalizedEmail = String(email).trim().toLowerCase();

    // Verify course exists and is free
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("id, is_free")
      .eq("id", courseId)
      .single();

    if (courseError || !course) {
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      );
    }

    if (!course.is_free) {
      return NextResponse.json(
        { error: "This endpoint is for free courses only" },
        { status: 400 }
      );
    }

    // Check if already enrolled (by email)
    const { data: existing } = await supabase
      .from("course_enrollments")
      .select("id")
      .eq("course_id", courseId)
      .eq("user_email", normalizedEmail)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ success: true, alreadyEnrolled: true });
    }

    // Create enrollment with user_email (user_id null until they sign in)
    const { data, error } = await supabase
      .from("course_enrollments")
      .insert({
        course_id: courseId,
        user_email: normalizedEmail,
        user_id: null,
        questionnaire_response_id: questionnaireResponseId || null,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Enroll by email error:", error);
      return NextResponse.json(
        { error: error.message || "Failed to enroll" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, id: data?.id });
  } catch (err: any) {
    console.error("Enroll by email API error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to enroll" },
      { status: 500 }
    );
  }
}
