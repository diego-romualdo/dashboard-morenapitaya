/**
 * Morena Pitaya CRM — browser-only Supabase boundary.
 * Visual direction: the dashboard protects an editorial dark workspace; configuration failures must be explicit, never replaced by demo data.
 */
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const publishableKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY
)?.trim();

export const isSupabaseConfigured = Boolean(url && publishableKey);

export const supabase = isSupabaseConfigured
  ? createClient(url as string, publishableKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export const supabaseConfigurationHint =
  "Configure VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY antes de ativar o login.";

