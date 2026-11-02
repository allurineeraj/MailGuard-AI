import { ExplanationSignal } from "@/lib/types";
import { cleanAndTokenize } from "./tokenizer";

/**
 * Common learned indicator tokens with statistical associations from the trained corpus.
 * These assist the user in understanding which tokens the model pays attention to.
 */
const KNOWN_SIGNAL_MAP: Record<string, { weight: number; label: "spam" | "safe"; description: string }> = {
  // Strong spam indicators
  font: { weight: 3.19, label: "spam", description: "HTML font markup typical of unsolicited bulk templates" },
  money: { weight: 2.21, label: "spam", description: "Monetary references often found in advance fee fraud & loans" },
  free: { weight: 2.13, label: "spam", description: "Promotional marketing hook" },
  click: { weight: 1.85, label: "spam", description: "Call-to-action link urging immediate interaction" },
  guaranteed: { weight: 1.72, label: "spam", description: "High-pressure assurance common in financial & prize schemes" },
  urgent: { weight: 1.68, label: "spam", description: "Artificial urgency designed to bypass critical thinking" },
  offer: { weight: 1.54, label: "spam", description: "Commercial sales pitch or promotional offer" },
  credit: { weight: 1.48, label: "spam", description: "Unsolicited loan or debt restructuring terms" },
  winner: { weight: 1.45, label: "spam", description: "Lottery or prize sweepstakes lure" },
  account: { weight: 1.35, label: "spam", description: "Frequent subject in account-suspension lures" },
  password: { weight: 1.30, label: "spam", description: "Credential verification request indicator" },
  deal: { weight: 1.25, label: "spam", description: "Commercial bargain claim" },
  mortgage: { weight: 1.20, label: "spam", description: "Historical refinance loan lead generation" },
  viagra: { weight: 1.95, label: "spam", description: "Unsolicited online prescription drug advertisement" },
  cialis: { weight: 1.90, label: "spam", description: "Unsolicited pharmaceutical advertising" },
  refinance: { weight: 1.40, label: "spam", description: "Unsolicited mortgage solicitation" },
  lottery: { weight: 1.80, label: "spam", description: "Fraudulent sweepstakes notification" },
  transfer: { weight: 1.35, label: "spam", description: "Funds transfer or remittance request" },
  prize: { weight: 1.45, label: "spam", description: "Bogus reward or gift card notice" },
  "<money>": { weight: 2.25, label: "spam", description: "Explicit dollar amount or currency reference" },
  "<url>": { weight: 1.15, label: "spam", description: "Embedded hyperlink to external resource" },

  // Ham / legitimate indicators
  schedule: { weight: -1.25, label: "safe", description: "Calendar or meeting scheduling context" },
  meeting: { weight: -1.40, label: "safe", description: "Internal collaboration or sync" },
  patch: { weight: -1.65, label: "safe", description: "Software patch or engineering contribution" },
  commit: { weight: -1.70, label: "safe", description: "Version control git commit log" },
  attached: { weight: -1.10, label: "safe", description: "Document or file attachment reference" },
  notes: { weight: -1.15, label: "safe", description: "Discussion or minutes summary" },
  thanks: { weight: -1.30, label: "safe", description: "Polite personal or workplace sign-off" },
  team: { weight: -1.20, label: "safe", description: "Workgroup collaboration phrasing" },
  project: { weight: -1.15, label: "safe", description: "Organizational project context" },
  sincerely: { weight: -1.05, label: "safe", description: "Formal business correspondence salutation" },
  regards: { weight: -1.10, label: "safe", description: "Standard professional closing" },
  review: { weight: -1.15, label: "safe", description: "Peer review or pull request request" }
};

/**
 * Extracts explanation signals from the email text.
 */
export function extractExplanationSignals(text: string): ExplanationSignal[] {
  const tokens = cleanAndTokenize(text);
  const seen = new Set<string>();
  const signals: ExplanationSignal[] = [];

  for (const token of tokens) {
    if (seen.has(token)) continue;
    seen.add(token);

    if (KNOWN_SIGNAL_MAP[token]) {
      const info = KNOWN_SIGNAL_MAP[token];
      signals.push({
        token,
        weight: info.weight,
        label: info.label,
        description: info.description,
      });
    }
  }

  // Sort by absolute influence weight descending
  signals.sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));

  // Return top 6 most relevant signals
  return signals.slice(0, 6);
}
