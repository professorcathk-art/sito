import { redirect } from "next/navigation";

/** Legacy /register → /signup */
export default function RegisterRedirectPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const params = new URLSearchParams();
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      if (typeof value === "string") params.set(key, value);
      else if (Array.isArray(value) && value[0]) params.set(key, value[0]);
    });
  }
  const qs = params.toString();
  redirect(qs ? `/signup?${qs}` : "/signup");
}
