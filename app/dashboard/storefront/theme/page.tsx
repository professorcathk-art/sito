import { redirect } from "next/navigation";

export default function StorefrontThemePage() {
  redirect("/dashboard/storefront?tab=design");
}
