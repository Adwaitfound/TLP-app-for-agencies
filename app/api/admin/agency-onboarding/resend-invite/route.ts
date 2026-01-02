import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { Resend } from "resend";

const ALLOWED_EMAILS = ["adwait@thelostproject.in"];

function isAuthorized(request: Request) {
  const requester = request.headers.get("x-user-email")?.toLowerCase();
  return requester && ALLOWED_EMAILS.includes(requester);
}

export async function POST(request: Request) {
  console.log("=== RESEND_INVITE: Route handler called ===");
  
  try {
    console.log("RESEND_INVITE: Checking authorization");
    if (!isAuthorized(request)) {
      console.log("RESEND_INVITE: Unauthorized");
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    console.log("RESEND_INVITE: Parsing request body");
    const body = await request.json();
    console.log("RESEND_INVITE: Body:", body);
    
    const email = body?.email?.toLowerCase();
    console.log("RESEND_INVITE: Email:", email);

    if (!email) {
      console.log("RESEND_INVITE: No email provided");
      return NextResponse.json({ error: "email is required" }, { status: 400 });
    }

    console.log("RESEND_INVITE: Creating service client");
    const supabase = createServiceClient();

    console.log("RESEND_INVITE: Looking up onboarding request for:", email);
    const { data: onboardingRow, error: onboardingError } = await supabase
      .from("agency_onboarding_requests")
      .select("id, agency_name, admin_email")
      .ilike("admin_email", email)
      .eq("status", "approved")
      .maybeSingle();

    console.log("RESEND_INVITE: Onboarding result:", { data: onboardingRow, error: onboardingError });

    if (onboardingError) {
      console.error("RESEND_INVITE_ONBOARDING_LOOKUP_ERROR", onboardingError);
      return NextResponse.json({ error: "Database error looking up request" }, { status: 500 });
    }

    if (!onboardingRow) {
      console.log("RESEND_INVITE: No approved request found");
      return NextResponse.json({ error: "No approved request found for this email" }, { status: 404 });
    }

    console.log("RESEND_INVITE: Looking up agency:", onboardingRow.agency_name);
    const { data: agency, error: agencyError } = await supabase
      .from("agencies")
      .select("id")
      .eq("name", onboardingRow.agency_name)
      .maybeSingle();

    console.log("RESEND_INVITE: Agency result:", { data: agency, error: agencyError });

    if (agencyError) {
      console.error("RESEND_INVITE_AGENCY_LOOKUP_ERROR", agencyError);
      return NextResponse.json({ error: "Database error looking up agency" }, { status: 500 });
    }

    if (!agency) {
      console.log("RESEND_INVITE: Agency not found");
      return NextResponse.json({ error: "Agency not found" }, { status: 404 });
    }

    console.log("RESEND_INVITE: Setting up temporary password for:", email);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    
    // Generate a temporary password
    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
    
    console.log("RESEND_INVITE: Temporary password generated");
    
    // Try to invite first (for new users)
    const inviteRes = await supabase.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${siteUrl}/dashboard`,
      data: { agency_id: agency.id, role: "agency_admin" },
    });

    console.log("RESEND_INVITE: Invite result:", inviteRes);

    if (inviteRes.error) {
      // If user already exists, update their password
      if (inviteRes.error.code === 'email_exists' || inviteRes.error.status === 422) {
        console.log("RESEND_INVITE: User exists, updating password");
        
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
        if (listError) {
          console.error("RESEND_INVITE_LIST_ERROR", listError);
          return NextResponse.json({ error: "Failed to find user" }, { status: 500 });
        }
        
        const existingUser = users?.find(u => u.email?.toLowerCase() === email);
        if (!existingUser) {
          console.error("RESEND_INVITE: User not found in list");
          return NextResponse.json({ error: "User not found" }, { status: 404 });
        }
        
        // Update the user's password
        const { error: updateError } = await supabase.auth.admin.updateUserById(existingUser.id, {
          password: tempPassword,
        });
        
        if (updateError) {
          console.error("RESEND_INVITE_UPDATE_ERROR", updateError);
          return NextResponse.json({ error: "Failed to set password" }, { status: 500 });
        }
        
        console.log("RESEND_INVITE: Password updated for existing user");
      } else {
        // Other error
        console.error("RESEND_INVITE_ERROR", inviteRes.error);
        return NextResponse.json({ error: "Failed to send invite" }, { status: 500 });
      }
    }
    
    // Send email with credentials
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1f2937;">Welcome to Your Agency Dashboard</h2>
        <p>Your agency workspace has been set up. Use the credentials below to log in:</p>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0 0 10px 0;"><strong>Email:</strong> ${email}</p>
          <p style="margin: 0 0 10px 0;"><strong>Temporary Password:</strong> <code style="background: #fff; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${tempPassword}</code></p>
          <p style="margin: 0;"><strong>Login URL:</strong> <a href="${siteUrl}/agency/login" style="color: #3b82f6;">${siteUrl}/agency/login</a></p>
        </div>
        
        <p style="color: #6b7280; font-size: 14px;">
          <strong>Important:</strong> Please change your password after your first login for security purposes.
        </p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        
        <p style="color: #9ca3af; font-size: 12px;">
          This is an automated message. If you didn't request this, please ignore this email.
        </p>
      </div>
    `;

    // Try to send via Resend if API key is configured
    const resendApiKey = process.env.RESEND_API_KEY;
    let emailSent = false;
    
    if (resendApiKey) {
      try {
        const resend = new Resend(resendApiKey);
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || "onboarding@yourdomain.com",
          to: email,
          subject: "Your Agency Dashboard Login Credentials",
          html: emailHtml,
        });
        emailSent = true;
        console.log("RESEND_INVITE: Email sent via Resend");
      } catch (emailError: any) {
        console.error("RESEND_INVITE: Email sending failed", emailError);
        // Continue anyway - we'll show the password in the response
      }
    } else {
      console.log("RESEND_INVITE: No Resend API key configured, skipping email send");
    }
    
    // Always log credentials for development
    console.log("=".repeat(60));
    console.log("TEMPORARY LOGIN CREDENTIALS");
    console.log("Email:", email);
    console.log("Temporary Password:", tempPassword);
    console.log("Login URL:", `${siteUrl}/agency/login`);
    console.log("Email Sent:", emailSent);
    console.log("=".repeat(60));
    
    console.log("RESEND_INVITE: Setup complete");
    return NextResponse.json({ 
      sent: true, 
      type: "temp_password",
      message: emailSent ? "Login credentials have been emailed" : "Login credentials have been set up",
      emailSent,
      // In development, always return the password
      ...(process.env.NODE_ENV === 'development' && { tempPassword, loginUrl: `${siteUrl}/agency/login` })
    });
    
  } catch (err: any) {
    console.error("=== RESEND_INVITE_EXCEPTION ===", err);
    console.error("Error details:", { message: err?.message, stack: err?.stack });
    return NextResponse.json({ error: err?.message || "Unexpected error" }, { status: 500 });
  }
}
