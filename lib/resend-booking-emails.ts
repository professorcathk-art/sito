/**
 * Booking email utilities using Resend API.
 * Sends booking request notifications to experts and confirmation emails to users with .ics attachments.
 */

const RESEND_API_URL = "https://api.resend.com/emails";
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "Sito <onboarding@resend.dev>";

function formatDateForIcs(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeIcsText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

/**
 * Generates a base64-encoded .ics calendar attachment for the appointment.
 */
export function generateIcsAttachment(
  startTime: Date,
  endTime: Date,
  title: string,
  description: string,
  location: string
): string {
  const uid = `sito-${Date.now()}-${Math.random().toString(36).slice(2)}@sito.club`;
  const dtstamp = formatDateForIcs(new Date());
  const dtstart = formatDateForIcs(startTime);
  const dtend = formatDateForIcs(endTime);

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Sito//Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:${escapeIcsText(title)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    `LOCATION:${escapeIcsText(location)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return Buffer.from(ics, "utf-8").toString("base64");
}

/**
 * Sends a booking request notification to the expert.
 */
export async function sendBookingRequestEmail(
  expertEmail: string,
  expertName: string,
  userName: string,
  userEmail: string,
  slotTime: string
): Promise<{ success: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set - booking request email will not be sent");
    return { success: false, error: "Email service not configured" };
  }

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #1a1a1a;">New Booking Request</h2>
  <p>Hi ${escapeHtml(expertName)},</p>
  <p><strong>${escapeHtml(userName)}</strong> (${escapeHtml(userEmail)}) has requested an appointment.</p>
  <p><strong>Requested time:</strong> ${escapeHtml(slotTime)}</p>
  <p>Please confirm or adjust the booking in your dashboard.</p>
  <p><a href="${escapeHtml(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000")}/appointments" style="color: #2563eb; text-decoration: none;">View Appointments</a></p>
  <p style="margin-top: 24px; color: #666; font-size: 14px;">— Sito</p>
</body>
</html>
  `.trim();

  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [expertEmail],
      subject: `Booking request from ${userName}`,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    console.error("Resend booking request error:", err);
    return { success: false, error: err?.message || "Failed to send email" };
  }

  return { success: true };
}

/**
 * Sends a "pending confirmation" email to the user who booked.
 */
export async function sendBookingRequestUserEmail(
  userEmail: string,
  userName: string,
  expertName: string,
  slotTime: string
): Promise<{ success: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    return { success: false, error: "Email service not configured" };
  }

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #1a1a1a;">Booking Request Received</h2>
  <p>Hi ${escapeHtml(userName)},</p>
  <p>Your booking request for a session with <strong>${escapeHtml(expertName)}</strong> has been received.</p>
  <p><strong>Requested time:</strong> ${escapeHtml(slotTime)}</p>
  <p>You will receive a confirmation email once the expert approves your booking.</p>
  <p style="margin-top: 24px; color: #666; font-size: 14px;">— Sito</p>
</body>
</html>
  `.trim();

  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [userEmail],
      subject: `Your booking request is pending confirmation`,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    console.error("Resend booking request user email error:", err);
    return { success: false, error: err?.message || "Failed to send email" };
  }

  return { success: true };
}

/**
 * Sends a booking confirmation email to the user with .ics calendar attachment.
 */
export async function sendBookingConfirmedEmail(
  userEmail: string,
  userName: string,
  expertName: string,
  dateTime: string,
  meetingLink: string,
  whatToExpect?: string | null
): Promise<{ success: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set - booking confirmation email will not be sent");
    return { success: false, error: "Email service not configured" };
  }

  const title = `Appointment with ${expertName}`;
  const description = whatToExpect || `Your appointment with ${expertName}`;
  const location = meetingLink || "To be confirmed";

  // Parse dateTime for ICS (expect ISO string or similar)
  const startTime = new Date(dateTime);
  const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // default 1 hour

  const icsBase64 = generateIcsAttachment(
    startTime,
    endTime,
    title,
    description,
    location
  );

  const whatToExpectSection = whatToExpect
    ? `
  <h3 style="color: #1a1a1a; margin-top: 24px;">What to expect</h3>
  <p>${escapeHtml(stripHtml(whatToExpect))}</p>
`
    : "";

  const meetingLinkDisplay = meetingLink && meetingLink.startsWith("http")
    ? `<a href="${escapeHtml(meetingLink)}" style="color: #2563eb;">${escapeHtml(meetingLink)}</a>`
    : escapeHtml(meetingLink || "To be provided");

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #1a1a1a;">Booking Confirmed</h2>
  <p>Hi ${escapeHtml(userName)},</p>
  <p>Your appointment with <strong>${escapeHtml(expertName)}</strong> has been confirmed.</p>
  <p><strong>Date & time:</strong> ${escapeHtml(dateTime)}</p>
  <p><strong>Meeting link:</strong> ${meetingLinkDisplay}</p>
  ${whatToExpectSection}
  <p style="margin-top: 24px;">A calendar invite is attached to this email.</p>
  <p style="margin-top: 24px; color: #666; font-size: 14px;">— Sito</p>
</body>
</html>
  `.trim();

  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [userEmail],
      subject: `Booking confirmed: Appointment with ${expertName}`,
      html,
      attachments: [
        {
          filename: "appointment.ics",
          content: icsBase64,
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    console.error("Resend booking confirmed error:", err);
    return { success: false, error: err?.message || "Failed to send email" };
  }

  return { success: true };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}
