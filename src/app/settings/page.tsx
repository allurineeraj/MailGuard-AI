"use client";

import { useState, useEffect } from "react";
import { AppShell } from "../../components/layout/AppShell";
import {
  Settings as SettingsIcon,
  User as UserIcon,
  Shield,
  Lock,
  LogOut,
  Database,
  CheckCircle2,
  AlertTriangle,
  Save,
  Key,
} from "lucide-react";
import { createClient } from "../../lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [storeEmailBody, setStoreEmailBody] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user) {
        // Fetch user preferences
        supabase
          .from("user_settings")
          .select("store_email_body")
          .eq("user_id", data.user.id)
          .single()
          .then(({ data: settings }) => {
            if (settings) {
              setStoreEmailBody(settings.store_email_body);
            }
            setLoading(false);
          });
      } else {
        setLoading(false);
      }
    });
  }, []);

  const handleSaveSettings = async () => {
    const supabase = createClient();
    if (!supabase || !user) return;

    setSavingSettings(true);
    setSaveSuccess(false);
    setSaveError(null);

    const { error } = await supabase.from("user_settings").upsert({
      user_id: user.id,
      store_email_body: storeEmailBody,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      setSaveError(error.message);
    } else {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
    setSavingSettings(false);
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    if (supabase) {
      await supabase.auth.signOut();
      window.location.href = "/auth/login";
    }
  };

  return (
    <AppShell
      title="Settings & Privacy Preferences"
      subtitle="Manage your Supabase account, authentication, and data retention preferences"
    >
      <div className="max-w-4xl space-y-6">
        {/* Account Information Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">
                <UserIcon className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-900">Account Information</h2>
            </div>
            {user && (
              <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full">
                Active Session
              </span>
            )}
          </div>

          {loading ? (
            <div className="text-xs text-slate-400 py-4">Loading user profile...</div>
          ) : user ? (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl">
                <div>
                  <span className="text-slate-400 text-[11px] block">Email Address</span>
                  <span className="font-semibold text-slate-900">{user.email}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">User UID</span>
                  <span className="font-mono text-slate-600 truncate block">
                    {user.id}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Account Created</span>
                  <span className="text-slate-700">
                    {new Date(user.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Authentication Provider</span>
                  <span className="text-slate-700 capitalize">
                    {user.app_metadata?.provider || "Supabase Auth (Email)"}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Link
                  href="/auth/reset-password"
                  className="text-xs text-teal-600 hover:text-teal-700 font-semibold"
                >
                  Change Password
                </Link>

                <button
                  onClick={handleSignOut}
                  className="px-4 py-2 text-xs font-semibold text-coral-600 hover:text-coral-700 hover:bg-coral-50 border border-coral-200 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center space-y-3">
              <p className="text-xs text-slate-600">
                You are currently browsing MailGuard AI as a guest. All local browser predictions function normally.
              </p>
              <div className="flex justify-center gap-3">
                <Link
                  href="/auth/login"
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/signup"
                  className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-500 rounded-lg transition-colors shadow-xs"
                >
                  Create Account
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Data Retention & Privacy Settings (Opt-In) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Email Body Storage (Strict Opt-In)</h2>
              <p className="text-[11px] text-slate-500">
                Configure whether message content is saved alongside prediction metadata
              </p>
            </div>
          </div>

          <div className="text-xs space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-4">
              <input
                id="opt-in-body"
                type="checkbox"
                disabled={!user}
                checked={storeEmailBody}
                onChange={(e) => setStoreEmailBody(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer disabled:opacity-50"
              />
              <label htmlFor="opt-in-body" className="cursor-pointer">
                <span className="font-bold text-slate-900 block text-xs">
                  Save full email message body in database history
                </span>
                <span className="text-slate-500 text-[11px] leading-relaxed block mt-0.5">
                  <strong>Default is Disabled (Recommended):</strong> By default, MailGuard AI operates with zero data leakage. Only the subject line, prediction, confidence, and model version are saved. Enabling this checkbox explicitly saves the full message body to your private Supabase database rows.
                </span>
              </label>
            </div>

            {saveSuccess && (
              <div className="p-2.5 bg-teal-50 border border-teal-200 text-teal-800 rounded-lg text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                <span>Preferences updated successfully!</span>
              </div>
            )}

            {saveError && (
              <div className="p-2.5 bg-coral-50 border border-coral-200 text-coral-800 rounded-lg text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-coral-600 shrink-0" />
                <span>Failed to save: {saveError}</span>
              </div>
            )}

            {user && (
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-xs transition-colors disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingSettings ? "Saving..." : "Save Privacy Preference"}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Security & Architecture Explanation */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Security & Privacy Architecture</h2>
              <p className="text-[11px] text-slate-500">
                Detailed disclosure of local processing boundaries vs. cloud database persistence
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-xl space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-teal-800">
                <Lock className="w-4 h-4 text-teal-600" />
                <span>What Runs Locally (Your Device)</span>
              </div>
              <ul className="space-y-1.5 text-slate-600 leading-relaxed text-[11px]">
                <li>• All text cleaning, regex normalization, and tokenization.</li>
                <li>• ONNX neural inference through WebAssembly in browser memory.</li>
                <li>• Model weights downloaded as static public assets without cookies.</li>
                <li>• Email message body is NEVER uploaded during inference.</li>
              </ul>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-slate-900">
                <Database className="w-4 h-4 text-slate-600" />
                <span>What Is Stored in Supabase (When Signed In)</span>
              </div>
              <ul className="space-y-1.5 text-slate-600 leading-relaxed text-[11px]">
                <li>• Subject line, prediction outcome (spam/safe), and confidence %.</li>
                <li>• Key statistical explanation tokens and model version string.</li>
                <li>• Strictly protected by Postgres Row Level Security (RLS).</li>
                <li>• Email bodies are omitted unless you explicitly toggle opt-in above.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
