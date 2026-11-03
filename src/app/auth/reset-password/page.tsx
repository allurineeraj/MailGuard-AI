"use client";

import { useState } from "react";
import Link from "next/link";
import { ShieldCheck, Mail, Lock, ArrowRight, AlertTriangle, CheckCircle2 } from "lucide-react";
import { createClient } from "../../../lib/supabase/client";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentSuccess, setSentSuccess] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const supabase = createClient();
    if (!supabase) {
      setError("Supabase configuration missing in .env.local.");
      return;
    }

    setLoading(true);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/settings`,
    });

    if (resetError) {
      setError(resetError.message);
    } else {
      setSentSuccess(true);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-canvas-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center shadow-lg shadow-teal-500/20 text-white font-bold">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <span className="font-extrabold text-slate-900 text-xl tracking-tight">MailGuard AI</span>
        </Link>
        <h2 className="text-xl font-bold text-slate-900">Reset your password</h2>
        <p className="mt-1 text-xs text-slate-500">
          Enter your email to receive a password reset link
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-2xl border border-slate-200/80 shadow-card space-y-6">
          {sentSuccess ? (
            <div className="p-4 bg-teal-50 border border-teal-200 text-teal-800 rounded-xl text-xs space-y-3">
              <div className="flex items-center gap-2 font-bold text-teal-900">
                <CheckCircle2 className="w-5 h-5 text-teal-600" />
                <span>Password Reset Email Sent</span>
              </div>
              <p className="leading-relaxed">
                If an account exists for <strong>{email}</strong>, a recovery link has been dispatched to your inbox. Follow the link to choose a new password.
              </p>
              <Link
                href="/auth/login"
                className="inline-block mt-2 px-4 py-2 bg-teal-600 text-white rounded-lg font-semibold text-xs hover:bg-teal-700"
              >
                Return to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
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
                    <span>Sending reset link...</span>
                  </>
                ) : (
                  <>
                    <span>Send Reset Email</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          )}

          <div className="border-t border-slate-100 pt-4 text-center">
            <Link
              href="/auth/login"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
