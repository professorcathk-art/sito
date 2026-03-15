import { NextRequest, NextResponse } from "next/server";
import { sendBookingRequestEmail, sendBookingRequestUserEmail } from "@/lib/resend-booking-emails";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { expertEmail, expertName, userName, userEmail, slotTime } = body;

    if (!expertEmail || !expertName || !userName || !userEmail || !slotTime) {
      return NextResponse.json(
        { error: "Missing required fields: expertEmail, expertName, userName, userEmail, slotTime" },
        { status: 400 }
      );
    }

    const [expertResult, userResult] = await Promise.all([
      sendBookingRequestEmail(expertEmail, expertName, userName, userEmail, slotTime),
      sendBookingRequestUserEmail(userEmail, userName, expertName, slotTime),
    ]);

    if (!expertResult.success) {
      return NextResponse.json(
        { error: expertResult.error || "Failed to send booking request email to expert" },
        { status: 500 }
      );
    }
    // User email is best-effort; don't fail if it doesn't send
    if (!userResult.success) {
      console.warn("Failed to send user booking request email:", userResult.error);
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Booking request email error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send email" },
      { status: 500 }
    );
  }
}
