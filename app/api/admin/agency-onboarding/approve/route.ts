import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { provisionAgency } from "@/lib/provisioning/orchestrator";

const ALLOWED_EMAILS = ["adwait@thelostproject.in"];

function isAuthorized(request: Request) {
  const requester = request.headers.get("x-user-email")?.toLowerCase();
  return requester && ALLOWED_EMAILS.includes(requester);
}

export async function POST(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const requestId = body?.requestId as string | undefined;

    if (!requestId) {
      return NextResponse.json({ error: "requestId is required" }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Fetch onboarding request
    const { data: reqRow, error: fetchErr } = await supabase
      .from("agency_onboarding_requests")
      .select("id, agency_name, admin_email, admin_name, website, plan, status")
      .eq("id", requestId)
      .single();

    if (fetchErr || !reqRow) {
      console.error("AGENCY_APPROVE_FETCH_ERROR", { message: fetchErr?.message });
      return NextResponse.json({ error: "Onboarding request not found" }, { status: 404 });
    }

    if (reqRow.status === 'approved' || reqRow.status === 'provisioning') {
      return NextResponse.json({ 
        error: "Request already approved or being provisioned" 
      }, { status: 400 });
    }

    console.log("AGENCY_APPROVED", {
      requestId,
      agencyName: reqRow.agency_name,
      adminEmail: reqRow.admin_email,
    });

    // Start provisioning in background
    // We return immediately and let provisioning run async
    setImmediate(async () => {
      try {
        await provisionAgency({
          requestId: reqRow.id,
          agencyName: reqRow.agency_name!,
          ownerEmail: reqRow.admin_email!,
          ownerName: reqRow.admin_name || 'Agency Admin',
        });
      } catch (error) {
        console.error('PROVISIONING_ERROR', error);
      }
    });

    // Return success immediately
    return NextResponse.json({
      success: true,
      requestId,
      message: 'Provisioning started',
      status: 'provisioning',
    });

  } catch (err: any) {
    console.error("AGENCY_APPROVE_EXCEPTION", { message: err?.message });
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
