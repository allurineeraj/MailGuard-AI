/**
 * tokenizer.ts
 * Browser-side text tokenizer and sequence encoder for MailGuard AI.
 * Guaranteed 1-to-1 parity with the Python preprocess.py implementation.
 */

export const MAX_SEQ_LENGTH = 128;
export const PAD_ID = 0;
export const UNK_ID = 1;

/**
 * Cleans raw email text and produces normalized tokens matching Python regex rules.
 */
export function cleanAndTokenize(text: string): string[] {
  if (!text || typeof text !== "string") {
    return [];
  }

  // 1. Lowercase
  let t = text.toLowerCase();

  // 2. Normalize URLs
  t = t.replace(/https?:\/\/[^\s]+|www\.[^\s]+/g, " <url> ");

  // 3. Normalize email addresses
  t = t.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, " <email> ");

  // 4. Normalize monetary amounts (e.g., $10,000, $25, 500 USD)
  t = t.replace(/\$\d+(?:,\d+)*(?:\.\d+)?|\b\d+(?:,\d+)*(?:\.\d+)?\s*(?:dollars?|usd)\b/g, " <money> ");

  // 5. Normalize standalone numbers
  t = t.replace(/\b\d+\b/g, " <num> ");

  // 6. Extract tokens: special tokens (<url>, <email>, <money>, <num>) or words >= 2 chars
  const tokenRegex = /<[a-z]+>|[a-z0-9]{2,}/g;
  const matches = t.match(tokenRegex);

  return matches || [];
}

/**
 * Converts text into a sequence of integer IDs using the exported vocabulary.
 * Returns BigInt64Array suitable for ONNX Runtime Web tensor input.
 */
export function textToSequence(
  text: string,
  vocab: Record<string, number>,
  maxLen: number = MAX_SEQ_LENGTH
): BigInt64Array {
  const tokens = cleanAndTokenize(text);
  const sequence = new BigInt64Array(maxLen);

  for (let i = 0; i < maxLen; i++) {
    if (i < tokens.length) {
      const tok = tokens[i];
      const id = vocab[tok] !== undefined ? vocab[tok] : UNK_ID;
      sequence[i] = BigInt(id);
    } else {
      sequence[i] = BigInt(PAD_ID);
    }
  }

  return sequence;
}
