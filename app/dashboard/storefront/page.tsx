import { Suspense } from "react";
import { UnifiedStorefrontBuilder } from "@/components/unified-storefront-builder";

export default function StorefrontEditorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 p-8 text-slate-400">Loading storefront…</div>}>
      <UnifiedStorefrontBuilder />
    </Suspense>
  );
}
