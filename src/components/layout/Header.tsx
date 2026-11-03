"use client";

import { useState, useEffect } from "react";
import { Menu, Cpu, CheckCircle2, AlertTriangle, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { checkArtifactsStatus, type ArtifactStatus } from "../../lib/ml/onnx-session";

interface HeaderProps {
  onOpenMobileMenu: () => void;
  title: string;
  subtitle?: string;
}

export function Header({ onOpenMobileMenu, title, subtitle }: HeaderProps) {
  const [artifactStatus, setArtifactStatus] = useState<ArtifactStatus | null>(null);

  useEffect(() => {
    checkArtifactsStatus().then(setArtifactStatus);
  }, []);

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-20 shadow-xs">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="p-2 -ml-2 text-slate-600 hover:text-slate-900 md:hidden rounded-lg hover:bg-slate-100"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-none">{title}</h1>
          {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Model Status Badge */}
        {artifactStatus ? (
          artifactStatus.modelAvailable ? (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200/80 text-[11px] font-medium text-teal-800">
              <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
              <Cpu className="w-3.5 h-3.5 text-teal-600" />
              <span>ONNX WebEngine: Active</span>
            </div>
          ) : (
            <Link
              href="/insights"
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-300 text-[11px] font-medium text-amber-800 hover:bg-amber-100 transition-colors"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>Model Artifacts Missing</span>
            </Link>
          )
        ) : (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-[11px] text-slate-500">
            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
            <span>Checking Engine...</span>
          </div>
        )}

        {/* Quick Analyze Button */}
        <Link
          href="/analyze"
          className="hidden md:inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-sm transition-all hover:shadow"
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Scan Email</span>
        </Link>
      </div>
    </header>
  );
}
