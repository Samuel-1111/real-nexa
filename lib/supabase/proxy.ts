import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://yymlkzarekwlqzvsafgk.supabase.co";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_DWE40CXW1sL8pYecJAVHBQ_ph1TZE29";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({name,value}) => request.cookies.set(name,value));
        response = NextResponse.next({request});
        cookiesToSet.forEach(({name,value,options}) => response.cookies.set(name,value,options));
        if (headers) for (const [key,value] of Object.entries(headers)) response.headers.set(key,value);
      }
    }
  });
  await supabase.auth.getClaims();
  return response;
}
