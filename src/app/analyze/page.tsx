"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Lock,
  Sparkles,
  Zap,
  Info,
  Clock,
  Database,
  CheckCircle2,
  XCircle,
  FileText,
  RotateCcw,
} from "lucide-react";
import { classifyEmailLocally, checkArtifactsStatus, type ArtifactStatus } from "@/lib/ml/onnx-session";
import { createClient } from "@/lib/supabase/client";
import type { LocalClassificationResult, ExplanationSignal } from "@/lib/types";

// Pre-defined real examples clearly labeled for testing
const EXAMPLE_EMAILS = [
  {
    label: "Example: High-Urgency Lottery Scam",
    category: "spam",
    subject: "URGENT: Claim your lottery winnings of $2,500,000 USD now",
    body: "Dear Winner, We are pleased to notify you that your email address has won the International Sweepstakes Lottery Program. Your prize of $2,500,000 is ready for transfer. Send your bank account details, full name, and mobile number immediately to claim this cash prize guaranteed. Click here now.",
  },
  {
    label: "Example: Unsolicited Mortgage Refinance",
    category: "spam",
    subject: "Refinance your mortgage with 1.9% APR guaranteed! No credit check",
    body: "Lower your monthly home loan payments today! Fast instant cash out refinance. Bad credit is OK! 100% pre-approved in 15 minutes with no hidden fees. Click here to secure your special limited-time loan rate now.",
  },
  {
    label: "Example: Engineering Team Standup",
    category: "safe",
    subject: "Meeting Notes: Infrastructure roadmap & PostgreSQL sync",
    body: "Hi team, thanks for attending today's architecture sync. Key takeaways: 1. Supabase Postgres connection pooling with PgBouncer will roll out next Tuesday. 2. The ONNX Runtime model export is verified. Please review the attached PR #88 and let me know your thoughts. Best regards, Alice.",
  },
  {
    label: "Example: Dental Appointment Reminder",
    category: "safe",
    subject: "Courtesy reminder: Dentist appointment tomorrow at 2:30 PM",
    body: "This is a courtesy reminder from Dental Care Associates for your upcoming routine dental cleaning appointment tomorrow at 2:30 PM. Please arrive 10 minutes early to complete check-in. If you need to reschedule, please call our clinic. Sincerely, Front Desk Team.",
  },
];

