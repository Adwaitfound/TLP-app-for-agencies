import { NextResponse } from "next/server";
import { getProvisioningStatus } from "@/lib/provisioning/orchestrator";

const ALLOWED_EMAILS = ["adwait@thelostproject.in"];

function isAuthorized(request: Request) {
  const requester = request.headers.get("x-user-email")?.toLowerCase();
  return requester && ALLOWED_EMAILS.includes(requester);
}

export async function GET(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('requestId');

    if (!requestId) {
      return NextResponse.json({ error: "requestId is required" }, { status: 400 });
    }

    const status = await getProvisioningStatus(requestId);

    return NextResponse.json(status);

  } catch (error: any) {
    console.error("GET_PROVISIONING_STATUS_ERROR", error);
    return NextResponse.json(
      { error: error.message || "Failed to get provisioning status" },
      { status: 500 }
    );
  }
}
