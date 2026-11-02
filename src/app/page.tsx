"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import {
  Mail,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Database,
  Lock,
  Cpu,
  Layers,
  Sparkles,
  Info,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { PredictionRecord, ModelMetricsData } from "@/lib/types";

export default function OverviewPage() {
  const [userPredictions, setUserPredictions] = useState<PredictionRecord[]>([]);
  const [modelMetrics, setModelMetrics] = useState<ModelMetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [userAuthenticated, setUserAuthenticated] = useState<boolean | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      // 1. Load real model metrics artifact
      try {
        const metricsRes = await fetch("/model/metrics.json");
        if (metricsRes.ok) {
          const data = await metricsRes.json();
          setModelMetrics(data);
        }
      } catch (err) {
        console.error("Failed to load model metrics:", err);
      }

      // 2. Load user prediction history from Supabase
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

      const { data, error } = await supabase
        .from("predictions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) {
        setDbError(error.message);
      } else if (data) {
        setUserPredictions(data as PredictionRecord[]);
      }

      setLoading(false);
    }

    loadData();
  }, []);

  // Compute user statistics from actual user records
  const userAnalyzedCount = userPredictions.length;
  const userSpamCount = userPredictions.filter((p) => p.prediction === "spam").length;
  const userSafeCount = userPredictions.filter((p) => p.prediction === "safe").length;

  const biLstm = modelMetrics?.models?.bilstm;
  const baseline = modelMetrics?.models?.baseline_logistic_regression;

  return (
    <AppShell
      title="System Overview"
      subtitle="Real-time browser classification metrics and held-out evaluation benchmarks"
    >
      {/* Privacy Notice Banner */}
      <div className="bg-gradient-to-r from-navy-900 to-navy-850 rounded-2xl p-5 text-white shadow-md border border-navy-700/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0 border border-teal-500/30">
            <Lock className="w-5 h-5 text-teal-300" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <span>Zero-Data-Leak Privacy Architecture</span>
              <span className="text-[10px] bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded-full border border-teal-500/40 font-mono">
                ONNX WebAssembly
              </span>
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Classification runs strictly within your browser. Email bodies are never sent over the wire to any AI server.
            </p>
          </div>
        </div>
        <Link
          href="/analyze"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-navy-950 font-semibold text-xs transition-all shadow-sm shrink-0"
        >
          <span>Scan An Email</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* KPI Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Emails Analyzed */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Emails Analyzed
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
              <Mail className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">
              {userAuthenticated ? userAnalyzedCount : "—"}
            </div>
            <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-400"></span>
              {userAuthenticated
                ? "Saved in your Supabase account"
                : "Sign in to persist your history"}
            </p>
          </div>
        </div>

        {/* Card 2: Spam Detected */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Spam Detected
            </span>
            <div className="w-8 h-8 rounded-lg bg-coral-50 flex items-center justify-center text-coral-600">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-coral-600">
              {userAuthenticated ? userSpamCount : "—"}
            </div>
            <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-coral-400"></span>
              {userAuthenticated
                ? `${userSafeCount} verified legitimate emails`
                : "Awaiting local user scans"}
            </p>
          </div>
        </div>

        {/* Card 3: Detection Accuracy */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Model Accuracy
            </span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">
              {biLstm ? `${(biLstm.accuracy * 100).toFixed(1)}%` : "Loading..."}
            </div>
            <p className="text-[11px] text-teal-700 font-medium mt-1 flex items-center gap-1">
              <Info className="w-3 h-3 text-teal-600" />
              <span>Source: Held-out test set (450 emails)</span>
            </p>
          </div>
        </div>

        {/* Card 4: False Positive Rate */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
              False Positive Rate
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">
              {biLstm ? `${(biLstm.false_positive_rate * 100).toFixed(2)}%` : "Loading..."}
            </div>
            <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
              <Info className="w-3 h-3 text-slate-400" />
              <span>Source: Held-out test set evaluation</span>
            </p>
          </div>
        </div>
      </div>

      {/* Model Benchmark Card: BiLSTM vs TF-IDF Baseline */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                Model Evaluation Benchmark: BiLSTM vs. TF-IDF Baseline
              </h2>
              <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full border border-slate-200">
                Test Split (N=450)
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Empirical evaluation comparing the PyTorch BiLSTM neural model against a TF-IDF + Logistic Regression baseline using identical held-out test splits.
            </p>
          </div>
          <Link
            href="/insights"
            className="text-xs text-teal-600 hover:text-teal-700 font-semibold flex items-center gap-1 self-start sm:self-auto"
          >
            <span>Full Confusion Matrices</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {biLstm && baseline ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* BiLSTM Column */}
            <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-teal-500"></div>
                  <span className="font-bold text-sm text-slate-900">
                    PyTorch BiLSTM (Exported ONNX)
                  </span>
                </div>
                <span className="text-[10px] uppercase tracking-wider font-bold text-teal-700 bg-teal-100 px-2 py-0.5 rounded">
                  Primary Model
                </span>
              </div>

              <div className="space-y-3">
                {/* Precision */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600 font-medium">Precision</span>
                    <span className="font-bold text-slate-900">
                      {(biLstm.precision * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-teal-500 h-2 rounded-full"
                      style={{ width: `${biLstm.precision * 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* Recall */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600 font-medium">Recall</span>
                    <span className="font-bold text-slate-900">
                      {(biLstm.recall * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-teal-500 h-2 rounded-full"
                      style={{ width: `${biLstm.recall * 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* F1 Score */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600 font-medium">F1 Score</span>
                    <span className="font-bold text-slate-900">
                      {(biLstm.f1 * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-teal-600 h-2 rounded-full"
                      style={{ width: `${biLstm.f1 * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Baseline Column */}
            <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-slate-400"></div>
                  <span className="font-bold text-sm text-slate-900">
                    TF-IDF + Logistic Regression
                  </span>
                </div>
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded">
                  Baseline
                </span>
              </div>

              <div className="space-y-3">
                {/* Precision */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600 font-medium">Precision</span>
                    <span className="font-bold text-slate-900">
                      {(baseline.precision * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-slate-500 h-2 rounded-full"
                      style={{ width: `${baseline.precision * 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* Recall */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600 font-medium">Recall</span>
                    <span className="font-bold text-slate-900">
                      {(baseline.recall * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-slate-500 h-2 rounded-full"
                      style={{ width: `${baseline.recall * 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* F1 Score */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600 font-medium">F1 Score</span>
                    <span className="font-bold text-slate-900">
                      {(baseline.f1 * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-slate-600 h-2 rounded-full"
                      style={{ width: `${baseline.f1 * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-500 text-xs">
            Model evaluation metrics not yet loaded. Verify that `public/model/metrics.json` is available.
          </div>
        )}
      </div>

      {/* Recent User Predictions Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-900">Recent User Scans</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Predictions saved securely to your Supabase account. Bodies are omitted by default for privacy.
            </p>
          </div>
          {userAuthenticated && userPredictions.length > 0 && (
            <Link
              href="/history"
              className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1"
            >
              <span>View All History</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs">Loading activity records...</div>
        ) : !userAuthenticated ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">You are not signed in</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                Local email scanning works freely without an account. To persist your prediction history and access it across devices, sign in with Supabase.
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <Link
                href="/auth/login"
                className="px-4 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                className="px-4 py-1.5 text-xs font-medium text-white bg-teal-600 hover:bg-teal-500 rounded-lg shadow-xs transition-colors"
              >
                Create Account
              </Link>
            </div>
          </div>
        ) : dbError ? (
          <div className="p-6 text-center text-coral-600 text-xs bg-coral-50/50">
            Database connection issue: {dbError}
          </div>
        ) : userPredictions.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <p className="text-sm font-semibold text-slate-800">No predictions recorded yet</p>
            <p className="text-xs text-slate-500">
              When you scan an email in the Analyze tab, your local classification metadata will appear here.
            </p>
            <Link
              href="/analyze"
              className="inline-block mt-3 px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-500 rounded-lg transition-colors shadow-xs"
            >
              Analyze Your First Email
            </Link>
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
                  <th className="py-3 px-6">Top Signals</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {userPredictions.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-6 text-slate-500 whitespace-nowrap">
                      {new Date(record.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-6 font-medium text-slate-900 max-w-xs truncate">
                      {record.subject || <span className="text-slate-400 italic">(No Subject)</span>}
                    </td>
                    <td className="py-3 px-6">
                      {record.prediction === "spam" ? (
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
                      {(record.confidence * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-6">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {record.explanation_signals && record.explanation_signals.length > 0 ? (
                          record.explanation_signals.slice(0, 3).map((sig, i) => (
                            <span
                              key={i}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                                sig.label === "spam"
                                  ? "bg-coral-50 text-coral-700 border border-coral-200"
                                  : "bg-teal-50 text-teal-700 border border-teal-200"
                              }`}
                            >
                              {sig.token}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 text-[11px]">Neutral content</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
