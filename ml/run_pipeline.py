"""
run_pipeline.py
Master execution pipeline for MailGuard AI ML:
1. Download / extract SpamAssassin corpus
2. Preprocess & create reproducible train/val/test splits
3. Train PyTorch BiLSTM model
4. Evaluate BiLSTM & Baseline TF-IDF + Logistic Regression on test set
5. Export ONNX model, vocab, configs, and verified metrics to public/model/
"""

import os
import sys
import time
from download_corpus import download_and_extract
from preprocess import create_splits
from train import train_model
from evaluate import evaluate_models
from export_onnx import export_to_onnx


def main():
    start_time = time.time()
    print("=" * 60)
    print(" MAILGUARD AI: MACHINE LEARNING PIPELINE")
    print("=" * 60)

    # 1. Download Corpus
    print("\n[Step 1/5] Preparing SpamAssassin Public Corpus...")
    corpus_file = download_and_extract()

    # 2. Preprocess & Splits
    print("\n[Step 2/5] Creating Reproducible Splits & Fitting Vocabulary...")
    splits_file, vocab = create_splits(corpus_file, seed=42)

    # 3. Train PyTorch BiLSTM
    print("\n[Step 3/5] Training PyTorch BiLSTM Model...")
    checkpoint_path = train_model(splits_file, epochs=10, batch_size=32, lr=0.002, seed=42)

    # 4. Evaluate against TF-IDF + Logistic Regression Baseline
    print("\n[Step 4/5] Evaluating on Held-Out Test Set with Validation Threshold Selection...")
    project_root = os.path.dirname(os.path.dirname(__file__))
    public_model_dir = os.path.join(project_root, "public", "model")
    metrics_path = os.path.join(public_model_dir, "metrics.json")
    metrics = evaluate_models(splits_file, checkpoint_path, metrics_path)
    bilstm_thresh = metrics.get("models", {}).get("bilstm", {}).get("decision_threshold", 0.50)

    # 5. Export to ONNX and Web Artifacts
    print("\n[Step 5/5] Exporting ONNX Model and Preprocessing Configs...")
    export_to_onnx(checkpoint_path, splits_file, public_model_dir, spam_threshold=bilstm_thresh)

    elapsed = time.time() - start_time
    print("\n" + "=" * 60)
    print(f" PIPELINE COMPLETED SUCCESSFULLY in {elapsed:.2f}s!")
    print(f" Web inference artifacts ready in: {public_model_dir}")
    print("=" * 60)


if __name__ == "__main__":
    main()
