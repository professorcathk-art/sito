import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Public: fetch an active lead magnet + attached form fields for storefront modal */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: magnet, error } = await supabase
      .from("lead_magnets")
      .select(
        "id, expert_id, title, subtitle, cta_text, placeholder, success_message, cover_image_url, material_type, file_name, questionnaire_id, instant_download, is_active"
      )
      .eq("id", id)
      .eq("is_active", true)
      .maybeSingle();

    if (error || !magnet) {
      return NextResponse.json({ error: "Lead magnet not found" }, { status: 404 });
    }

    let fields: Array<{
      id: string;
      field_type: string;
      label: string;
      placeholder: string | null;
      required: boolean;
      options: string[] | null;
      order_index: number;
    }> = [];

    if (magnet.questionnaire_id) {
      const { data: fieldRows } = await supabase
        .from("questionnaire_fields")
        .select("id, field_type, label, placeholder, required, options, order_index")
        .eq("questionnaire_id", magnet.questionnaire_id)
        .order("order_index", { ascending: true });
      fields = (fieldRows || []).map((f) => ({
        ...f,
        options: Array.isArray(f.options) ? (f.options as string[]) : null,
      }));
    }

    return NextResponse.json({ magnet, fields });
  } catch (err) {
    console.error("lead-magnets GET error:", err);
    return NextResponse.json({ error: "Failed to load lead magnet" }, { status: 500 });
  }
}
