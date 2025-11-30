import Link from "next/link";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-custom-bg flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-bold text-cyber-green inline-block mb-2">
            Sito
          </Link>
          <h1 className="text-3xl font-bold text-custom-text mb-2">Welcome Back</h1>
          <p className="text-custom-text/80">Sign in to your account to continue</p>
        </div>
        <LoginForm />
        <p className="text-center mt-6 text-custom-text/80">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-cyber-green font-semibold hover:text-cyber-green-light hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

