"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck, Lock, Mail, ArrowRight, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams?.get("redirectTo") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const supabase = createClient();
    if (!supabase) {
      setError("Supabase configuration missing in .env.local (NEXT_PUBLIC_SUPABASE_URL).");
      return;
    }

    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
    } else {
      router.push(redirectTo);
      router.refresh();
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <div>
        <label
          htmlFor="email"
          className="block text-xs font-semibold text-slate-700 mb-1"
        >
          Email Address
        </label>
        <div className="relative">
          <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            className="w-full text-xs pl-9 pr-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-slate-900 placeholder:text-slate-400"
          />
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-1">
          <label
            htmlFor="password"
            className="block text-xs font-semibold text-slate-700"
          >
            Password
          </label>
          <Link
            href="/auth/reset-password"
            className="text-[11px] font-semibold text-teal-600 hover:text-teal-700"
          >
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full text-xs pl-9 pr-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-slate-900 placeholder:text-slate-400"
          />
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-coral-50 border border-coral-200 text-xs text-coral-700 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-coral-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-semibold text-xs shadow-sm transition-all disabled:opacity-50 cursor-pointer"
      >
        {loading ? (
          <>
            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            <span>Verifying credentials...</span>
          </>
        ) : (
          <>
            <span>Sign In</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </>
        )}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-canvas-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center shadow-lg shadow-teal-500/20 text-white font-bold">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <span className="font-extrabold text-slate-900 text-xl tracking-tight">MailGuard AI</span>
        </Link>
        <h2 className="text-xl font-bold text-slate-900">Sign in to your account</h2>
        <p className="mt-1 text-xs text-slate-500">
          Sync your prediction history and configure data storage preferences
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-2xl border border-slate-200/80 shadow-card space-y-6">
          <Suspense fallback={<div className="p-4 text-center text-xs text-slate-400">Loading form...</div>}>
            <LoginForm />
          </Suspense>

          <div className="border-t border-slate-100 pt-4 text-center space-y-2">
            <p className="text-xs text-slate-500">
              Don&apos;t have an account?{" "}
              <Link
                href="/auth/signup"
                className="font-semibold text-teal-600 hover:text-teal-700"
              >
                Create one now
              </Link>
            </p>
            <p className="text-[11px] text-slate-400">
              <Link href="/" className="hover:text-slate-600 underline">
                Continue as Guest (Local In-Browser Inference)
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
