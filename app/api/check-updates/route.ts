import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Fetch release info from GitHub (or your release server)
    // This assumes you have releases at your domain or GitHub
    const currentVersion = process.env.NEXT_PUBLIC_APP_VERSION || "0.1.50";
    const latestVersion = "0.1.51"; // Update this or fetch from a releases API

    const updateAvailable = latestVersion > currentVersion;

    if (updateAvailable) {
      const downloadUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://app.thelostproject.in"}/downloads/The Lost Project_${latestVersion}_x64.dmg`;
      
      return NextResponse.json({
        updateAvailable: true,
        currentVersion,
        latestVersion,
        downloadUrl,
        releaseNotes: "Bug fixes and notification improvements",
      });
    }

    return NextResponse.json({ updateAvailable: false, currentVersion });
  } catch (error) {
    console.error("Update check error:", error);
    return NextResponse.json({ updateAvailable: false }, { status: 500 });
  }
}
