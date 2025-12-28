import { NextResponse } from "next/server";
import { sendTestNotificationToAdmin } from "@/app/actions/notifications";

export async function POST() {
  const res = await sendTestNotificationToAdmin();
  if (!res.success) {
    return NextResponse.json({ ok: false, error: res.error }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
