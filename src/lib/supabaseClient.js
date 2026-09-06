import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

if (!isSupabaseConfigured) {
  console.warn(
    "Supabase env vars are missing (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY). " +
      "Copy .env.example to .env.local and fill them in — until then, history and " +
      "custom exercises won't be saved."
  );
}

export const supabase = isSupabaseConfigured ? createClient(url, anonKey) : null;
