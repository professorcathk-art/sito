import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const expertId = typeof body.expertId === "string" ? body.expertId : "";
    const expertName = typeof body.expertName === "string" ? body.expertName : "Expert";
    const leadTitle = typeof body.leadTitle === "string" ? body.leadTitle : "Lead magnet";

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
    }
    if (!expertId) {
      return NextResponse.json({ error: "Missing expert" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: expertProfile } = await supabase
      .from("profiles")
      .select("email, name")
      .eq("id", expertId)
      .maybeSingle();

    const subject = `Storefront lead [${expertId}]: ${leadTitle}`;
    const message = `New lead magnet signup from ${expertName}'s storefront (${leadTitle}). expert_id:${expertId}`;

    // Prefer expert_id column when migration 054 is applied; fall back otherwise.
    let insertError: { message: string } | null = null;
    const withExpert = await supabase.from("contact_messages").insert({
      name: email.split("@")[0],
      email,
      subject,
      message,
      expert_id: expertId,
    });
    insertError = withExpert.error;

    if (insertError && /expert_id|column/i.test(insertError.message)) {
      const fallback = await supabase.from("contact_messages").insert({
        name: email.split("@")[0],
        email,
        subject,
        message,
      });
      insertError = fallback.error;
    }

    if (insertError) {
      console.error("storefront-lead insert error:", insertError.message);
      return NextResponse.json({ error: "Failed to save your signup. Please try again." }, { status: 500 });
    }

    if (process.env.RESEND_API_KEY && expertProfile?.email) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "Sito <onboarding@resend.dev>",
          to: [expertProfile.email],
          subject: `New storefront lead: ${leadTitle}`,
          html: `
            <h2>New lead from your storefront</h2>
            <p><strong>Offer:</strong> ${leadTitle}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p>Someone signed up via your lead magnet on Sito.</p>
          `,
        }),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("storefront-lead error:", error);
    return NextResponse.json({ error: "Failed to capture lead" }, { status: 500 });
  }
}
