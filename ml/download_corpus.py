"""
download_corpus.py
Downloads and extracts the Apache SpamAssassin public email corpus.
Source: https://spamassassin.apache.org/old/publiccorpus/
License: Apache License 2.0 / Public Domain corpus compiled for anti-spam research.
Limitations:
- Historical emails (collected ~2002-2006). Modern phishing/spear-phishing patterns differ.
- May contain offensive spam content, dating ads, and financial scams characteristic of early 2000s.
- English language majority.
"""

import os
import tarfile
import urllib.request
import email
from email import policy
import json
import random

BASE_URL = "https://spamassassin.apache.org/old/publiccorpus/"
ARCHIVES = [
    ("20030228_easy_ham.tar.bz2", 0),  # 0 = safe / ham
    ("20030228_spam.tar.bz2", 1),      # 1 = spam
]

RAW_DIR = os.path.join(os.path.dirname(__file__), "data", "raw")
PROCESSED_FILE = os.path.join(os.path.dirname(__file__), "data", "corpus.json")


def extract_email_text_and_subject(file_path):
    """Safely extracts subject and text content from raw email file."""
    try:
        with open(file_path, "rb") as f:
            msg = email.message_from_binary_file(f, policy=policy.default)
        
        subject = str(msg.get("subject", "") or "")
        
        body_parts = []
        if msg.is_multipart():
            for part in msg.walk():
                content_type = part.get_content_type()
                if content_type in ["text/plain", "text/html"]:
                    payload = part.get_payload(decode=True)
                    if payload:
                        body_parts.append(payload.decode("utf-8", errors="ignore"))
        else:
            payload = msg.get_payload(decode=True)
            if payload:
                body_parts.append(payload.decode("utf-8", errors="ignore"))
            else:
                body_parts.append(str(msg.get_payload() or ""))

        body = "\n".join(body_parts).strip()
        return subject.strip(), body
    except Exception:
        return "", ""


def download_and_extract():
    os.makedirs(RAW_DIR, exist_ok=True)
    all_emails = []

    download_success = True
    for archive_name, label in ARCHIVES:
        archive_path = os.path.join(RAW_DIR, archive_name)
        url = BASE_URL + archive_name
        
        if not os.path.exists(archive_path):
            print(f"Downloading {url}...")
            try:
                opener = urllib.request.build_opener()
                opener.addheaders = [("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) MailGuardAI/1.0")]
                urllib.request.install_opener(opener)
                urllib.request.urlretrieve(url, archive_path)
                print(f"Saved to {archive_path}")
            except Exception as e:
                print(f"Failed to download {archive_name}: {e}")
                download_success = False

        if os.path.exists(archive_path) and os.path.getsize(archive_path) > 1000:
            extracted_folder = archive_path.replace(".tar.bz2", "")
            if not os.path.exists(extracted_folder):
                print(f"Extracting {archive_name}...")
                try:
                    with tarfile.open(archive_path, "r:bz2") as tar:
                        tar.extractall(path=RAW_DIR)
                except Exception as e:
                    print(f"Extraction error for {archive_name}: {e}")

    # Walk raw directories to collect parsed emails
    for root, dirs, files in os.walk(RAW_DIR):
        rel = os.path.relpath(root, RAW_DIR).lower()
        parts = rel.split(os.sep)
        
        # Check relative directory name specifically
        is_spam_dir = any("spam" in p for p in parts)
        is_ham_dir = any("ham" in p or "easy_ham" in p for p in parts)

        if not (is_spam_dir or is_ham_dir):
            continue
        # If folder is under spam, label is 1; if under ham, label is 0
        label = 1 if is_spam_dir else 0

        for f in files:
            if f.endswith(".tar.bz2") or f.startswith("cmds") or f == ".DS_Store":
                continue
            fpath = os.path.join(root, f)
            sub, body = extract_email_text_and_subject(fpath)
            if body or sub:
                all_emails.append({
                    "subject": sub,
                    "body": body,
                    "label": label  # 1 = spam, 0 = safe/ham
                })

    print(f"Total extracted real emails: {len(all_emails)}")

    if len(all_emails) < 500:
        raise RuntimeError(
            f"Insufficient real SpamAssassin emails extracted ({len(all_emails)} found). "
            "Please ensure network access to download Apache SpamAssassin archives or "
            "verify that archives in ml/data/raw are properly extracted."
        )

    # Record manifest of archives, files, and labels used
    manifest_file = os.path.join(os.path.dirname(__file__), "data", "corpus_manifest.json")
    manifest = {
        "corpus_name": "Apache SpamAssassin Public Mail Corpus",
        "source_base_url": BASE_URL,
        "archives": [
            {
                "archive": archive_name,
                "label": label,
                "label_name": "spam" if label == 1 else "safe_ham",
                "extracted_count": sum(1 for e in all_emails if e["label"] == label),
                "local_path": os.path.join(RAW_DIR, archive_name)
            }
            for archive_name, label in ARCHIVES
        ],
        "total_extracted_emails": len(all_emails),
        "license": "Apache License 2.0 / Public Domain for Anti-Spam Research"
    }
    with open(manifest_file, "w", encoding="utf-8") as mf:
        json.dump(manifest, mf, indent=2)
    print(f"Corpus manifest saved to {manifest_file}")

    # Save to corpus.json
    with open(PROCESSED_FILE, "w", encoding="utf-8") as out:
        json.dump(all_emails, out, indent=2)
    print(f"Corpus ready at {PROCESSED_FILE} ({len(all_emails)} records)")
    return PROCESSED_FILE


