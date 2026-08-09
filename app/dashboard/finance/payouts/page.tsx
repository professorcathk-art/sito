import { redirect } from "next/navigation";

export default function FinancePayoutsPage() {
  redirect("/dashboard/earnings?tab=payouts");
}
