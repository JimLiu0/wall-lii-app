import { createClient } from '@supabase/supabase-js';

// Allow `next build` / CI when env is unset: createClient throws if url/key are missing.
// Queries then fail fast; routes that handle `error` still prerender sensibly.
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:1';
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'missing-build-time-anon-key';

export const supabase = createClient(supabaseUrl, supabaseKey);