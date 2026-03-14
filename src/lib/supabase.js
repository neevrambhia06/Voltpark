import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log("VOLTPARK: Initializing Supabase...");
if (!supabaseUrl || !supabaseAnonKey) {
    console.error("VOLTPARK ERROR: Supabase URL or Anon Key is missing from .env");
} else {
    // Basic format check to warn user
    if (!supabaseAnonKey.startsWith('eyJ')) {
        console.error("VOLTPARK WARNING: VITE_SUPABASE_ANON_KEY does not look like a standard Supabase key. Please check your .env file.");
    } else {
        console.log("VOLTPARK: Supabase environment variables loaded.");
    }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
