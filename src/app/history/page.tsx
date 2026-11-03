"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "../../components/layout/AppShell";
import {
  History as HistoryIcon,
  Search,
  Filter,
  Trash2,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  ArrowUpDown,
  Eye,
  X,
  Database,
  Calendar,
  Lock,
} from "lucide-react";
import { createClient } from "../../lib/supabase/client";
import type { PredictionRecord } from "../../lib/types";

export default function HistoryPage() {
  const [records, setRecords] = useState<PredictionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userAuthenticated, setUserAuthenticated] = useState<boolean | null>(null);

  // Filters and search
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "spam" | "safe">("all");

  // Selected item for modal detail view
  const [selectedRecord, setSelectedRecord] = useState<PredictionRecord | null>(null);

  // Clear-all modal state
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    setLoading(true);
    setError(null);

    const supabase = createClient();
    if (!supabase) {
      setUserAuthenticated(false);
      setLoading(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setUserAuthenticated(false);
      setLoading(false);
      return;
    }

    setUserAuthenticated(true);

    const { data, error: fetchErr } = await supabase
      .from("predictions")
      .select("*")
      .order("created_at", { ascending: false });

    if (fetchErr) {
      setError(fetchErr.message);
    } else if (data) {
      setRecords(data as PredictionRecord[]);
    }

    setLoading(false);
  }

  const handleDeleteRecord = async (id: string) => {
    const supabase = createClient();
    if (!supabase) return;

    const { error: delErr } = await supabase.from("predictions").delete().eq("id", id);
    if (!delErr) {
      setRecords((prev) => prev.filter((r) => r.id !== id));
      if (selectedRecord?.id === id) {
        setSelectedRecord(null);
      }
    } else {
      alert(`Delete failed: ${delErr.message}`);
    }
  };

  const handleClearAllHistory = async () => {
    const supabase = createClient();
    if (!supabase) return;

    setClearing(true);
    // Delete policy restricts this to current auth.uid() automatically via RLS
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { error: clearErr } = await supabase
        .from("predictions")
        .delete()
        .eq("user_id", user.id);

      if (!clearErr) {
        setRecords([]);
        setShowClearConfirm(false);
        setSelectedRecord(null);
      } else {
        alert(`Failed to clear history: ${clearErr.message}`);
      }
    }
    setClearing(false);
  };

  // Filter & Search Logic
  const filteredRecords = records.filter((r) => {
    const matchesFilter = filterType === "all" || r.prediction === filterType;
    const matchesSearch =
      !searchQuery ||
      r.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.model_version.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <AppShell
      title="Prediction History"
      subtitle="Review, inspect signals, and manage saved classification logs"
    >
      {/* Search and Filters Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by subject or model version..."
            className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-slate-900 placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setFilterType("all")}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                filterType === "all"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All ({records.length})
            </button>
            <button
              onClick={() => setFilterType("spam")}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                filterType === "spam"
                  ? "bg-white text-coral-600 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Spam
            </button>
            <button
              onClick={() => setFilterType("safe")}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                filterType === "safe"
                  ? "bg-white text-teal-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Safe
            </button>
          </div>

          {/* Delete All History Button */}
          {userAuthenticated && records.length > 0 && (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="text-xs font-semibold px-3 py-2 text-coral-600 hover:text-coral-700 hover:bg-coral-50 border border-coral-200 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Clear History</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <span className="w-5 h-5 border-2 border-slate-300 border-t-teal-600 rounded-full animate-spin inline-block mb-2"></span>
            <p>Loading your saved predictions from Supabase...</p>
          </div>
        ) : !userAuthenticated ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <Database className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Authentication Required</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              You must be signed in to your account to view or retrieve saved prediction history.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <Link
                href="/auth/login"
                className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-500 rounded-lg shadow-xs"
              >
                Sign In to View History
              </Link>
            </div>
          </div>
        ) : error ? (
          <div className="p-8 text-center space-y-2 bg-coral-50/40">
            <AlertTriangle className="w-6 h-6 text-coral-600 mx-auto" />
            <p className="text-xs font-semibold text-coral-900">Database Error</p>
            <p className="text-xs text-coral-700 max-w-md mx-auto">{error}</p>
            <button
              onClick={loadHistory}
              className="mt-2 px-3 py-1.5 bg-white border border-coral-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Retry Connection
            </button>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <HistoryIcon className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">
              {searchQuery || filterType !== "all"
                ? "No matching prediction records found"
                : "No prediction history saved yet"}
            </p>
            <p className="text-xs text-slate-500">
              {searchQuery || filterType !== "all"
                ? "Try adjusting your search terms or filter selection."
                : "Classify an email on the Analyze tab to save your first prediction."}
            </p>
            {records.length === 0 && (
              <Link
                href="/analyze"
                className="inline-block mt-3 px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-500 rounded-lg"
              >
                Go to Analyze Email
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-6">Timestamp</th>
                  <th className="py-3 px-6">Subject</th>
                  <th className="py-3 px-6">Classification</th>
                  <th className="py-3 px-6">Confidence</th>
                  <th className="py-3 px-6">Model Version</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredRecords.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-6 text-slate-500 whitespace-nowrap">
                      {new Date(item.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-6 font-medium text-slate-900 max-w-sm truncate">
                      {item.subject || <span className="text-slate-400 italic">(No Subject)</span>}
                    </td>
                    <td className="py-3 px-6">
                      {item.prediction === "spam" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-coral-50 text-coral-600 border border-coral-200">
                          <ShieldAlert className="w-3 h-3" />
                          <span>SPAM</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                          <ShieldCheck className="w-3 h-3" />
                          <span>SAFE</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-6 font-semibold">
                      {(item.confidence * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-6 font-mono text-[11px] text-slate-500">
                      {item.model_version}
                    </td>
                    <td className="py-3 px-6 text-right whitespace-nowrap space-x-2">
                      <button
                        onClick={() => setSelectedRecord(item)}
                        className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                        title="View Detail & Signals"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteRecord(item.id)}
                        className="p-1.5 text-slate-400 hover:text-coral-600 hover:bg-coral-50 rounded-md transition-colors"
                        title="Delete Record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Detail Modal */}
      {selectedRecord && (
        <div
          className="fixed inset-0 z-50 bg-navy-950/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedRecord(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-popover space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900">Prediction Record Details</h3>
              <button
                onClick={() => setSelectedRecord(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 text-[11px] block">Subject</span>
                <span className="font-semibold text-slate-900 text-sm">
                  {selectedRecord.subject || "(No Subject)"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl">
                <div>
                  <span className="text-slate-400 text-[11px] block">Classification</span>
                  <span
                    className={`font-bold uppercase ${
                      selectedRecord.prediction === "spam" ? "text-coral-600" : "text-teal-700"
                    }`}
                  >
                    {selectedRecord.prediction}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Confidence</span>
                  <span className="font-bold text-slate-900">
                    {(selectedRecord.confidence * 100).toFixed(1)}%
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Scanned At</span>
                  <span className="text-slate-700">
                    {new Date(selectedRecord.created_at).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Model Version</span>
                  <span className="font-mono text-slate-700">{selectedRecord.model_version}</span>
                </div>
              </div>

              {/* Signals */}
              <div>
                <span className="text-slate-400 text-[11px] block mb-1">
                  Saved Explanation Signals
                </span>
                {selectedRecord.explanation_signals &&
                selectedRecord.explanation_signals.length > 0 ? (
                  <div className="space-y-1.5">
                    {selectedRecord.explanation_signals.map((sig, i) => (
                      <div
                        key={i}
                        className="p-2 rounded bg-slate-50 border border-slate-200/60 flex items-center justify-between"
                      >
                        <span className="font-mono font-bold text-slate-800">{sig.token}</span>
                        <span
                          className={`font-semibold uppercase text-[10px] ${
                            sig.label === "spam" ? "text-coral-600" : "text-teal-600"
                          }`}
                        >
                          weight: {sig.weight}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 italic p-2 bg-slate-50 rounded">
                    No individual high-weight indicator signals stored for this scan.
                  </p>
                )}
              </div>

              {/* Optional Body if opted in */}
              {selectedRecord.email_body && (
                <div>
                  <span className="text-slate-400 text-[11px] block mb-1">
                    Saved Email Body (Explicit Opt-In)
                  </span>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 max-h-32 overflow-y-auto whitespace-pre-wrap font-mono text-[11px]">
                    {selectedRecord.email_body}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear-All Confirmation Dialog */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 bg-navy-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-popover space-y-4">
            <div className="flex items-center gap-3 text-coral-600">
              <div className="w-10 h-10 rounded-xl bg-coral-50 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">Clear All Prediction History?</h3>
                <p className="text-xs text-slate-500">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete all saved prediction records associated with your account? Only your personal rows in Supabase will be permanently removed (enforced by RLS).
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                disabled={clearing}
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={clearing}
                onClick={handleClearAllHistory}
                className="px-4 py-2 text-xs font-semibold text-white bg-coral-600 hover:bg-coral-700 rounded-lg transition-colors shadow-xs"
              >
                {clearing ? "Deleting..." : "Yes, Delete All History"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
