import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { expert_id, user_name } = body;

    if (!expert_id || !user_name) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get expert email from profile
    const supabase = await createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, name")
      .eq("id", expert_id)
      .single();

    if (!profile || !profile.email) {
      return NextResponse.json(
        { error: "Expert email not found" },
        { status: 404 }
      );
    }

    // Send email notification
    if (!process.env.RESEND_API_KEY) {
      console.warn("RESEND_API_KEY not set - email notification will not be sent");
      return NextResponse.json({ success: true, warning: "Email service not configured" });
    }

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Sito <onboarding@resend.dev>", // Update with your verified domain
        to: [profile.email],
        subject: `New Connection Request from ${user_name} on Sito`,
        html: `
          <h2>You have a new connection request!</h2>
          <p><strong>From:</strong> ${user_name}</p>
          <p>Log in to your dashboard to accept or reject the connection request.</p>
          <p><a href="${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/connections">View Connections</a></p>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json();
      console.error("Email service error:", errorData);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Notification error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send notification" },
      { status: 500 }
    );
  }
}

