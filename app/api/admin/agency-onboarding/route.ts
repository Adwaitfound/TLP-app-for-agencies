import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

const ALLOWED_EMAILS = ["adwait@thelostproject.in"];

function isAuthorized(request: Request) {
  const requester = request.headers.get("x-user-email")?.toLowerCase();
  return requester && ALLOWED_EMAILS.includes(requester);
}

/**
 * GET /api/admin/agency-onboarding
 * List all agency onboarding requests
 * Only accessible to system admin
 */
export async function GET(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("agency_onboarding_requests")
      .select("id, agency_name, admin_email, admin_name, website, plan, notes, status, created_at, updated_at")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      console.error("AGENCY_ONBOARDING_LIST_ERROR", { message: error.message });
      return NextResponse.json({ error: "Failed to fetch onboarding requests" }, { status: 500 });
    }

    return NextResponse.json({ requests: data ?? [] });
  } catch (err: any) {
    console.error("AGENCY_ONBOARDING_LIST_EXCEPTION", { message: err?.message });
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
