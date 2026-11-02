import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MailGuard AI — Zero-Data-Leak Spam Email Classifier",
  description:
    "Private in-browser spam email classification powered by a PyTorch BiLSTM neural network and ONNX Runtime Web. Email content is never transmitted.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable}`}>
      <body className="bg-canvas-50 text-slate-900 min-h-screen antialiased selection:bg-teal-500/20 selection:text-teal-900">
        {children}
      </body>
    </html>
  );
}
