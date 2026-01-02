import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

const MAX_FIELD = 500;

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let payload: any = {};
    let logoFile: File | null = null;

    if (contentType.includes("application/json")) {
      payload = await request.json().catch(() => null);
      if (!payload) {
        return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
      }
    } else if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      payload = {
        agencyName: formData.get("agencyName"),
        adminEmail: formData.get("adminEmail"),
        adminName: formData.get("adminName"),
        website: formData.get("website"),
        plan: formData.get("plan"),
        notes: formData.get("notes"),
      };
      logoFile = formData.get("logo") as File | null;
    } else {
      return NextResponse.json({ error: "Invalid content type" }, { status: 400 });
    }

    const agencyName = (payload.agencyName || "").toString().trim();
    const adminEmail = (payload.adminEmail || "").toString().trim().toLowerCase();
    const adminName = payload.adminName ? payload.adminName.toString().trim() : null;
    const website = payload.website ? payload.website.toString().trim() : null;
    const plan = (payload.plan || "standard").toString().trim().toLowerCase();
    const notes = payload.notes ? payload.notes.toString().trim() : null;

    if (!agencyName || !adminEmail) {
      return NextResponse.json({ error: "agencyName and adminEmail are required" }, { status: 400 });
    }

    const fields = [agencyName, adminEmail, adminName, website, notes];
    if (fields.some((value) => typeof value === "string" && value.length > MAX_FIELD)) {
      return NextResponse.json({ error: "Field values are too long" }, { status: 400 });
    }

    const supabaseConfigured = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
    let insertError: any = null;
    let requestId: string | null = null;
    let logoUrl: string | null = null;

    if (supabaseConfigured) {
      try {
        const supabase = createServiceClient();

        // Upload logo if provided
        if (logoFile && logoFile.size > 0) {
          const logoFileName = `${Date.now()}-${logoFile.name}`;
          const logoBuffer = await logoFile.arrayBuffer();
          
          const { error: uploadError, data: uploadData } = await supabase.storage
            .from("agency-logos")
            .upload(logoFileName, logoBuffer, {
              contentType: logoFile.type,
              upsert: false,
            });

          if (!uploadError && uploadData) {
            const { data: publicUrl } = supabase.storage
              .from("agency-logos")
              .getPublicUrl(logoFileName);
            logoUrl = publicUrl.publicUrl;
          } else {
            console.warn("AGENCY_ONBOARDING_LOGO_UPLOAD_ERROR", { message: uploadError?.message });
          }
        }

        const { data, error } = await supabase
          .from("agency_onboarding_requests")
          .insert({
            agency_name: agencyName,
            admin_email: adminEmail,
            admin_name: adminName,
            website,
            plan,
            notes,
            logo_url: logoUrl,
            status: "pending",
          })
          .select("id")
          .single();

        if (error) {
          insertError = error;
          console.error("AGENCY_ONBOARDING_INSERT_ERROR", { message: error.message, hint: error.hint, code: (error as any)?.code });
        } else {
          requestId = data?.id ?? null;
        }
      } catch (err: any) {
        insertError = err;
        console.error("AGENCY_ONBOARDING_INSERT_EXCEPTION", { message: err?.message, stack: err?.stack });
      }
    } else {
      console.error("AGENCY_ONBOARDING_MISCONFIG", {
        hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      });
    }

    // Notify ops via Resend (best effort, non-blocking for user)
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Agency Onboarding <notifications@thelostproject.in>",
            to: ["adwait@thelostproject.in"],
            subject: "New agency onboarding request",
            text: [
              `Agency: ${agencyName}`,
              `Admin: ${adminName || "(not provided)"}`,
              `Email: ${adminEmail}`,
              `Website: ${website || "(not provided)"}`,
              `Plan: ${plan}`,
              `Logo: ${logoUrl ? "yes" : "no"}`,
              `Notes: ${notes || "(none)"}`,
              `Stored in DB: ${insertError ? "no" : "yes"}`,
              insertError ? `Insert error: ${insertError?.message || "unknown"}` : "",
              requestId ? `Request ID: ${requestId}` : "",
            ]
              .filter(Boolean)
              .join("\n"),
          }),
        });
      } catch (err: any) {
        console.error("AGENCY_ONBOARDING_NOTIFY_ERROR", { message: err?.message, stack: err?.stack });
      }
    }

    return NextResponse.json({
      success: true,
      requestId,
      stored: !insertError,
      message: "Thanks for your interest—our team is on it and will get back to you shortly.",
    });
  } catch (err: any) {
    console.error("AGENCY_ONBOARDING_ERROR", { message: err?.message, stack: err?.stack });
    const devDetails = process.env.NODE_ENV !== "production" ? { detail: err?.message } : {};
    return NextResponse.json({ error: "Unexpected error", ...devDetails }, { status: 500 });
  }
}
