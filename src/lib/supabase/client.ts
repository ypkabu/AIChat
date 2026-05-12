import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
let browserClient: ReturnType<typeof createClient> | null = null;

export const isSupabaseConfigured = Boolean(supabaseUrl && publishableKey);

export function createBrowserSupabaseClient() {
  if (!supabaseUrl || !publishableKey) return null;
  if (browserClient) return browserClient;
  browserClient = createClient(supabaseUrl, publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
      storageKey: "story-roleplay-supabase-auth"
    }
  });
  return browserClient;
}
