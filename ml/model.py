"""
model.py
PyTorch BiLSTM Neural Network for spam email classification.
Compact, robust architecture optimized for browser ONNX Web inference.
"""

import torch
import torch.nn as nn


class SpamBiLSTM(nn.Module):
    def __init__(self, vocab_size: int, embed_dim=32, hidden_dim=32, num_classes=1, dropout=0.2):
        super().__init__()
        self.embedding = nn.Embedding(
            num_embeddings=vocab_size,
            embedding_dim=embed_dim,
            padding_idx=0
        )
        self.dropout = nn.Dropout(dropout)
        self.bilstm = nn.LSTM(
            input_size=embed_dim,
            hidden_size=hidden_dim,
            batch_first=True,
            bidirectional=True
        )
        # BiLSTM outputs hidden_dim * 2 (forward + backward)
        lstm_out_dim = hidden_dim * 2
        
        self.classifier = nn.Sequential(
            nn.Linear(lstm_out_dim, 16),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(16, num_classes),
            nn.Sigmoid()
        )

    def forward(self, input_ids: torch.Tensor) -> torch.Tensor:
        # input_ids shape: [batch_size, seq_len]
        embedded = self.dropout(self.embedding(input_ids))  # [batch_size, seq_len, embed_dim]
        lstm_out, _ = self.bilstm(embedded)                 # [batch_size, seq_len, hidden_dim * 2]
        
        # Global max pooling over sequence length to capture key trigger tokens
        pooled, _ = torch.max(lstm_out, dim=1)              # [batch_size, hidden_dim * 2]
        
        output = self.classifier(pooled)                    # [batch_size, 1]
        return output
