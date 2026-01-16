import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Reserved slugs that cannot be used
const RESERVED_SLUGS = [
  "admin", "api", "dashboard", "login", "register", "profile", "settings",
  "products", "courses", "blog", "messages", "connections", "expert",
  "appointments", "subscriptions", "stripe", "s", "about", "privacy", "terms"
];

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await request.json();

    if (!slug || typeof slug !== "string") {
      return NextResponse.json({ 
        available: false, 
        error: "Slug is required" 
      });
    }

    // Normalize slug to lowercase
    const normalizedSlug = slug.toLowerCase().trim();

    // Validate format
    if (!/^[a-z0-9-]+$/.test(normalizedSlug)) {
      return NextResponse.json({ 
        available: false, 
        error: "Slug must contain only lowercase letters, numbers, and hyphens" 
      });
    }

    if (normalizedSlug.length < 3 || normalizedSlug.length > 50) {
      return NextResponse.json({ 
        available: false, 
        error: "Slug must be between 3 and 50 characters" 
      });
    }

    // Check if slug is reserved
    if (RESERVED_SLUGS.includes(normalizedSlug)) {
      return NextResponse.json({ 
        available: false, 
        error: "This slug is reserved and cannot be used" 
      });
    }

    // Check if slug exists (excluding current user's slug)
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("custom_slug", normalizedSlug)
      .neq("id", user.id)
      .maybeSingle();

    return NextResponse.json({ 
      available: !existing,
      message: existing ? "This slug is already taken" : "Available"
    });
  } catch (error: any) {
    console.error("Error checking slug:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
