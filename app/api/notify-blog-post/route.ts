import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { blogPostId, expertId, blogTitle } = body;

    if (!blogPostId || !expertId || !blogTitle) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get all subscribers for this expert
    const supabase = await createClient();
    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from("subscriptions")
      .select("user_id, profiles!inner(email, name)")
      .eq("expert_id", expertId);

    if (subscriptionsError) {
      console.error("Error fetching subscriptions:", subscriptionsError);
      return NextResponse.json(
        { error: "Failed to fetch subscribers" },
        { status: 500 }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ success: true, message: "No subscribers to notify" });
    }

    // Send email notification
    if (!process.env.RESEND_API_KEY) {
      console.warn("RESEND_API_KEY not set - email notifications will not be sent");
      return NextResponse.json({ success: true, warning: "Email service not configured" });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const blogUrl = `${siteUrl}/blog/${blogPostId}`;

    // Send emails to all subscribers
    const emailPromises = subscriptions.map(async (subscription: any) => {
      const subscriberEmail = subscription.profiles?.email;
      if (!subscriberEmail) return null;

      try {
        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "Sito <onboarding@resend.dev>", // Update with your verified domain
            to: [subscriberEmail],
            subject: `New Post: ${blogTitle}`,
            html: `
              <h2>New post from an expert you follow!</h2>
              <p><strong>Title:</strong> ${blogTitle}</p>
              <p>Check out the latest post from an expert you're subscribed to.</p>
              <p><a href="${blogUrl}">Read Post</a></p>
            `,
          }),
        });

        if (!emailResponse.ok) {
          const errorData = await emailResponse.json();
          console.error("Email service error:", errorData);
        }
        return emailResponse.ok;
      } catch (error) {
        console.error("Error sending email to subscriber:", error);
        return false;
      }
    });

    await Promise.all(emailPromises);

    return NextResponse.json({ success: true, notified: subscriptions.length });
  } catch (error: any) {
    console.error("Notification error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send notifications" },
      { status: 500 }
    );
  }
}

