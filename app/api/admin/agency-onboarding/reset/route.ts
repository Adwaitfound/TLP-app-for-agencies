import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

const ALLOWED_EMAILS = ["adwait@thelostproject.in"];

function isAuthorized(request: Request) {
  const requester = request.headers.get("x-user-email")?.toLowerCase();
  return requester && ALLOWED_EMAILS.includes(requester);
}

/**
 * POST /api/admin/agency-onboarding/reset
 * Reset an onboarding request back to pending status
 */
export async function POST(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { requestId } = await request.json();
    if (!requestId) {
      return NextResponse.json({ error: "requestId is required" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("agency_onboarding_requests")
      .update({ status: "pending" })
      .eq("id", requestId)
      .select("id, agency_name, status");

    if (error) {
      console.error("AGENCY_ONBOARDING_RESET_ERROR", { message: error.message });
      return NextResponse.json({ error: "Failed to reset request" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data?.[0] });
  } catch (err: any) {
    console.error("AGENCY_ONBOARDING_RESET_EXCEPTION", { message: err?.message });
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
