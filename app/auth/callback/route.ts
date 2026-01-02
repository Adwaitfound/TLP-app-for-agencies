import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get("code");
    const type = requestUrl.searchParams.get("type");
    const next = requestUrl.searchParams.get("next") ?? "/dashboard";

    console.log("AUTH_CALLBACK: Received request", { 
      hasCode: !!code, 
      type,
      next 
    });

    if (code) {
      const supabase = await createClient();
      console.log("AUTH_CALLBACK: Exchanging code for session");
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      
      console.log("AUTH_CALLBACK: Exchange result:", { 
        hasSession: !!data?.session, 
        hasUser: !!data?.user,
        userEmail: data?.user?.email,
        error: error?.message 
      });
      
      if (!error && data?.session) {
        // Check the user's recovery status or type parameter
        const isRecovery = type === 'recovery' || data.user?.user_metadata?.is_recovery;
        
        console.log("AUTH_CALLBACK: Flow type check", { type, isRecovery });
        
        if (isRecovery) {
          console.log("AUTH_CALLBACK: Password recovery flow, redirecting to reset password");
          return NextResponse.redirect(new URL("/auth/reset-password", requestUrl.origin));
        }
        
        console.log("AUTH_CALLBACK: Success, redirecting to:", next);
        return NextResponse.redirect(new URL(next, requestUrl.origin));
      }
      
      console.error("AUTH_CALLBACK: Exchange failed:", error);
    }

    // If no code or error, redirect to login
    console.log("AUTH_CALLBACK: No valid code, redirecting to login");
    return NextResponse.redirect(new URL("/login", requestUrl.origin));
  } catch (err: any) {
    console.error("AUTH_CALLBACK_EXCEPTION:", err);
    return NextResponse.redirect(new URL("/login?error=callback_failed", request.url));
  }
}
