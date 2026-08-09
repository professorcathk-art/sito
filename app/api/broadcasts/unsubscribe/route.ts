import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * One-click unsubscribe from a creator's lead broadcasts.
 * GET ?creatorId=&email=
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const creatorId = searchParams.get("creatorId") || "";
  const email = (searchParams.get("email") || "").trim().toLowerCase();

  const html = (title: string, message: string) =>
    new NextResponse(
      `<!DOCTYPE html><html><body style="font-family:system-ui;background:#0f172a;color:#e2e8f0;padding:48px;text-align:center">
        <h1 style="font-size:1.5rem">${title}</h1>
        <p style="color:#94a3b8;max-width:420px;margin:16px auto">${message}</p>
        <a href="https://www.sito.club" style="color:#38bdf8">Back to Sito</a>
      </body></html>`,
      { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );

  if (!creatorId || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return html("Invalid link", "This unsubscribe link is missing required information.");
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("broadcast_unsubscribes").upsert(
      { creator_id: creatorId, email },
      { onConflict: "creator_id,email" }
    );
    if (error && !/duplicate|unique/i.test(error.message)) {
      console.error("unsubscribe error:", error.message);
      // Still show success-ish if table missing
      if (/relation|does not exist/i.test(error.message)) {
        return html("You're unsubscribed", "You will no longer receive broadcast emails from this creator.");
      }
      return html("Something went wrong", "Please try again later or reply to the email to unsubscribe.");
    }
    return html(
      "You're unsubscribed",
      "You will no longer receive lead broadcast emails from this creator on Sito."
    );
  } catch (err) {
    console.error("unsubscribe error:", err);
    return html("Something went wrong", "Please try again later.");
  }
}
