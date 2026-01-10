import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userEmail,
      userName,
      surveyData,
    }: {
      userEmail: string;
      userName: string;
      surveyData?: any;
    } = body;

    if (!userEmail || !userName) {
      return NextResponse.json(
        { error: "Email and name are required" },
        { status: 400 }
      );
    }

    // Format survey data for email
    let surveyContent = "";
    if (surveyData) {
      surveyContent = "\n\n**Initial Survey Responses:**\n\n";
      
      if (surveyData.intention) {
        surveyContent += `**Intention:** ${surveyData.intention === "learn" ? "Learn from Experts" : "Share Knowledge & Experience"}\n\n`;
      }

      if (surveyData.intention === "learn") {
        if (surveyData.learningInterests && surveyData.learningInterests.length > 0) {
          surveyContent += `**Learning Interests:** ${surveyData.learningInterests.join(", ")}\n`;
        }
        if (surveyData.learningCategory) {
          surveyContent += `**Learning Category:** ${surveyData.learningCategory}\n`;
        }
        if (surveyData.learningLocation) {
          surveyContent += `**Learning Location:** ${surveyData.learningLocation}\n`;
        }
        if (surveyData.experienceLevel) {
          surveyContent += `**Experience Level:** ${surveyData.experienceLevel}\n`;
        }
        if (surveyData.age) {
          surveyContent += `**Age:** ${surveyData.age}\n`;
        }
      } else if (surveyData.intention === "teach") {
        if (surveyData.expertiseCategory) {
          surveyContent += `**Expertise Category:** ${surveyData.expertiseCategory}\n`;
        }
        if (surveyData.expertiseLevel) {
          surveyContent += `**Expertise Level:** ${surveyData.expertiseLevel}\n`;
        }
        if (surveyData.bio) {
          surveyContent += `**Bio:** ${surveyData.bio}\n`;
        }
        if (surveyData.teachingInterests && surveyData.teachingInterests.length > 0) {
          surveyContent += `**Teaching Interests:** ${surveyData.teachingInterests.join(", ")}\n`;
        }
      }

      if (surveyData.displayName) {
        surveyContent += `\n**Display Name:** ${surveyData.displayName}\n`;
      }
      if (surveyData.tagline) {
        surveyContent += `**Tagline:** ${surveyData.tagline}\n`;
      }
      if (surveyData.location) {
        surveyContent += `**Location:** ${surveyData.location}\n`;
      }
    }

    const emailContent = `
New User Registration

**User Details:**
- Name: ${userName}
- Email: ${userEmail}
${surveyContent}

---
This email was sent automatically from Sito platform.
    `.trim();

    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "Sito <onboarding@resend.dev>",
      to: ["professor.cat.hk@gmail.com"],
      subject: `New User Registration: ${userName}`,
      text: emailContent,
      html: emailContent
        .replace(/\n/g, "<br>")
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/---/g, "<hr>"),
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json(
        { error: "Failed to send email", details: error },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Error sending registration email:", error);
    return NextResponse.json(
      { error: "Failed to send email", details: error.message },
      { status: 500 }
    );
  }
}
