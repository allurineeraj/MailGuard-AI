export type PredictionLabel = "spam" | "safe";

export interface ExplanationSignal {
  token: string;
  weight: number;
  label: "spam" | "safe";
  description?: string;
}

export interface PredictionRecord {
  id: string;
  user_id: string;
  created_at: string;
  subject: string;
  prediction: PredictionLabel;
  confidence: number;
  explanation_signals: ExplanationSignal[];
  model_version: string;
  email_body?: string | null;
}

export interface UserSettings {
  user_id: string;
  store_email_body: boolean;
  updated_at: string;
}

export interface ModelMetricsData {
  dataset_info: {
    name: string;
    source_url: string;
    license: string;
    limitations: string[];
    split_counts: {
      train: number;
      val: number;
      test: number;
      total: number;
    };
    vocab_size: number;
    max_sequence_length: number;
    evaluated_at: string;
  };
  models: {
    bilstm: {
      name: string;
      architecture: string;
      accuracy: number;
      precision: number;
      recall: number;
      f1: number;
      false_positive_rate: number;
      confusion_matrix: {
        tn: number;
        fp: number;
        fn: number;
        tp: number;
      };
      test_samples: number;
    };
    baseline_logistic_regression: {
      name: string;
      architecture: string;
      accuracy: number;
      precision: number;
      recall: number;
      f1: number;
      false_positive_rate: number;
      confusion_matrix: {
        tn: number;
        fp: number;
        fn: number;
        tp: number;
      };
      test_samples: number;
    };
  };
  learned_signals: {
    top_spam_indicators: Array<{ token: string; weight: number }>;
    top_ham_indicators: Array<{ token: string; weight: number }>;
  };
}

export interface PreprocessingConfig {
  model_version: string;
  model_format: string;
  opset_version: number;
  max_sequence_length: number;
  input_tensor_name: string;
  output_tensor_name: string;
  pad_token: string;
  unk_token: string;
  pad_id: number;
  unk_id: number;
  special_tokens: Record<string, number>;
  classification: {
    spam_threshold: number;
    labels: {
      "0": "safe";
      "1": "spam";
    };
  };
}

export interface LocalClassificationResult {
  prediction: PredictionLabel;
  confidence: number;
  rawProbability: number;
  explanationSignals: ExplanationSignal[];
  modelVersion: string;
  inferenceDurationMs: number;
}
