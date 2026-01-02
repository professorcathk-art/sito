import Link from "next/link";
import { RegisterForm } from "@/components/register-form";

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-custom-bg flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-bold text-cyber-green inline-block mb-2">
            Sito
          </Link>
          <h1 className="text-3xl font-bold text-custom-text mb-2">Create Account</h1>
          <p className="text-custom-text/80">Join Sito and connect with industry experts</p>
        </div>
        <RegisterForm />
        <p className="text-center mt-6 text-custom-text/80">
          Already have an account?{" "}
          <Link href="/login" className="text-cyber-green font-semibold hover:text-cyber-green-light hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

