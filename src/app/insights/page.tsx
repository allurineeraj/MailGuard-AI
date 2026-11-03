"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import {
  Cpu,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Info,
  Database,
  ExternalLink,
  Code2,
  FileCheck,
  TrendingUp,
} from "lucide-react";
import type { ModelMetricsData } from "@/lib/types";

export default function InsightsPage() {
  const [metrics, setMetrics] = useState<ModelMetricsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/model/metrics.json")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setMetrics(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load metrics:", err);
        setLoading(false);
      });
  }, []);

  const biLstm = metrics?.models?.bilstm;
  const baseline = metrics?.models?.baseline_logistic_regression;
  const ds = metrics?.dataset_info;

  return (
    <AppShell
      title="Model Insights & Benchmarks"
      subtitle="Transparent architecture specs, confusion matrices, and empirical dataset metrics"
    >
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500">Loading model insights...</div>
      ) : !metrics ? (
        <div className="p-8 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900">
          <AlertTriangle className="w-5 h-5 text-amber-600 mb-2" />
          <p className="font-bold">Evaluation Metrics Artifact Missing</p>
          <p className="mt-1 text-amber-800">
            Please run <code className="bg-amber-100 px-1 py-0.5 rounded">python ml/run_pipeline.py</code> locally to generate the real metrics artifact.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Performance Comparison Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* BiLSTM Performance Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">
                      {biLstm?.name || "PyTorch BiLSTM"}
                    </h3>
                    <p className="text-[11px] text-slate-500">Exported ONNX (586 KB)</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 text-[11px] font-bold text-teal-800 bg-teal-50 border border-teal-200 rounded-full">
                  Primary Model
                </span>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase">
                    Accuracy
                  </span>
                  <span className="text-lg font-bold text-slate-900">
                    {biLstm ? `${(biLstm.accuracy * 100).toFixed(1)}%` : "—"}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase">
                    Precision
                  </span>
                  <span className="text-lg font-bold text-teal-600">
                    {biLstm ? `${(biLstm.precision * 100).toFixed(1)}%` : "—"}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase">
                    Recall
                  </span>
                  <span className="text-lg font-bold text-slate-900">
                    {biLstm ? `${(biLstm.recall * 100).toFixed(1)}%` : "—"}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase">
                    F1 Score
                  </span>
                  <span className="text-lg font-bold text-teal-700">
                    {biLstm ? `${(biLstm.f1 * 100).toFixed(1)}%` : "—"}
                  </span>
                </div>
              </div>

              {/* BiLSTM Confusion Matrix */}
              {biLstm && (
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                    <span>Confusion Matrix (Held-out Test N={biLstm.test_samples})</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      FPR: {(biLstm.false_positive_rate * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-3 rounded-lg bg-teal-50/60 border border-teal-200">
                      <span className="text-[10px] text-teal-800 uppercase block font-semibold">
                        True Negatives (TN)
                      </span>
                      <span className="text-xl font-bold text-teal-900">
                        {biLstm.confusion_matrix.tn}
                      </span>
                      <span className="text-[10px] text-teal-700 block mt-0.5">
                        Safe emails classified as Safe
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-coral-50/60 border border-coral-200">
                      <span className="text-[10px] text-coral-800 uppercase block font-semibold">
                        False Positives (FP)
                      </span>
                      <span className="text-xl font-bold text-coral-900">
                        {biLstm.confusion_matrix.fp}
                      </span>
                      <span className="text-[10px] text-coral-700 block mt-0.5">
                        Safe misclassified as Spam
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-coral-50/60 border border-coral-200">
                      <span className="text-[10px] text-coral-800 uppercase block font-semibold">
                        False Negatives (FN)
                      </span>
                      <span className="text-xl font-bold text-coral-900">
                        {biLstm.confusion_matrix.fn}
                      </span>
                      <span className="text-[10px] text-coral-700 block mt-0.5">
                        Spam missed as Safe
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-teal-50/60 border border-teal-200">
                      <span className="text-[10px] text-teal-800 uppercase block font-semibold">
                        True Positives (TP)
                      </span>
                      <span className="text-xl font-bold text-teal-900">
                        {biLstm.confusion_matrix.tp}
                      </span>
                      <span className="text-[10px] text-teal-700 block mt-0.5">
                        Spam correctly identified
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Baseline Performance Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">
                      {baseline?.name || "TF-IDF + Logistic Regression"}
                    </h3>
                    <p className="text-[11px] text-slate-500">Traditional Statistical Baseline</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 text-[11px] font-bold text-slate-600 bg-slate-100 border border-slate-200 rounded-full">
                  Baseline
                </span>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase">
                    Accuracy
                  </span>
                  <span className="text-lg font-bold text-slate-900">
                    {baseline ? `${(baseline.accuracy * 100).toFixed(1)}%` : "—"}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase">
                    Precision
                  </span>
                  <span className="text-lg font-bold text-slate-700">
                    {baseline ? `${(baseline.precision * 100).toFixed(1)}%` : "—"}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase">
                    Recall
                  </span>
                  <span className="text-lg font-bold text-slate-900">
                    {baseline ? `${(baseline.recall * 100).toFixed(1)}%` : "—"}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase">
                    F1 Score
                  </span>
                  <span className="text-lg font-bold text-slate-700">
                    {baseline ? `${(baseline.f1 * 100).toFixed(1)}%` : "—"}
                  </span>
                </div>
              </div>

              {/* Baseline Confusion Matrix */}
              {baseline && (
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                    <span>Confusion Matrix (Held-out Test N={baseline.test_samples})</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      FPR: {(baseline.false_positive_rate * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-3 rounded-lg bg-slate-100/70 border border-slate-200">
                      <span className="text-[10px] text-slate-700 uppercase block font-semibold">
                        True Negatives (TN)
                      </span>
                      <span className="text-xl font-bold text-slate-900">
                        {baseline.confusion_matrix.tn}
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        Safe emails classified as Safe
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-100/70 border border-slate-200">
                      <span className="text-[10px] text-slate-700 uppercase block font-semibold">
                        False Positives (FP)
                      </span>
                      <span className="text-xl font-bold text-slate-900">
                        {baseline.confusion_matrix.fp}
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        Safe misclassified as Spam
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-100/70 border border-slate-200">
                      <span className="text-[10px] text-slate-700 uppercase block font-semibold">
                        False Negatives (FN)
                      </span>
                      <span className="text-xl font-bold text-slate-900">
                        {baseline.confusion_matrix.fn}
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        Spam missed as Safe
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-100/70 border border-slate-200">
                      <span className="text-[10px] text-slate-700 uppercase block font-semibold">
                        True Positives (TP)
                      </span>
                      <span className="text-xl font-bold text-slate-900">
                        {baseline.confusion_matrix.tp}
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        Spam correctly identified
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Dataset Provenance & Limitations Documentation */}
          {ds && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Database className="w-5 h-5 text-teal-600" />
                <h3 className="font-bold text-sm text-slate-900">
                  Dataset Provenance, Partitioning & Limitations
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-4 bg-slate-50 rounded-xl space-y-2">
                  <span className="font-semibold text-slate-800 block">Dataset Source</span>
                  <p className="text-slate-600 leading-relaxed">{ds.name}</p>
                  <a
                    href={ds.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-teal-600 hover:text-teal-700 font-semibold pt-1"
                  >
                    <span>Apache SpamAssassin Corpus</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <p className="text-[11px] text-slate-500 mt-1">License: {ds.license}</p>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl space-y-2">
                  <span className="font-semibold text-slate-800 block">Split Partitioning</span>
                  <ul className="space-y-1 text-slate-600">
                    <li>
                      • Train Split (70%): <strong className="text-slate-900">{ds.split_counts.train}</strong> emails
                    </li>
                    <li>
                      • Validation Split (15%): <strong className="text-slate-900">{ds.split_counts.val}</strong> emails
                    </li>
                    <li>
                      • Test Split (15%): <strong className="text-slate-900">{ds.split_counts.test}</strong> emails
                    </li>
                    <li>
                      • Total Corpus: <strong className="text-slate-900">{ds.split_counts.total}</strong> emails
                    </li>
                  </ul>
                  <p className="text-[11px] text-teal-700 font-medium pt-1">
                    ✓ Vocabulary (4,000 tokens) fitted strictly on training data to avoid data leakage.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl space-y-2">
                  <span className="font-semibold text-slate-800 block">Dataset Limitations</span>
                  <ul className="space-y-1 text-slate-600 leading-relaxed">
                    {ds.limitations.map((lim, i) => (
                      <li key={i}>• {lim}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Model Architecture Deep-Dive */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Code2 className="w-5 h-5 text-teal-600" />
              <h3 className="font-bold text-sm text-slate-900">
                PyTorch Neural Architecture & Browser Export
              </h3>
            </div>

            <div className="text-xs text-slate-700 leading-relaxed space-y-2">
              <p>
                The primary model is a compact bidirectional LSTM (<code className="bg-slate-100 px-1 py-0.5 rounded font-mono">SpamBiLSTM</code>) built in PyTorch. It reads input token sequences up to 128 words, embeds them into a 32-dimensional dense space, processes forward and backward context sequences through dual LSTM cells (32 units each, producing 64-dimensional output), applies global max pooling, and projects through a 16-unit dense layer to a final Sigmoid activation.
              </p>
              <div className="p-3 bg-navy-900 text-slate-200 rounded-xl font-mono text-[11px] space-y-1">
                <p className="text-teal-400"># Model Layer Hierarchy</p>
                <p>Input: [batch_size, 128] int64 sequence IDs</p>
                <p>1. Embedding(num_embeddings=4000, embedding_dim=32, padding_idx=0)</p>
                <p>2. Spatial Dropout(0.20)</p>
                <p>3. BiLSTM(input_size=32, hidden_size=32, bidirectional=True)</p>
                <p>4. GlobalMaxPool1d(sequence_dim) -&gt; [batch_size, 64]</p>
                <p>5. Linear(64 -&gt; 16) + ReLU() + Dropout(0.20)</p>
                <p>6. Linear(16 -&gt; 1) + Sigmoid() -&gt; [batch_size, 1] probability</p>
              </div>
              <p className="text-slate-500 text-[11px] pt-1">
                Exported via <code className="bg-slate-100 px-1 py-0.5 rounded">torch.onnx.export</code> with opset 14 and dynamic batching. Loaded in the browser via <code className="bg-slate-100 px-1 py-0.5 rounded">onnxruntime-web</code> with WebAssembly execution provider.
              </p>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
