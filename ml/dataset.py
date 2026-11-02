"""
dataset.py
PyTorch Dataset wrapper for email classification.
"""

import torch
from torch.utils.data import Dataset
from preprocess import text_to_sequence, MAX_SEQ_LENGTH


class EmailDataset(Dataset):
    def __init__(self, emails: list, vocab: dict, max_len=MAX_SEQ_LENGTH):
        self.samples = []
        for item in emails:
            full_text = f"{item.get('subject', '')} {item.get('body', '')}"
            seq = text_to_sequence(full_text, vocab, max_len=max_len)
            label = float(item.get("label", 0))
            self.samples.append((seq, label))

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        seq, label = self.samples[idx]
        return (
            torch.tensor(seq, dtype=torch.long),
            torch.tensor([label], dtype=torch.float32)
        )
