import { redirect } from "next/navigation";

/** Legacy route — keep for bookmarks; new IA lives under /dashboard/products */
export default function ProductsPage() {
  redirect("/dashboard/products");
}
