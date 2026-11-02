"""
train.py
Trains the PyTorch BiLSTM on the training set with validation monitoring.
"""

import os
import json
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from model import SpamBiLSTM
from dataset import EmailDataset
from sklearn.metrics import f1_score


def train_model(splits_file: str, epochs=10, batch_size=32, lr=0.002, seed=42):
    torch.manual_seed(seed)
    
    with open(splits_file, "r", encoding="utf-8") as f:
        splits = json.load(f)

    train_data = splits["train"]
    val_data = splits["val"]
    vocab = splits["vocab"]

    train_ds = EmailDataset(train_data, vocab)
    val_ds = EmailDataset(val_data, vocab)

    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Training on device: {device}")

    model = SpamBiLSTM(vocab_size=len(vocab), embed_dim=32, hidden_dim=32).to(device)
    criterion = nn.BCELoss()
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)

    os.makedirs(os.path.join(os.path.dirname(__file__), "checkpoints"), exist_ok=True)
    checkpoint_path = os.path.join(os.path.dirname(__file__), "checkpoints", "best_model.pt")

    best_val_f1 = 0.0

    for epoch in range(1, epochs + 1):
        model.train()
        total_loss = 0.0

        for inputs, targets in train_loader:
            inputs, targets = inputs.to(device), targets.to(device)
            optimizer.zero_grad()
            preds = model(inputs)
            loss = criterion(preds, targets)
            loss.backward()
            optimizer.step()
            total_loss += loss.item() * len(targets)

        train_loss = total_loss / len(train_ds)

        # Validation phase
        model.eval()
        val_targets, val_preds_list = [], []
        val_loss = 0.0
        with torch.no_grad():
            for inputs, targets in val_loader:
                inputs, targets = inputs.to(device), targets.to(device)
                preds = model(inputs)
                loss = criterion(preds, targets)
                val_loss += loss.item() * len(targets)
                val_targets.extend(targets.cpu().numpy().flatten())
                val_preds_list.extend(preds.cpu().numpy().flatten())

        val_loss = val_loss / len(val_ds)
        val_pred_binary = [1 if p >= 0.5 else 0 for p in val_preds_list]
        val_f1 = f1_score(val_targets, val_pred_binary, zero_division=0)

        print(f"Epoch {epoch:02d}/{epochs:02d} - Train Loss: {train_loss:.4f} - Val Loss: {val_loss:.4f} - Val F1: {val_f1:.4f}")

        if val_f1 >= best_val_f1:
            best_val_f1 = val_f1
            torch.save(model.state_dict(), checkpoint_path)
            print(f"  --> Saved new best checkpoint (Val F1: {val_f1:.4f})")

    print(f"Training finished. Best model checkpoint saved to: {checkpoint_path}")
    return checkpoint_path
