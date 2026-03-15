/**
 * Create a questionnaire response for guest users (no auth required).
 * Used when guest checkout - stores response with user_id null.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { questionnaireId, responses, guestEmail } = body;

    if (!questionnaireId || !responses || typeof responses !== "object") {
      return NextResponse.json(
        { error: "questionnaireId and responses are required" },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from("questionnaire_responses")
      .insert({
        questionnaire_id: questionnaireId,
        user_id: null,
        responses: { ...responses, _guest_email: guestEmail || extractEmailFromResponses(responses) },
      })
      .select("id")
      .single();

    if (error) {
      console.error("Guest questionnaire response error:", error);
      return NextResponse.json(
        { error: error.message || "Failed to save response" },
        { status: 500 }
      );
    }

    return NextResponse.json({ id: data.id });
  } catch (err: any) {
    console.error("Guest questionnaire API error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to save response" },
      { status: 500 }
    );
  }
}

function extractEmailFromResponses(responses: Record<string, unknown>): string | null {
  for (const [key, val] of Object.entries(responses)) {
    if (typeof val === "string" && val.includes("@") && val.includes(".")) {
      return val;
    }
  }
  return null;
}
