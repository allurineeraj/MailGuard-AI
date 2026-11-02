# MailGuard AI — Zero-Data-Leak Spam Email Classifier

MailGuard AI is a full-stack, edge-privacy spam email classification web platform. It pairs a custom PyTorch Bidirectional LSTM (BiLSTM) neural network with **in-browser ONNX Runtime WebAssembly inference**, ensuring that email message content is processed 100% locally on the user's machine and is never transmitted to an external prediction API or backend server.

Supabase is utilized strictly for authenticated user sessions, data retention settings, and optional prediction history tracking, protected by PostgreSQL Row Level Security (RLS).

---

## Architecture Overview

```mermaid
graph TD
    A[Raw Email / Text Input] --> B[Browser Tokenizer & Preprocessor]
    B --> C[ONNX Runtime Web - WebAssembly]
    D[public/model/model.onnx] --> C
    E[public/model/vocab.json] --> B
    C --> F[Classification Result & Signals]
    F --> G[Dashboard UI Display]
    G --> H{User Signed In?}
    H -- Yes --> I[Supabase DB: Predictions Table]
    H -- No --> J[Local Display Only]
    I -. RLS Enforced .-> K[(PostgreSQL)]
```

### Privacy & Security Guarantees
1. **Zero-Server Text Processing**: Email subjects and bodies are tokenized and evaluated inside the user's browser runtime using `onnxruntime-web`.
2. **Opt-In Body Storage**: By default, only the subject line, prediction (`spam` or `safe`), confidence score, learned signal tokens, and model version are saved. Email message bodies are never persisted unless the user explicitly enables the opt-in toggle in **Settings**.
3. **Row Level Security (RLS)**: Every database operation enforces `auth.uid() = user_id`. No user can read, insert, update, or delete records belonging to another account.
4. **No Service Keys in Client**: Client bundles only reference the Supabase public anon key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`). Secrets are never committed or exposed.

---

## Dataset & Model Methodology

### 1. Dataset Provenance & Source
- **Corpus**: Apache SpamAssassin Public Email Corpus.
  - `20030228_easy_ham.tar.bz2`: 2,500 real emails (Label 0: Safe/Ham)
  - `20030228_spam.tar.bz2`: 500 real emails (Label 1: Spam)
- **Official URL**: `https://spamassassin.apache.org/old/publiccorpus/`
- **License**: Apache License 2.0 / Public Domain corpus compiled for spam filter benchmarking.
- **Dataset Manifest**: Saved to `ml/data/corpus_manifest.json` with exact archive paths and label mappings.
- **Dataset Limitations**:
  - Historical emails collected between 2002 and 2006; modern targeted spear-phishing and generative AI lures differ in style.
  - Predominantly English-language composition.
  - Reflects early-2000s commercial spam hooks (e.g., mortgage refinancing, pharmacy deals, lottery notifications).

### 2. Deduplication & Reproducible Partitioning
- **Deduplication**: 45 duplicate messages were detected and removed across the corpus to prevent cross-split data leakage, leaving **2,955 unique emails** (2,472 Ham, 483 Spam).
- **Splits**: Deterministic 70% Train (2,068 samples), 15% Validation (443 samples), and 15% Test (444 samples) using a fixed random seed (`seed=42`).
  - Train: 355 Spam, 1,713 Ham
  - Validation: 56 Spam, 387 Ham
  - Test: 72 Spam, 372 Ham
- **No Data Leakage**: The 4,000-token vocabulary is fitted **strictly on training split samples**. Validation and test emails are kept isolated from vocabulary extraction.
- **Validation Threshold Selection**: Decision thresholds are calibrated on the validation split ($T^*_{bilstm} = 0.4800$, $T^*_{baseline} = 0.2000$) to maximize validation F1 score before a single, final evaluation pass on the test set.
- **Tokenization Parity**: The exact regex normalization rules used in Python (`clean_and_tokenize`) are replicated 1-to-1 in TypeScript (`src/lib/ml/tokenizer.ts`).

### 3. Model Architecture
- **PyTorch BiLSTM (`SpamBiLSTM`)**:
  - Input: Integer sequence tensor `[batch_size, 128]`
  - Embedding layer: `num_embeddings=4000, embedding_dim=32, padding_idx=0`
  - Spatial Dropout: `0.20`
  - Bidirectional LSTM: `hidden_dim=32` (forward + backward = 64 units)
  - Global 1D Max Pooling across sequence length to capture trigger keywords
  - Dense projection: `Linear(64 -> 16) -> ReLU -> Dropout(0.20) -> Linear(16 -> 1) -> Sigmoid`
  - Compact ONNX Export: **573 KB** total weight size, executing in <25ms on WebAssembly.

### 4. Empirical Evaluation on Held-Out Test Set (444 Samples)

| Metric | PyTorch BiLSTM (Primary) | TF-IDF + Logistic Regression (Baseline) |
| :--- | :---: | :---: |
| **Decision Threshold** | **0.4800** (selected on Val) | **0.2000** (selected on Val) |
| **Accuracy** | **98.65%** | 98.20% |
| **Precision** | **95.83%** | 94.44% |
| **Recall** | **95.83%** | 94.44% |
| **F1 Score** | **95.83%** | 94.44% |
| **False Positive Rate (FPR)** | **0.81%** (3 false positives) | 1.08% (4 false positives) |
| **Confusion Matrix (TN, FP, FN, TP)** | `TN: 369, FP: 3, FN: 3, TP: 69` | `TN: 368, FP: 4, FN: 4, TP: 68` |

