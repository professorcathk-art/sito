import Link from "next/link";
import { Suspense } from "react";
import { RegisterForm } from "@/components/register-form";
import { RegisterPageFooter } from "@/components/register-page-footer";

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-custom-bg flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-bold text-cyber-green inline-block mb-2">
            Sito
          </Link>
          <h1 className="text-3xl font-bold text-custom-text mb-2">Create Account</h1>
          <p className="text-text-secondary">Join Sito and connect with industry experts</p>
        </div>
        <Suspense fallback={<div className="animate-pulse text-text-secondary py-8">Loading...</div>}>
          <RegisterForm />
        </Suspense>
        <Suspense fallback={null}>
          <RegisterPageFooter />
        </Suspense>
      </div>
    </div>
  );
}

