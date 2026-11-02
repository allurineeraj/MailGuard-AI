"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { X } from "lucide-react";

interface AppShellProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export function AppShell({ children, title, subtitle }: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-canvas-50">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex h-full shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-navy-950/60 backdrop-blur-xs md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 ease-in-out md:hidden ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="relative h-full flex flex-col">
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="absolute top-4 right-3 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-navy-800"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
          <Sidebar onCloseMobile={() => setMobileMenuOpen(false)} />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        <Header
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          title={title}
          subtitle={subtitle}
        />
        <main className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
          <div className="max-w-7xl mx-auto space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
