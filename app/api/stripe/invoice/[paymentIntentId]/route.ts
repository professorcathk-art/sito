/**
 * API Route: Get Invoice/Receipt for Payment Intent
 * 
 * This endpoint generates a receipt/invoice PDF or HTML for a Stripe payment.
 * Stripe Checkout Sessions automatically send receipt emails, but we can also
 * create custom invoices using the Invoice API or generate receipts from payment data.
 */

import { NextRequest, NextResponse } from "next/server";
import { getStripeClient } from "@/lib/stripe/server";
import { createClient } from "@/lib/supabase/server";
import Stripe from "stripe";

export async function GET(
  request: NextRequest,
  { params }: { params: { paymentIntentId: string } }
) {
  try {
    const stripeClient = getStripeClient();
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { paymentIntentId } = params;

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: "Payment intent ID is required" },
        { status: 400 }
      );
    }

    // Retrieve payment intent
    const paymentIntent = await stripeClient.paymentIntents.retrieve(paymentIntentId);

    // Verify user owns this payment (check appointments or enrollments)
    const { data: appointment } = await supabase
      .from("appointments")
      .select("id, user_id, expert_id, total_amount, start_time, end_time")
      .eq("payment_intent_id", paymentIntentId)
      .eq("user_id", user.id)
      .maybeSingle();

    const { data: enrollment } = await supabase
      .from("course_enrollments")
      .select("id, user_id, courses(title, price)")
      .eq("payment_intent_id", paymentIntentId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!appointment && !enrollment) {
      return NextResponse.json(
        { error: "Payment not found or access denied" },
        { status: 403 }
      );
    }

    // Get checkout session if available
    let checkoutSession: Stripe.Checkout.Session | null = null;
    if (paymentIntent.metadata?.checkout_session_id) {
      try {
        checkoutSession = await stripeClient.checkout.sessions.retrieve(
          paymentIntent.metadata.checkout_session_id
        );
      } catch (err) {
        console.error("Error retrieving checkout session:", err);
      }
    }

    // Generate HTML receipt
    const receiptHtml = generateReceiptHtml(paymentIntent, appointment, enrollment, checkoutSession);

    // Return HTML receipt
    return new NextResponse(receiptHtml, {
      headers: {
        "Content-Type": "text/html",
        "Content-Disposition": `inline; filename="receipt-${paymentIntentId.slice(0, 20)}.html"`,
      },
    });
  } catch (error: any) {
    console.error("Error generating invoice:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate invoice" },
      { status: 500 }
    );
  }
}

function generateReceiptHtml(
  paymentIntent: Stripe.PaymentIntent,
  appointment: any,
  enrollment: any,
  checkoutSession: Stripe.Checkout.Session | null
): string {
  const amount = (paymentIntent.amount / 100).toFixed(2);
  const currency = paymentIntent.currency.toUpperCase();
  const date = new Date(paymentIntent.created * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  let itemDescription = "";
  let itemDetails = "";

  if (appointment) {
    itemDescription = "1-on-1 Appointment Session";
    const startTime = new Date(appointment.start_time).toLocaleString("en-US");
    const endTime = new Date(appointment.end_time).toLocaleString("en-US");
    itemDetails = `
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #333;">Appointment Time</td>
        <td style="padding: 8px 0; border-bottom: 1px solid #333; text-align: right;">${startTime} - ${endTime}</td>
      </tr>
    `;
  } else if (enrollment) {
    itemDescription = enrollment.courses?.title || "Course Enrollment";
    itemDetails = `
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #333;">Course</td>
        <td style="padding: 8px 0; border-bottom: 1px solid #333; text-align: right;">${enrollment.courses?.title || "N/A"}</td>
      </tr>
    `;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Receipt - ${paymentIntent.id}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          max-width: 800px;
          margin: 40px auto;
          padding: 20px;
          background: #0a1a0f;
          color: #e0e0e0;
        }
        .header {
          text-align: center;
          margin-bottom: 40px;
          padding-bottom: 20px;
          border-bottom: 2px solid #00ff88;
        }
        .header h1 {
          color: #00ff88;
          margin: 0;
        }
        .receipt-info {
          background: #1a2a1f;
          border: 1px solid #00ff8833;
          border-radius: 8px;
          padding: 24px;
          margin-bottom: 20px;
        }
        .receipt-info h2 {
          color: #00ff88;
          margin-top: 0;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        th {
          text-align: left;
          padding: 12px 0;
          border-bottom: 2px solid #00ff88;
          color: #00ff88;
        }
        td {
          padding: 8px 0;
          border-bottom: 1px solid #333;
        }
        .total {
          font-size: 1.2em;
          font-weight: bold;
          color: #00ff88;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #333;
          text-align: center;
          color: #888;
          font-size: 0.9em;
        }
        .print-button {
          text-align: center;
          margin: 20px 0;
        }
        button {
          background: #00ff88;
          color: #0a1a0f;
          border: none;
          padding: 12px 24px;
          border-radius: 6px;
          font-weight: bold;
          cursor: pointer;
          font-size: 16px;
        }
        button:hover {
          background: #00cc6a;
        }
        @media print {
          .print-button {
            display: none;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Receipt</h1>
        <p style="color: #888;">Sito Marketplace</p>
      </div>

      <div class="receipt-info">
        <h2>Payment Details</h2>
        <table>
          <tr>
            <td>Payment ID</td>
            <td style="text-align: right; font-family: monospace;">${paymentIntent.id}</td>
          </tr>
          <tr>
            <td>Date</td>
            <td style="text-align: right;">${date}</td>
          </tr>
          <tr>
            <td>Status</td>
            <td style="text-align: right; text-transform: capitalize;">${paymentIntent.status}</td>
          </tr>
        </table>
      </div>

      <div class="receipt-info">
        <h2>Item Details</h2>
        <table>
          <tr>
            <td>Item</td>
            <td style="text-align: right;">${itemDescription}</td>
          </tr>
          ${itemDetails}
          <tr>
            <td class="total">Total</td>
            <td class="total" style="text-align: right;">${currency} ${amount}</td>
          </tr>
        </table>
      </div>

      ${checkoutSession ? `
      <div class="receipt-info">
        <h2>Payment Method</h2>
        <p>${checkoutSession.payment_method_types?.[0]?.toUpperCase() || "Card"}</p>
      </div>
      ` : ""}

      <div class="print-button">
        <button onclick="window.print()">Print Receipt</button>
      </div>

      <div class="footer">
        <p>Thank you for your purchase!</p>
        <p>This is a digital receipt. No physical copy will be sent.</p>
        <p>For support, please contact us at support@sito.club</p>
      </div>
    </body>
    </html>
  `;
}
