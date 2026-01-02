import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, expertId, userId, userEmail } = body;

    if (!productId || !expertId || !userId || !userEmail) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get expert email and product details
    const supabase = await createClient();
    const [profileRes, productRes, userProfileRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("email, name")
        .eq("id", expertId)
        .single(),
      supabase
        .from("products")
        .select("name")
        .eq("id", productId)
        .single(),
      supabase
        .from("profiles")
        .select("name")
        .eq("id", userId)
        .single(),
    ]);

    const expertProfile = profileRes.data;
    const product = productRes.data;
    const userProfile = userProfileRes.data;

    if (!expertProfile || !expertProfile.email) {
      return NextResponse.json(
        { error: "Expert email not found" },
        { status: 404 }
      );
    }

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
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
        to: [expertProfile.email],
        subject: `New Interest in Your Product: ${product.name}`,
        html: `
          <h2>Someone registered interest in your product!</h2>
          <p><strong>Product:</strong> ${product.name}</p>
          <p><strong>Interested User:</strong> ${userProfile?.name || "Anonymous"} (${userEmail})</p>
          <p>View all registered interests in your dashboard.</p>
          <p><a href="${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/products">View Products & Interests</a></p>
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

