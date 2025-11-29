import type { Metadata } from "next";
import "./globals.css";
import { AuthProviderWrapper } from "@/components/auth-provider-wrapper";

export const metadata: Metadata = {
  title: "Sito - Global Industry Experts Directory",
  description: "Find industry experts to guide your career path, solve problems, and provide professional advice",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthProviderWrapper>{children}</AuthProviderWrapper>
      </body>
    </html>
  );
}

