import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/utils/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !(await isAdmin(user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createServiceRoleClient();
  const { data: requests, error } = await admin
    .from("payout_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    if (/relation|does not exist|payout_requests/i.test(error.message)) {
      return NextResponse.json({
        requests: [],
        migrationRequired: true,
        message: "Run migration 059_hybrid_payouts.sql",
      });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const userIds = Array.from(new Set((requests || []).map((r) => r.user_id)));
  let profiles: Record<string, { name?: string; email?: string }> = {};
  if (userIds.length) {
    const { data: profs } = await admin.from("profiles").select("id, name, email").in("id", userIds);
    (profs || []).forEach((p) => {
      profiles[p.id] = p;
    });
  }

  const enriched = (requests || []).map((r) => ({
    ...r,
    creator_name: profiles[r.user_id]?.name || "Creator",
    creator_email: profiles[r.user_id]?.email || "",
  }));

  return NextResponse.json({ requests: enriched });
}
