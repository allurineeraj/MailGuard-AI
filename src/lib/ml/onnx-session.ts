/**
 * onnx-session.ts
 * Browser-side ONNX Runtime Web model loader and inference engine.
 * Never calls a remote prediction API; runs 100% locally on the user device.
 */

import type {
  InferenceSession,
  Tensor,
} from "onnxruntime-web";
import { textToSequence, MAX_SEQ_LENGTH } from "./tokenizer";
import { extractExplanationSignals } from "./explain";
import type { LocalClassificationResult, PreprocessingConfig } from "@/lib/types";

// Cached in-memory instances for fast repeated classifications
let sessionCache: InferenceSession | null = null;
let vocabCache: Record<string, number> | null = null;
let configCache: PreprocessingConfig | null = null;
let loadPromise: Promise<void> | null = null;

export interface ArtifactStatus {
  modelAvailable: boolean;
  vocabAvailable: boolean;
  configAvailable: boolean;
  metricsAvailable: boolean;
  error?: string;
}

/**
 * Checks if the exported model files exist in public/model/.
 * If they do not exist, returns clear status so the UI displays the required setup instructions.
 */
export async function checkArtifactsStatus(): Promise<ArtifactStatus> {
  try {
    const [modelRes, vocabRes, configRes, metricsRes] = await Promise.all([
      fetch("/model/model.onnx", { method: "HEAD" }),
      fetch("/model/vocab.json", { method: "HEAD" }),
      fetch("/model/preprocessing_config.json", { method: "HEAD" }),
      fetch("/model/metrics.json", { method: "HEAD" }),
    ]);

    const modelOk = modelRes.ok;
    const vocabOk = vocabRes.ok;
    const configOk = configRes.ok;
    const metricsOk = metricsRes.ok;

    return {
      modelAvailable: modelOk,
      vocabAvailable: vocabOk,
      configAvailable: configOk,
      metricsAvailable: metricsOk,
      error:
        modelOk && vocabOk && configOk
          ? undefined
          : "Model artifacts not found in /public/model/. Run 'python ml/run_pipeline.py' locally to generate and export the model.",
    };
  } catch (err) {
    return {
      modelAvailable: false,
      vocabAvailable: false,
      configAvailable: false,
      metricsAvailable: false,
      error: err instanceof Error ? err.message : "Failed to verify model artifacts.",
    };
  }
}

/**
 * Initializes and caches the ONNX Runtime Web session and vocabulary.
 */
export async function initModelSession(): Promise<void> {
  if (sessionCache && vocabCache && configCache) {
    return;
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = (async () => {
    // Dynamic import to prevent server-side Node.js evaluation issues
    const ort = await import("onnxruntime-web");

    // Configure WebAssembly execution provider for maximum browser compatibility
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.31.1/dist/";

    // 1. Fetch vocabulary
    const vocabRes = await fetch("/model/vocab.json");
    if (!vocabRes.ok) {
      throw new Error(
        "Vocabulary file not found at /model/vocab.json. Ensure python ml/run_pipeline.py was executed."
      );
    }
    vocabCache = await vocabRes.json();

    // 2. Fetch preprocessing config
    const configRes = await fetch("/model/preprocessing_config.json");
    if (!configRes.ok) {
      throw new Error(
        "Configuration file not found at /model/preprocessing_config.json."
      );
    }
    configCache = await configRes.json();

    // 3. Create ONNX Inference Session with CPU/WASM provider
    sessionCache = await ort.InferenceSession.create("/model/model.onnx", {
      executionProviders: ["wasm"],
      graphOptimizationLevel: "all",
    });
  })();

  return loadPromise;
}

/**
 * Classifies an email strictly in the user's browser using ONNX Runtime Web.
 * Does NOT send the email to any server or external API.
 */
export async function classifyEmailLocally(
  subject: string,
  body: string
): Promise<LocalClassificationResult> {
  await initModelSession();

  if (!sessionCache || !vocabCache || !configCache) {
    throw new Error("Model session could not be initialized.");
  }

  const ort = await import("onnxruntime-web");
  const fullText = `${subject} ${body}`.trim();

  const startTime = performance.now();

  // 1. Tokenize and convert to sequence using the exported vocabulary
  const sequence = textToSequence(fullText, vocabCache, MAX_SEQ_LENGTH);

  // 2. Create input tensor [1, 128]
  const inputTensor = new ort.Tensor("int64", sequence, [1, MAX_SEQ_LENGTH]);

  // 3. Run inference
  const inputName = configCache.input_tensor_name || "input_ids";
  const outputName = configCache.output_tensor_name || "output";

  const feeds: Record<string, Tensor> = {};
  feeds[inputName] = inputTensor;

  const results = await sessionCache.run(feeds);
  const outputTensor = results[outputName];

  if (!outputTensor) {
    throw new Error(`Output tensor '${outputName}' was not returned by model.`);
  }

  const duration = performance.now() - startTime;

  // Extract raw spam probability from the sigmoid output [1, 1]
  const rawProbability = Number(outputTensor.data[0]);

  // Threshold at 0.50
  const threshold = configCache.classification?.spam_threshold ?? 0.5;
  const isSpam = rawProbability >= threshold;
  const prediction = isSpam ? "spam" : "safe";

  // Confidence is probability of the predicted class (0.50 -> 1.00)
  const confidence = isSpam ? rawProbability : 1.0 - rawProbability;

  // Extract explanation signals
  const explanationSignals = extractExplanationSignals(fullText);

  return {
    prediction,
    confidence: Math.round(confidence * 10000) / 10000,
    rawProbability: Math.round(rawProbability * 10000) / 10000,
    explanationSignals,
    modelVersion: configCache.model_version || "mailguard-bilstm-v1.0.0",
    inferenceDurationMs: Math.round(duration * 10) / 10,
  };
}
