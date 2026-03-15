/**
 * Check if an email already has an account (profile exists).
 * Used by access-purchase flow to show "Sign in" vs "Create account".
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email")?.trim();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id")
      .ilike("email", email)
      .limit(1);

    return NextResponse.json({
      exists: (profiles?.length ?? 0) > 0,
    });
  } catch (err: unknown) {
    console.error("Check email error:", err);
    return NextResponse.json(
      { error: "Failed to check email" },
      { status: 500 }
    );
  }
}
