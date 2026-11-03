"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldCheck,
  LayoutDashboard,
  MailSearch,
  History,
  Cpu,
  Settings,
  Lock,
  LogOut,
  User as UserIcon,
} from "lucide-react";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

interface SidebarProps {
  onCloseMobile?: () => void;
}

export function Sidebar({ onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    if (supabase) {
      await supabase.auth.signOut();
      window.location.href = "/auth/login";
    }
  };

  const navItems = [
    { name: "Overview", href: "/", icon: LayoutDashboard },
    { name: "Analyze Email", href: "/analyze", icon: MailSearch },
    { name: "History", href: "/history", icon: History },
    { name: "Model Insights", href: "/insights", icon: Cpu },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <aside className="w-64 bg-navy-900 text-slate-200 flex flex-col h-full border-r border-navy-800 shadow-xl select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-navy-800/80 gap-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center shadow-lg shadow-teal-500/20 text-white font-bold">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-base tracking-tight">MailGuard AI</span>
            <span className="text-[10px] font-semibold bg-teal-500/20 text-teal-400 px-1.5 py-0.5 rounded border border-teal-500/30">
              BiLSTM
            </span>
          </div>
          <p className="text-[11px] text-slate-400">Zero-Data-Leak Classifier</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Navigation
        </div>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onCloseMobile}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-teal-600/20 text-teal-300 border border-teal-500/30 shadow-sm"
                  : "text-slate-300 hover:text-white hover:bg-navy-800/60"
              }`}
            >
              <Icon
                className={`w-4 h-4 transition-colors ${
                  isActive ? "text-teal-400" : "text-slate-400 group-hover:text-slate-200"
                }`}
              />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Privacy Guarantee Badge */}
      <div className="px-4 py-3 mx-3 mb-4 rounded-xl bg-navy-850/80 border border-navy-700/60 text-xs">
        <div className="flex items-center gap-1.5 text-teal-400 font-semibold mb-1">
          <Lock className="w-3.5 h-3.5" />
          <span>Local Privacy Shield</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Email text is processed 100% inside your browser via ONNX Runtime Web. Text is never sent to any server.
        </p>
      </div>

      {/* User Session Footer */}
      <div className="p-3 border-t border-navy-800/80 bg-navy-950/60">
        {user ? (
          <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-navy-900/60 border border-navy-800">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs font-medium text-slate-200 shrink-0">
                <UserIcon className="w-3.5 h-3.5 text-slate-300" />
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-medium text-slate-200 truncate">{user.email}</p>
                <p className="text-[10px] text-teal-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 inline-block animate-pulse"></span>
                  Authenticated
                </p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-coral-400 hover:bg-navy-800 rounded transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-1.5">
            <div className="text-[11px] text-slate-400 px-1">
              Sign in to save prediction history
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/auth/login"
                className="text-center py-1.5 text-xs font-medium bg-navy-800 text-slate-200 hover:bg-navy-700 rounded-md border border-navy-700 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                className="text-center py-1.5 text-xs font-medium bg-teal-600 hover:bg-teal-500 text-white rounded-md shadow-sm transition-colors"
              >
                Sign Up
              </Link>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
