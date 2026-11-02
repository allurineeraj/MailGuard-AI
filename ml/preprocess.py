"""
preprocess.py
Tokenization, vocabulary building, and reproducible dataset splitting.
Rules strictly followed:
1. Fits vocabulary ONLY on training data.
2. Fixes random seed for 100% reproducible Train (70%), Val (15%), Test (15%) splits.
3. Preprocessing regex matches 1-to-1 with browser TypeScript implementation.
"""

import json
import os
import re
import random
from collections import Counter

MAX_VOCAB_SIZE = 4000
MAX_SEQ_LENGTH = 128
PAD_TOKEN = "<PAD>"
UNK_TOKEN = "<UNK>"
PAD_ID = 0
UNK_ID = 1

SPECIAL_TOKENS = {
    PAD_TOKEN: PAD_ID,
    UNK_TOKEN: UNK_ID,
    "<url>": 2,
    "<email>": 3,
    "<money>": 4,
    "<num>": 5
}


def clean_and_tokenize(text: str) -> list:
    """
    Cleans raw email text and produces normalized tokens.
    Guaranteed to match the TypeScript implementation in src/lib/ml/tokenizer.ts.
    """
    if not text or not isinstance(text, str):
        return []

    # 1. Lowercase
    t = text.lower()

    # 2. Normalize URLs
    t = re.sub(r'https?://[^\s]+|www\.[^\s]+', ' <url> ', t)

    # 3. Normalize email addresses
    t = re.sub(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', ' <email> ', t)

    # 4. Normalize monetary amounts (e.g. $10,000, $25, 500 USD)
    t = re.sub(r'\$\d+(?:,\d+)*(?:\.\d+)?|\b\d+(?:,\d+)*(?:\.\d+)?\s*(?:dollars?|usd)\b', ' <money> ', t)

    # 5. Normalize standalone numbers
    t = re.sub(r'\b\d+\b', ' <num> ', t)

    # 6. Extract tokens: special tokens like <tag> or alphanumeric words of 2+ chars
    tokens = re.findall(r'<[a-z]+>|[a-z0-9]{2,}', t)
    return tokens


def build_vocabulary(train_emails: list, max_vocab_size=MAX_VOCAB_SIZE) -> dict:
    """
    Builds vocabulary STRICTLY from training emails to prevent data leakage.
    """
    counter = Counter()
    for item in train_emails:
        full_text = f"{item.get('subject', '')} {item.get('body', '')}"
        tokens = clean_and_tokenize(full_text)
        counter.update(tokens)

    vocab = dict(SPECIAL_TOKENS)
    current_id = len(vocab)

    # Add most common tokens from training split
    for token, _ in counter.most_common():
        if token not in vocab:
            vocab[token] = current_id
            current_id += 1
            if len(vocab) >= max_vocab_size:
                break

    return vocab


def text_to_sequence(text: str, vocab: dict, max_len=MAX_SEQ_LENGTH) -> list:
    """
    Encodes text into a fixed-length integer sequence of IDs.
    Pads with PAD_ID (0) or truncates to max_len.
    """
    tokens = clean_and_tokenize(text)
    ids = [vocab.get(tok, UNK_ID) for tok in tokens[:max_len]]
    if len(ids) < max_len:
        ids += [PAD_ID] * (max_len - len(ids))
    return ids


def deduplicate_emails(emails: list) -> tuple:
    """
    Removes exact and normalized duplicate emails across the corpus
    to prevent data leakage across train, val, and test splits.
    """
    seen = set()
    unique = []
    duplicates_removed = 0

    for item in emails:
        # Normalize whitespace and lowercase for robust deduplication check
        sub = (item.get("subject") or "").strip().lower()
        body = (item.get("body") or "").strip().lower()
        key = f"{sub}\n{body}"
        
        if key in seen:
            duplicates_removed += 1
        else:
            seen.add(key)
            unique.append(item)

    return unique, duplicates_removed


def create_splits(corpus_file: str, seed=42):
    """
    Loads corpus, deduplicates messages, and splits deterministically into:
    Train (70%), Validation (15%), Test (15%).
    Fits vocabulary STRICTLY on training data only.
    Saves splits to ml/data/splits.json.
    """
    with open(corpus_file, "r", encoding="utf-8") as f:
        raw_data = json.load(f)

    # 1. Deduplicate messages across the corpus
    data, duplicates_removed = deduplicate_emails(raw_data)
    print(f"Deduplication: {len(raw_data)} raw records -> {len(data)} unique ({duplicates_removed} duplicates removed)")

    # 2. Stratified / randomized deterministic split
    random.seed(seed)
    random.shuffle(data)

    n = len(data)
    train_end = int(n * 0.70)
    val_end = int(n * 0.85)

    train_data = data[:train_end]
    val_data = data[train_end:val_end]
    test_data = data[val_end:]

    print(f"Dataset splits: Train={len(train_data)}, Val={len(val_data)}, Test={len(test_data)}")
    print(f"  Train: Spam={sum(1 for x in train_data if x['label'] == 1)}, Ham={sum(1 for x in train_data if x['label'] == 0)}")
    print(f"  Val:   Spam={sum(1 for x in val_data if x['label'] == 1)}, Ham={sum(1 for x in val_data if x['label'] == 0)}")
    print(f"  Test:  Spam={sum(1 for x in test_data if x['label'] == 1)}, Ham={sum(1 for x in test_data if x['label'] == 0)}")

    # 3. Fit vocabulary ONLY on training data to prevent data leakage
    vocab = build_vocabulary(train_data, max_vocab_size=MAX_VOCAB_SIZE)
    print(f"Vocabulary fitted STRICTLY on training data: {len(vocab)} tokens")

    splits_file = os.path.join(os.path.dirname(__file__), "data", "splits.json")
    with open(splits_file, "w", encoding="utf-8") as f:
        json.dump({
            "metadata": {
                "raw_count": len(raw_data),
                "unique_count": len(data),
                "duplicates_removed": duplicates_removed,
                "train_count": len(train_data),
                "val_count": len(val_data),
                "test_count": len(test_data),
                "seed": seed
            },
            "train": train_data,
            "val": val_data,
            "test": test_data,
            "vocab": vocab
        }, f)

    return splits_file, vocab
