import { redirect } from "next/navigation";

export default function FinanceSalesPage() {
  redirect("/dashboard/earnings?tab=sales");
}
