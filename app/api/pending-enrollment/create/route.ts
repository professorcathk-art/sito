/**
 * Create a pending course enrollment for guest free product signup.
 * After user registers, fulfill-pending-purchases will create the actual enrollment.
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

    const { data, error } = await supabase
      .from("pending_course_enrollments")
      .insert({
        course_id: courseId,
        email: String(email).trim().toLowerCase(),
        payment_intent_id: null,
        questionnaire_response_id: questionnaireResponseId || null,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Create pending enrollment error:", error);
      return NextResponse.json(
        { error: error.message || "Failed to create pending enrollment" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, id: data?.id });
  } catch (err: any) {
    console.error("Pending enrollment API error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create pending enrollment" },
      { status: 500 }
    );
  }
}
