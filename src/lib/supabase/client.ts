import { createBrowserClient } from "@supabase/ssr";

/**
 * Creates a Supabase browser client with public anon key.
 * Strictly uses browser cookies to persist user sessions.
 * Never uses or exposes the service role key.
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
