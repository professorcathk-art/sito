import type { Metadata } from "next";
import { Inter, Playfair_Display, Roboto, Space_Grotesk, DM_Sans } from "next/font/google";
import "./globals.css";
import { AuthProviderWrapper } from "@/components/auth-provider-wrapper";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-roboto",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sito - Global Industry Experts Directory",
  description: "Find industry experts to guide your career path, solve problems, and provide professional advice",
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
  },
  icons: {
    icon: '/icon',
    apple: '/apple-icon',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable} ${roboto.variable} ${spaceGrotesk.variable} ${dmSans.variable}`}>
      <body className="antialiased">
        <AuthProviderWrapper>{children}</AuthProviderWrapper>
      </body>
    </html>
  );
}

