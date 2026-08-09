import { createClient } from "@/lib/supabase/server";

/**
 * Admin access is controlled by profiles.is_admin (boolean).
 * Set via Supabase SQL, e.g.:
 *   UPDATE profiles SET is_admin = true WHERE email = 'professor.cat.hk@gmail.com';
 * Optional extra allowlist: ADMIN_EMAILS=comma,separated@emails
 */
export async function isAdmin(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("is_admin, email")
    .eq("id", userId)
    .single();

  if (error || !data) return false;
  if (data.is_admin === true) return true;

  const allowlist = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (allowlist.length && data.email && allowlist.includes(String(data.email).toLowerCase())) {
    return true;
  }
  return false;
}

export async function requireAdmin(userId: string): Promise<void> {
  const admin = await isAdmin(userId);
  if (!admin) {
    throw new Error("Unauthorized: Admin access required");
  }
}


