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

  const { data } = await supabase.auth.getClaims();
  const path = request.nextUrl.pathname;

  // Returning authenticated users should never be sent through onboarding again.
  if (data?.claims?.sub && (path === "/" || path === "/welcome" || path === "/auth")) {
    const url = request.nextUrl.clone();
    url.pathname = "/home";
    const redirect = NextResponse.redirect(url);
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie.name, cookie.value);
    for (const header of ["cache-control", "expires", "pragma"]) {
      const value = response.headers.get(header);
      if (value) redirect.headers.set(header, value);
    }
    return redirect;
  }

  // New/unauthenticated visitors get the dedicated first-visit welcome screen.
  if (!data?.claims?.sub && path === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/welcome";
    return NextResponse.redirect(url);
  }

  return response;
}
