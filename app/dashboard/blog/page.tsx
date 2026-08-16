import { redirect } from "next/navigation";

export default function DashboardBlogRedirect() {
  redirect("/dashboard/posts");
}
