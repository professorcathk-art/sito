import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { HONEYPOT_FIELD, isHoneypotTriggered } from "@/lib/honeypot";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Invisible honeypot — bots fill this; return fake success
    if (isHoneypotTriggered(body[HONEYPOT_FIELD] ?? body.website_url_hp)) {
      return NextResponse.json({
        success: true,
        successMessage: "You're in! Check your inbox soon.",
      });
    }

    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const expertId = typeof body.expertId === "string" ? body.expertId : "";
    const expertName = typeof body.expertName === "string" ? body.expertName : "Expert";
    const leadMagnetId = typeof body.leadMagnetId === "string" ? body.leadMagnetId : "";
    const leadTitle = typeof body.leadTitle === "string" ? body.leadTitle : "Lead magnet";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const responses =
      body.responses && typeof body.responses === "object"
        ? (body.responses as Record<string, string>)
        : {};

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

    let downloadUrl: string | null = null;
    let externalLink: string | null = null;
    let successMessage = "You're in! Check your inbox soon.";
    let magnetTitle = leadTitle;
    let questionnaireResponseId: string | null = null;

    // New path: first-class lead magnet
    if (leadMagnetId) {
      const { data: magnet, error: magnetError } = await supabase
        .from("lead_magnets")
        .select("*")
        .eq("id", leadMagnetId)
        .eq("expert_id", expertId)
        .eq("is_active", true)
        .maybeSingle();

      if (magnetError || !magnet) {
        return NextResponse.json({ error: "Lead magnet not found" }, { status: 404 });
      }

      magnetTitle = magnet.title || leadTitle;
      successMessage = magnet.success_message || successMessage;
      downloadUrl = magnet.material_type === "file" ? magnet.file_url : null;
      externalLink = magnet.material_type === "link" ? magnet.external_link : magnet.file_url;

      if (magnet.questionnaire_id && Object.keys(responses).length > 0) {
        const { data: qRes, error: qErr } = await supabase
          .from("questionnaire_responses")
          .insert({
            questionnaire_id: magnet.questionnaire_id,
            responses,
          })
          .select("id")
          .single();
        if (!qErr && qRes) questionnaireResponseId = qRes.id;
      }

      const { error: subError } = await supabase.from("lead_submissions").insert({
        lead_magnet_id: magnet.id,
        expert_id: expertId,
        email,
        name: name || responses.name || email.split("@")[0],
        questionnaire_response_id: questionnaireResponseId,
        responses,
      });

      if (subError) {
        // Table may not exist yet — fall through to legacy contact_messages
        console.warn("lead_submissions insert failed, falling back:", subError.message);
        if (!/relation|does not exist|lead_submissions/i.test(subError.message)) {
          return NextResponse.json({ error: "Failed to save your signup." }, { status: 500 });
        }
      } else {
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
              subject: `New lead: ${magnetTitle}`,
              html: `
                <h2>New lead magnet signup</h2>
                <p><strong>Offer:</strong> ${magnetTitle}</p>
                <p><strong>Email:</strong> ${email}</p>
                ${name ? `<p><strong>Name:</strong> ${name}</p>` : ""}
              `,
            }),
          });
        }

        return NextResponse.json({
          success: true,
          successMessage,
          downloadUrl: magnet.instant_download ? downloadUrl : null,
          externalLink: magnet.instant_download ? externalLink : null,
          fileName: magnet.file_name || null,
        });
      }
    }

    // Legacy fallback: contact_messages
    const subject = `Storefront lead [${expertId}]: ${magnetTitle}`;
    const message = `New lead magnet signup from ${expertName}'s storefront (${magnetTitle}). expert_id:${expertId}`;

    let insertError: { message: string } | null = null;
    const withExpert = await supabase.from("contact_messages").insert({
      name: name || email.split("@")[0],
      email,
      subject,
      message,
      expert_id: expertId,
    });
    insertError = withExpert.error;

    if (insertError && /expert_id|column/i.test(insertError.message)) {
      const fallback = await supabase.from("contact_messages").insert({
        name: name || email.split("@")[0],
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
          subject: `New storefront lead: ${magnetTitle}`,
          html: `
            <h2>New lead from your storefront</h2>
            <p><strong>Offer:</strong> ${magnetTitle}</p>
            <p><strong>Email:</strong> ${email}</p>
          `,
        }),
      });
    }

    return NextResponse.json({
      success: true,
      successMessage,
      downloadUrl,
      externalLink,
    });
  } catch (error) {
    console.error("storefront-lead error:", error);
    return NextResponse.json({ error: "Failed to capture lead" }, { status: 500 });
  }
}