export default function AnalyzePage() {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [result, setResult] = useState<LocalClassificationResult | null>(null);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "unauthenticated" | "failed"
  >("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [artifactStatus, setArtifactStatus] = useState<ArtifactStatus | null>(null);
  const [storeBodyPreference, setStoreBodyPreference] = useState(false);

  useEffect(() => {
    // Check ONNX model files
    checkArtifactsStatus().then(setArtifactStatus);

    // Check user settings if signed in
    const supabase = createClient();
    if (supabase) {
      supabase.auth.getUser().then(({ data }) => {
        if (data.user) {
          supabase
            .from("user_settings")
            .select("store_email_body")
            .eq("user_id", data.user.id)
            .single()
            .then(({ data: settings }) => {
              if (settings) {
                setStoreBodyPreference(settings.store_email_body);
              }
            });
        }
      });
    }
  }, []);

  const handleSelectExample = (ex: (typeof EXAMPLE_EMAILS)[0]) => {
    setSubject(ex.subject);
    setBody(ex.body);
    setValidationError(null);
    setResult(null);
    setSaveStatus("idle");
    setSaveError(null);
  };

  const handleClear = () => {
    setSubject("");
    setBody("");
    setValidationError(null);
    setResult(null);
    setSaveStatus("idle");
    setSaveError(null);
  };

  const handleClassify = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setSaveStatus("idle");
    setSaveError(null);

    const trimmedSubject = subject.trim();
    const trimmedBody = body.trim();

    // Input Validation
    if (!trimmedSubject && !trimmedBody) {
      setValidationError("Please enter an email subject or body text to classify.");
      return;
    }

    if (trimmedBody.length > 50000) {
      setValidationError(
        "Email text exceeds maximum length (50,000 characters). Please provide a reasonable email body."
      );
      return;
    }

    setLoading(true);

    try {
      // 1. Run inference locally in user's browser via ONNX Runtime Web
      const classification = await classifyEmailLocally(trimmedSubject, trimmedBody);
      setResult(classification);

      // 2. Save prediction metadata to Supabase for authenticated user
      const supabase = createClient();
      if (!supabase) {
        setSaveStatus("unauthenticated");
        setLoading(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setSaveStatus("unauthenticated");
        setLoading(false);
        return;
      }

      setSaveStatus("saving");

      // Payload strictly respects privacy: email_body is only stored if user explicitly opted in
      const payload: Record<string, any> = {
        user_id: user.id,
        subject: trimmedSubject || "(No Subject)",
        prediction: classification.prediction,
        confidence: classification.confidence,
        explanation_signals: classification.explanationSignals,
        model_version: classification.modelVersion,
        email_body: storeBodyPreference ? trimmedBody : null,
      };

      const { error: insertError } = await supabase.from("predictions").insert([payload]);

      if (insertError) {
        console.error("Supabase insert error:", insertError);
        setSaveStatus("failed");
        setSaveError(insertError.message);
      } else {
        setSaveStatus("saved");
      }
    } catch (err) {
      console.error("Classification error:", err);
      setValidationError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred during local ONNX inference."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell
      title="Analyze Email"
      subtitle="Classify spam vs. legitimate emails locally in your browser with zero data leakage"
    >
      {/* Missing Artifacts Alert if needed */}
      {artifactStatus && !artifactStatus.modelAvailable && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 text-xs text-amber-900 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-bold">Model Artifacts Not Detected</h3>
            <p className="text-amber-800">
              The ONNX model file <code className="bg-amber-100 px-1 py-0.5 rounded">public/model/model.onnx</code> is required for browser inference.
              Run <code className="bg-amber-100 px-1 py-0.5 rounded">python ml/run_pipeline.py</code> locally to generate the model.
            </p>
          </div>
        </div>
      )}

      {/* Example Selection Bar */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
        <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-slate-700">
          <Sparkles className="w-4 h-4 text-teal-600" />
          <span>Load Test Example (Clearly Labeled Samples)</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_EMAILS.map((ex, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectExample(ex)}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium transition-colors flex items-center gap-1.5"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  ex.category === "spam" ? "bg-coral-500" : "bg-teal-500"
                }`}
              ></span>
              <span>{ex.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Email Input Form */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900">Email Content Input</h2>
            <div className="flex items-center gap-1 text-[11px] text-teal-700 font-medium">
              <Lock className="w-3.5 h-3.5 text-teal-600" />
              <span>Client-side only</span>
            </div>
          </div>

          <form onSubmit={handleClassify} className="space-y-4">
            {/* Subject Input */}
            <div>
              <label
                htmlFor="subject"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Subject Line
              </label>
              <input
                id="subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g., URGENT: Action required on your account"
                className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-slate-900 placeholder:text-slate-400"
              />
            </div>

            {/* Body Input */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label
                  htmlFor="body"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Email Message Body
                </label>
                <span className="text-[10px] text-slate-400 font-mono">
                  {body.length.toLocaleString()} chars
                </span>
              </div>
              <textarea
                id="body"
                rows={9}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Paste the full email text here for local inspection..."
                className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-slate-900 placeholder:text-slate-400 font-sans"
              />
            </div>

            {/* Validation Error Banner */}
            {validationError && (
              <div className="p-3 rounded-lg bg-coral-50 border border-coral-200 text-xs text-coral-700 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-coral-600 shrink-0 mt-0.5" />
                <span>{validationError}</span>
              </div>
            )}

            {/* Submit / Reset Actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleClear}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear Form</span>
              </button>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-semibold text-xs shadow-sm shadow-teal-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    <span>Running In-Browser Inference...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>Run Local Classification</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Prediction Results Card */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-5">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">Inference Analysis</h2>
              <span className="text-[10px] font-mono text-slate-400">
                {result ? `${result.inferenceDurationMs} ms` : "Awaiting input"}
              </span>
            </div>

            {result ? (
              <div className="space-y-5">
                {/* Prediction Result Badge */}
                <div
                  className={`p-5 rounded-2xl border flex items-center gap-4 ${
                    result.prediction === "spam"
                      ? "bg-coral-50/60 border-coral-200 text-coral-950"
                      : "bg-teal-50/60 border-teal-200 text-teal-950"
                  }`}
                >
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                      result.prediction === "spam"
                        ? "bg-coral-500 text-white"
                        : "bg-teal-600 text-white"
                    }`}
                  >
                    {result.prediction === "spam" ? (
                      <ShieldAlert className="w-7 h-7" />
                    ) : (
                      <ShieldCheck className="w-7 h-7" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-extrabold tracking-tight uppercase">
                        {result.prediction === "spam" ? "SPAM DETECTED" : "SAFE / LEGITIMATE"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Model confidence:{" "}
                      <span className="font-bold text-slate-900">
                        {(result.confidence * 100).toFixed(1)}%
                      </span>{" "}
                      (raw output: {result.rawProbability})
                    </p>
                  </div>
                </div>

                {/* Confidence Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600 font-medium">Spam Likelihood Meter</span>
                    <span className="font-mono text-slate-900 font-semibold">
                      {(result.rawProbability * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden p-0.5">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        result.prediction === "spam" ? "bg-coral-500" : "bg-teal-500"
                      }`}
                      style={{ width: `${Math.max(5, result.rawProbability * 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>0% (Safe Ham)</span>
                    <span>Threshold: 50%</span>
                    <span>100% (Spam)</span>
                  </div>
                </div>

                {/* Explanation of Model Signals */}
                <div className="space-y-2.5 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                    <h3 className="text-xs font-bold text-slate-800">Key Learned Signal Indicators</h3>
                  </div>

                  {result.explanationSignals.length > 0 ? (
                    <div className="space-y-2">
                      {result.explanationSignals.map((sig, idx) => (
                        <div
                          key={idx}
                          className="p-2 rounded-lg bg-slate-50 border border-slate-200/60 text-xs flex items-start justify-between gap-2"
                        >
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`font-mono text-[11px] font-bold px-1.5 py-0.5 rounded ${
                                  sig.label === "spam"
                                    ? "bg-coral-100 text-coral-800"
                                    : "bg-teal-100 text-teal-800"
                                }`}
                              >
                                {sig.token}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                weight: {sig.weight > 0 ? `+${sig.weight}` : sig.weight}
                              </span>
                            </div>
                            {sig.description && (
                              <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                                {sig.description}
                              </p>
                            )}
                          </div>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                              sig.label === "spam" ? "text-coral-600" : "text-teal-600"
                            }`}
                          >
                            {sig.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded-lg">
                      No strong outlier trigger words detected in this input. Classification is based on distributed sequence patterns.
                    </p>
                  )}
                </div>

                {/* Mandatory Learned Indicators Disclaimer */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
                  <div className="font-semibold text-slate-800 flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 text-slate-500" />
                    <span>Model Explanation Notice</span>
                  </div>
                  <p>
                    Highlighted words and tokens are statistical indicators learned by the model during training on the SpamAssassin corpus, not definitive proof that an email is malicious.
                  </p>
                </div>

                {/* Persistence / History Status Banner */}
                <div className="pt-2 border-t border-slate-100">
                  {saveStatus === "saving" && (
                    <div className="text-xs text-slate-500 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-slate-400 animate-ping"></span>
                      <span>Saving prediction metadata to Supabase...</span>
                    </div>
                  )}
                  {saveStatus === "saved" && (
                    <div className="p-2.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                      <span>
                        Prediction saved to history (email text remained private on your machine).
                      </span>
                    </div>
                  )}
                  {saveStatus === "unauthenticated" && (
                    <div className="p-2.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-xs flex items-center justify-between">
                      <span className="text-[11px]">Local scan completed. Sign in to save history.</span>
                    </div>
                  )}
                  {saveStatus === "failed" && (
                    <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">Local result ready, but history could not be saved:</p>
                        <p className="text-[11px] mt-0.5">{saveError || "Database network error"}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-12 px-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">Awaiting Email Scan</h3>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                    Enter email content or load one of the labeled examples above, then click &ldquo;Run Local Classification&rdquo;.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
