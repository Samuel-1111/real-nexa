import { createBrowserClient } from "@supabase/ssr";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://yymlkzarekwlqzvsafgk.supabase.co";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_DWE40CXW1sL8pYecJAVHBQ_ph1TZE29";

const client = createBrowserClient(SUPABASE_URL, SUPABASE_KEY);

export function createClient() {
  return client;
}
