import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/utils/admin";

/**
 * Server-side gate: only profiles with is_admin = true can access /admin/*
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/admin");
  }

  const allowed = await isAdmin(user.id);
  if (!allowed) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
