import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/database.types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  const missing = [
    ...(!supabaseUrl ? ["VITE_SUPABASE_URL"] : []),
    ...(!supabaseAnonKey ? ["VITE_SUPABASE_ANON_KEY or VITE_SUPABASE_PUBLISHABLE_KEY"] : []),
  ];
  throw new Error(`Missing Supabase environment variable(s): ${missing.join(", ")}`);
}

export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);
