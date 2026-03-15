import { NextRequest, NextResponse } from "next/server";
import { sendBookingConfirmedEmail } from "@/lib/resend-booking-emails";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userEmail, userName, expertName, dateTime, meetingLink, whatToExpect } = body;

    if (!userEmail || !userName || !expertName || !dateTime) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: userEmail, userName, expertName, dateTime",
        },
        { status: 400 }
      );
    }

    const result = await sendBookingConfirmedEmail(
      userEmail,
      userName,
      expertName,
      dateTime,
      meetingLink || "To be provided",
      whatToExpect ?? null
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to send booking confirmation email" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Booking confirmation email error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send email" },
      { status: 500 }
    );
  }
}