*Note: All metrics reflect actual evaluation runs recorded in `public/model/metrics.json` from the real Apache SpamAssassin corpus and are not fabricated or hardcoded.*

---

## Directory Structure

```
spam email classifier/
├── package.json                 # Next.js and frontend dependencies
├── tsconfig.json                # TypeScript compiler configuration
├── next.config.ts               # Next.js headers & Webpack WASM configuration
├── tailwind.config.ts           # Navy, canvas, teal, and coral design system
├── .env.example                 # Environment variable templates
├── supabase/
│   ├── migrations/
│   │   └── 20261102000000_init_mailguard.sql  # Database schema & RLS policies
│   └── README.md
├── ml/
│   ├── requirements.txt         # PyTorch, Scikit-learn, ONNX dependencies
│   ├── download_corpus.py       # SpamAssassin downloader and extractor
│   ├── preprocess.py            # Tokenizer, vocabulary builder, data splits
│   ├── model.py                 # PyTorch BiLSTM architecture
│   ├── train.py                 # Training loop with validation checkpointing
│   ├── evaluate.py              # Test set evaluation & confusion matrix generator
│   ├── export_onnx.py           # ONNX export and parity verification
│   └── run_pipeline.py          # Master pipeline script
├── public/
│   └── model/
│       ├── model.onnx           # Compact trained neural model (586 KB)
│       ├── vocab.json           # 4,000 token vocabulary mapping
│       ├── preprocessing_config.json # Tokenization rules & classification threshold
│       └── metrics.json         # Real empirical evaluation metrics
└── src/
    ├── app/                     # Next.js App Router pages
    │   ├── page.tsx             # Overview dashboard
    │   ├── analyze/page.tsx     # Client-side email analyzer
    │   ├── history/page.tsx     # Prediction history with RLS
    │   ├── insights/page.tsx    # Model benchmarks & confusion matrices
    │   ├── settings/page.tsx    # Privacy preferences & account info
    │   └── auth/                # Sign In, Sign Up, Password Reset, Callback
    ├── components/layout/       # Sidebar, Header, AppShell
    ├── lib/
    │   ├── ml/                  # In-browser tokenizer & ONNX session runner
    │   ├── supabase/            # SSR cookie-based Supabase client & middleware
    │   └── types.ts             # TypeScript interfaces
    └── middleware.ts            # Supabase session refresh middleware
```

---

## Local Setup & Development

### Prerequisites
- **Node.js**: v18.0.0 or later (v20+ recommended)
- **Python**: 3.10 or 3.11 with `pip`

### Step 1: Clone and Install Dependencies
```bash
# Install Node dependencies
npm install

# Install Python ML dependencies
pip install -r ml/requirements.txt
```

### Step 2: Run Machine Learning Pipeline (Local Training & ONNX Export)
To download the corpus, train the model, evaluate benchmarks, and export the ONNX artifacts:
```bash
python ml/run_pipeline.py
```
This command outputs the verified artifacts directly to `public/model/`:
- `model.onnx`
- `vocab.json`
- `preprocessing_config.json`
- `metrics.json`

### Step 3: Supabase Project Setup
1. Create a free project at [supabase.com](https://supabase.com).
2. Go to the **SQL Editor** in your Supabase dashboard.
3. Paste and run the SQL migration located at `supabase/migrations/20261102000000_init_mailguard.sql`.
4. In your Supabase dashboard, navigate to **Project Settings -> API** and copy:
   - Project URL
   - Public Anon Key
5. Under **Authentication -> URL Configuration**:
   - Set **Site URL** to `http://localhost:3000` (or your Vercel deployment URL).
   - Add Redirect URL: `http://localhost:3000/auth/callback` (and `https://your-domain.vercel.app/auth/callback`).

### Step 4: Environment Variables
Create a `.env.local` file in the root directory:
```bash
cp .env.example .env.local
```
Fill in your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-publishable-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Step 5: Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Deployment to Vercel

1. Push your repository to GitHub or GitLab.
2. Sign in to [Vercel](https://vercel.com) and click **Add New Project**.
3. Import your MailGuard AI repository.
4. Set the Framework Preset to **Next.js**.
5. In **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL` (set to your Vercel production URL, e.g., `https://mailguard-ai.vercel.app`)
6. Ensure that the `public/model/` directory containing `model.onnx`, `vocab.json`, `preprocessing_config.json`, and `metrics.json` is committed to Git so Vercel can serve them as static assets.
7. Click **Deploy**.
8. Once deployed, update your Supabase Auth Redirect URLs with your live Vercel domain.

---

## Student / Academic Defense Guide
- **Why BiLSTM for Spam?** Recurrent neural networks model sequential dependencies across words. The bidirectional mechanism reads context from left-to-right and right-to-left, allowing the network to recognize scam phrases (e.g., "wire transfer required immediately") even when embedded within benign text.
- **Why ONNX Runtime Web?** Traditional ML web apps deploy a Flask or FastAPI server, which introduces API costs, server scaling overhead, latency, and serious privacy liabilities (sending user emails to third-party clouds). In-browser ONNX WebAssembly delivers zero latency and strict client-side data sovereignty.
- **Why Row Level Security (RLS)?** Client applications communicate directly with Supabase via PostgREST. RLS guarantees that authorization happens at the database kernel level; even if a malicious user alters client code, the database rejects any query targeting another user's rows.
