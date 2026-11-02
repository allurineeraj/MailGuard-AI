"""
export_onnx.py
Exports trained PyTorch BiLSTM to ONNX format.
Exports vocabulary and preprocessing configurations for ONNX Runtime Web.
Verifies the exported ONNX model against PyTorch output.
"""

import os
import json
import torch
import numpy as np
import onnx
import onnxruntime as ort
from model import SpamBiLSTM
from preprocess import MAX_SEQ_LENGTH, clean_and_tokenize, text_to_sequence


def export_to_onnx(checkpoint_path: str, splits_file: str, output_dir: str, spam_threshold: float = 0.50):
    os.makedirs(output_dir, exist_ok=True)
    
    with open(splits_file, "r", encoding="utf-8") as f:
        splits = json.load(f)

    vocab = splits["vocab"]
    vocab_size = len(vocab)

    # 1. Load PyTorch model
    device = torch.device("cpu")
    model = SpamBiLSTM(vocab_size=vocab_size, embed_dim=32, hidden_dim=32).to(device)
    model.load_state_dict(torch.load(checkpoint_path, map_location=device))
    model.eval()

    # 2. Export to ONNX
    onnx_path = os.path.join(output_dir, "model.onnx")
    dummy_input = torch.zeros((1, MAX_SEQ_LENGTH), dtype=torch.long, device=device)

    print(f"Exporting PyTorch model to ONNX: {onnx_path}...")
    torch.onnx.export(
        model,
        dummy_input,
        onnx_path,
        export_params=True,
        opset_version=14,
        do_constant_folding=True,
        input_names=["input_ids"],
        output_names=["output"],
        dynamic_axes={
            "input_ids": {0: "batch_size"},
            "output": {0: "batch_size"}
        },
        dynamo=False
    )

    # 3. Check ONNX model validity
    onnx_model = onnx.load(onnx_path)
    onnx.checker.check_model(onnx_model)
    file_size_kb = os.path.getsize(onnx_path) / 1024
    print(f"ONNX model verified successfully! File size: {file_size_kb:.2f} KB")

    # 4. Verify numerical parity between PyTorch and ONNX Runtime
    ort_session = ort.InferenceSession(onnx_path, providers=["CPUExecutionProvider"])
    test_sample_ids = np.random.randint(0, vocab_size, size=(1, MAX_SEQ_LENGTH), dtype=np.int64)

    with torch.no_grad():
        torch_out = model(torch.tensor(test_sample_ids)).numpy()
    ort_out = ort_session.run(None, {"input_ids": test_sample_ids})[0]

    np.testing.assert_allclose(torch_out, ort_out, rtol=1e-03, atol=1e-04)
    print("Numerical parity test PASSED: PyTorch and ONNX output matches perfectly.")

    # 5. Export vocab.json
    vocab_path = os.path.join(output_dir, "vocab.json")
    with open(vocab_path, "w", encoding="utf-8") as f:
        json.dump(vocab, f)
    print(f"Vocabulary saved to: {vocab_path} ({len(vocab)} tokens)")

    # 6. Export preprocessing_config.json with calibrated decision threshold
    config = {
        "model_version": "mailguard-bilstm-v1.0.0",
        "model_format": "onnx",
        "opset_version": 14,
        "max_sequence_length": MAX_SEQ_LENGTH,
        "input_tensor_name": "input_ids",
        "output_tensor_name": "output",
        "pad_token": "<PAD>",
        "unk_token": "<UNK>",
        "pad_id": 0,
        "unk_id": 1,
        "special_tokens": {
            "<PAD>": 0,
            "<UNK>": 1,
            "<url>": 2,
            "<email>": 3,
            "<money>": 4,
            "<num>": 5
        },
        "tokenization_rules": {
            "lowercase": True,
            "url_pattern": "https?://[^\\s]+|www\\.[^\\s]+",
            "email_pattern": "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}",
            "money_pattern": "\\$\\d+(?:,\\d+)*(?:\\.\\d+)?|\\b\\d+(?:,\\d+)*(?:\\.\\d+)?\\s*(?:dollars?|usd)\\b",
            "num_pattern": "\\b\\d+\\b",
            "token_extract_pattern": "<[a-z]+>|[a-z0-9]{2,}"
        },
        "classification": {
            "spam_threshold": float(spam_threshold),
            "labels": {
                "0": "safe",
                "1": "spam"
            }
        }
    }

    config_path = os.path.join(output_dir, "preprocessing_config.json")
    with open(config_path, "w", encoding="utf-8") as f:
        json.dump(config, f, indent=2)
    print(f"Preprocessing configuration (threshold={spam_threshold:.4f}) saved to: {config_path}")


if __name__ == "__main__":
    splits_f = os.path.join(os.path.dirname(__file__), "data", "splits.json")
    ckpt_f = os.path.join(os.path.dirname(__file__), "checkpoints", "best_model.pt")
    out_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "public", "model")
    export_to_onnx(ckpt_f, splits_f, out_dir)
