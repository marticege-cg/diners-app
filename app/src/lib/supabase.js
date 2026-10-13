import { createClient } from '@supabase/supabase-js';

// La clau "publishable" és pública per disseny: la seguretat real és RLS (només el propietari).
export const SUPABASE_URL = 'https://ckujpmcdpnwhtniiivzt.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_wG3IElpe64ifqKRkD8g7pg_XUCHF7nC';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});
