import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error(
    'Missing VITE_SUPABASE_URL environment variable'
  );
}

if (!supabaseServiceKey) {
  throw new Error(
    'Missing SUPABASE_SERVICE_ROLE_KEY environment variable. ' +
    'The server needs the service role key to bypass RLS for admin operations.'
  );
}

// Server-side client uses service role key to bypass RLS
// This is safe because server-side code validates user_id in queries
export const supabase = createClient(supabaseUrl, supabaseServiceKey);
