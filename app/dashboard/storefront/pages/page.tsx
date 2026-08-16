import { redirect } from "next/navigation";

export default function StorefrontPagesRedirect() {
  redirect("/dashboard/storefront?tab=pages");
}
