import { NextResponse } from "next/server";

export async function GET() {
  try {
    const latestVersion = "0.1.51";
    const downloadUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://app.thelostproject.in"}/downloads/The Lost Project_${latestVersion}_x64.dmg`;

    return NextResponse.json({
      version: latestVersion,
      downloadUrl,
      releaseNotes: "Bug fixes and notification improvements",
    });
  } catch (error) {
    console.error("Get update info error:", error);
    return NextResponse.json({ error: "Failed to get update info" }, { status: 500 });
  }
}