def generate_representative_spamassassin_corpus():
    """
    Curated set of 1,200 diverse emails modeled directly on SpamAssassin categories:
    Financial fraud, Nigerian prince, pharma/viagra, fake mortgage/refinancing,
    credential harvesting, lotto wins, work from home, newsletters, open-source mailing lists,
    developer git commits, team meeting invites, software patch notifications, system alerts.
    """
    random.seed(42)
    emails = []

    spam_templates = [
        ("URGENT: Claim your lottery winnings of $2,500,000 USD",
         "Dear Winner, We are pleased to notify you of the International Lottery Program. Your email address won $2,500,000. Send bank account details and full name immediately to claim prize now."),
        ("Refinance your mortgage with record low 1.9% APR guaranteed!",
         "Special limited time promotion: Lower your monthly home loan mortgage payments. No credit check required! Click here to get instant pre-approval cash out refinance."),
        ("VIAGRA / CIALIS 70% DISCOUNT - Discreet overnight shipping",
         "Buy cheap generic prescription meds online. No prior prescription required. Lowest price guaranteed, 100% confidential discreet delivery right to your door."),
        ("URGENT ASSISTANCE: Fund transfer proposal from Dr. Bakare",
         "I am Dr. Bakare of the Nigerian National Petroleum audit committee. We discovered an unclaimed over-invoiced contract balance of $18.5M. I request your confidential assistance to transfer funds into your offshore account for 30% commission."),
        ("Work From Home: Make $450 - $1,200 Daily With No Experience",
         "Start making cash online today with our proven turnkey automated business system. Only computer and internet required. Free registration for next 50 participants!"),
        ("Final Notice: Your Account Will Be Suspended Within 24 Hours",
         "Dear customer, our security department detected suspicious sign-in attempts on your account. Verify your identity and password immediately by clicking the link below or account access will be permanently terminated."),
        ("CONGRATULATIONS: You have been selected for a free $1,000 Walmart Gift Card!",
         "Answer 3 quick survey questions to claim your complimentary $1,000 gift card immediately! Offer valid only today. Click to claim your exclusive voucher reward."),
        ("Hot Singles In Your Neighborhood Want To Meet You Tonight",
         "Local ladies are waiting for private chat. 100% anonymous free dating profile setup. Click here to browse verified photos and start instant messaging now."),
        ("Fast Cash Loans - Bad Credit OK - Approved In 15 Minutes",
         "Need emergency money? Get unsecured payday personal loan up to $5,000 transferred straight into your checking account today regardless of credit score history."),
        ("Exclusive Casino Bonus: 500% Match Deposit + 100 Free Spins",
         "Double your winnings at Royal Fortune Online Casino! Deposit $50 play with $300. Jackpot guaranteed payout within 24 hours. Sign up now!"),
        ("Re: Your unpaid invoice #849202 attached - wire payment required",
         "Please find attached overdue invoice for services rendered. Immediate remittance via wire transfer or cryptocurrency is required before legal collections action."),
        ("Lose 25 Pounds in 2 Weeks With Miracle Keto Diet Cleanse",
         "Doctor discovered revolutionary breakthrough fat melting pill. Melts abdominal fat while you sleep. Risk-free 30 day trial bottle available today only."),
        ("Earn 15% Daily Guaranteed ROI with Automated Crypto Arbitrage Bot",
         "Join thousands of investors generating passive income through high frequency Bitcoin trading algorithms. Deposit $250 today and withdraw instant daily profits."),
        ("Action Required: Undelivered Postal Package Tracking #US928103",
         "Your courier package could not be delivered due to incomplete recipient street address. Please update delivery address and pay $1.95 redelivery fee via link below."),
        ("Cheap Luxury Replica Watches - Rolex, Omega, Breitling at 90% Off",
         "Indistinguishable Swiss movement replica timepieces with authentic box and paperwork. Free worldwide expedited shipping on orders over $150.")
    ]

    ham_templates = [
        ("[SpamAssassin-devel] Release 2.50 testing and bug fixes",
         "Hi all, we have tagged the release candidate rc2 for version 2.50 on SourceForge. Please run `make test` on your Linux and FreeBSD installations and report any regex failures or rule regressions to bugzilla."),
        ("Meeting Notes: Q3 Infrastructure Roadmap & PostgreSQL Migration",
         "Thanks everyone for attending today's architecture sync. Key decisions: 1. Supabase Postgres connection pooling with PgBouncer will roll out next Tuesday. 2. Frontend bundle optimization is on track. Follow-up meeting scheduled Friday 10 AM."),
        ("[git commit] Fix null pointer dereference in email header parser",
         "Commit hash: 9a4f210d. Author: Alice Johnson. Message: Added boundary checks when parsing MIME multipart boundaries without closing hyphens. Fixes issue #142 reported on Linux."),
        ("Flight Confirmation: SFO to JFK on Nov 14 (Booking Ref: G7K9LP)",
         "Your itinerary has been confirmed. Flight DL 482 departs San Francisco International at 08:30 AM and arrives New York JFK at 04:55 PM. Baggage allowance: 1 carry-on, 1 personal item."),
        ("Weekly Team Standup Summary - Project MailGuard",
         "Team updates: David completed the ONNX runtime export script. Sarah refined the Tailwind UI dashboard components. Remaining tasks: Supabase RLS migrations and end-to-end evaluation metrics verification."),
        ("Review Request: Pull Request #88 - Add unit tests for tokenizer",
         "Could you please review PR #88 when you have a chance? Adds comprehensive test coverage for Unicode text normalization, punctuation stripping, and out-of-vocabulary handling in preprocess.py."),
        ("Your monthly electricity and utility statement is ready",
         "Your statement for billing period Oct 1 - Oct 31 is now available online. Total amount due: $78.42. Due date: Nov 22. Payment will be automatically deducted from your linked checking account."),
        ("Lunch and Learn: Introduction to Transformers and BiLSTM architectures",
         "Join the engineering team this Thursday at 12:30 PM in Conference Room B for a tech talk comparing recurrent neural networks with multi-head self-attention models for edge classification."),
        ("Dentist Appointment Reminder for tomorrow at 2:30 PM",
         "This is a courtesy reminder from Dental Care Associates of your upcoming routine cleaning appointment tomorrow Nov 3 at 2:30 PM. Please arrive 10 minutes early. Call 555-0192 if you need to reschedule."),
        ("Package Delivered: Order #402-9182390 placed on Amazon",
         "Your package was delivered to the front porch as instructed. Included items: Anker USB-C Hub and Logitech MX Master 3S wireless mouse. Let us know if you have any questions."),
        ("[Linux-Kernel] [PATCH v2] net: optimize TCP socket buffer allocation",
         "This patch reduces cacheline bouncing on multi-core NUMA systems by batching skb allocation inside the TCP receive path. Benchmarked throughput shows a 3.4% improvement on 10GbE interfaces."),
        ("Quarterly performance review schedule and self-assessment",
         "Reminder: Please complete your Q3 self-assessment in Workday before end of day Friday. 1-on-1 review meetings with team leads will be scheduled throughout next week."),
        ("Recipe: Homemade Sourdough Bread with wild yeast starter",
         "Here is the bread recipe we discussed over the weekend. Ingredients: 500g bread flour, 350g lukewarm water, 100g active starter, 10g salt. 4-hour bulk fermentation with stretch and folds every 30 minutes."),
        ("Software License Renewal Confirmation - JetBrains All Products Pack",
         "Your annual subscription for JetBrains Toolbox has been successfully renewed. Your licensed products are valid through Nov 2027. Invoice is attached to this email."),
        ("Python 3.12 release notes and deprecation warnings overview",
         "The Python Software Foundation has released Python 3.12. Key features: isolated subinterpreters, improved error messages, Linux perf profiler support, and removal of deprecated distutils modules.")
    ]

    # Generate 600 spam and 600 ham with variations to achieve a balanced 1,200 sample dataset
    spam_modifiers = [
        " Act immediately!", " Limited time offer.", " Reply with your full phone number.",
        " No hidden fees.", " 100% satisfaction guaranteed.", " Click here now."
    ]
    ham_modifiers = [
        " Let me know if you have any questions.", " Best regards,", " Sent from my workstation.",
        " Please review the attached document.", " Looking forward to your reply.", " See you at the sync."
    ]

    for i in range(600):
        sub, body = random.choice(spam_templates)
        mod = random.choice(spam_modifiers)
        emails.append({
            "subject": f"{sub} [{random.randint(100, 999)}]" if random.random() > 0.5 else sub,
            "body": f"{body} {mod}\n\nRef ID: {random.randint(10000, 99999)}",
            "label": 1
        })

    for i in range(600):
        sub, body = random.choice(ham_templates)
        mod = random.choice(ham_modifiers)
        emails.append({
            "subject": f"Re: {sub}" if random.random() > 0.4 else sub,
            "body": f"{body}\n\n{mod}\nRegards,\nEngineer #{random.randint(1, 50)}",
            "label": 0
        })

    random.shuffle(emails)
    return emails


if __name__ == "__main__":
    download_and_extract()
