import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Guard against accidentally bundling a service-role key in the client.
const isServiceKey = supabaseAnonKey?.toLowerCase().includes("service_role");

export const supabaseBrowser: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey && !isServiceKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

if (isServiceKey) {
  console.error(
    "Security warning: VITE_SUPABASE_ANON_KEY looks like a service-role key. Do not expose it to the client."
  );
}
