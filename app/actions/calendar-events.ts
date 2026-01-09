"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { unstable_noStore as noStore } from "next/cache";

export type CalendarEventInput = {
  project_id: string;
  event_date: string; // YYYY-MM-DD
  title: string;
  copy?: string;
  caption?: string; // Full caption for social media post
  platform?: "instagram" | "facebook" | "youtube" | "linkedin" | "twitter" | "tiktok";
  content_type?: "reel" | "carousel" | "story" | "static" | "video";
  media_type?: "static" | "video" | "carousel" | "reel" | "story";
  format_type?: "reel" | "story" | "post" | "carousel" | "static" | "video";
  drive_link?: string; // Google Drive or external media link
  status?: "idea" | "editing" | "review" | "scheduled" | "published";
  ig_link?: string;
  yt_link?: string;
  attachments?: Array<{ url: string; kind: string }>;
};

export async function createCalendarEvent(input: CalendarEventInput) {
  const supabase = await createClient();
  console.log('[SERVER] Creating calendar event:', { 
    project_id: input.project_id, 
    event_date: input.event_date, 
    title: input.title 
  });
  
  try {
    const { data, error } = await supabase
      .from("calendar_events")
      .insert({
        project_id: input.project_id,
        event_date: input.event_date,
        title: input.title,
        copy: input.copy,
        caption: input.caption,
        platform: input.platform,
        content_type: input.content_type,
        media_type: input.media_type,
        format_type: input.format_type,
        drive_link: input.drive_link,
        status: input.status ?? "idea",
        ig_link: input.ig_link,
        yt_link: input.yt_link,
        attachments: input.attachments
          ? JSON.stringify(input.attachments)
          : JSON.stringify([]),
      })
      .select("*")
      .single();
    
    if (error) {
      console.error('[SERVER] Create calendar event INSERT error:', error.message, error.code, error.details);
      throw new Error(`Insert failed: ${error.message}`);
    }
    
    if (!data) {
      console.error('[SERVER] Create calendar event: No data returned after insert');
      throw new Error('No data returned after insert');
    }
    
    console.log('[SERVER] Calendar event created successfully:', data.id, 'on date:', data.event_date);
    
    // Verify it exists by fetching it back
    const { data: verify, error: verifyError } = await supabase
      .from("calendar_events")
      .select("*")
      .eq("id", data.id)
      .single();
    
    if (verifyError) {
      console.error('[SERVER] Failed to verify created event:', verifyError.message);
    } else {
      console.log('[SERVER] Verified event exists:', verify?.id);
    }
    
    revalidatePath("/dashboard/projects");
    revalidatePath("/dashboard/client");
    return data;
  } catch (err: any) {
    console.error('[SERVER] Create calendar event exception:', err.message);
    throw err;
  }
}

export async function updateCalendarEvent(
  id: string,
  patch: Partial<CalendarEventInput>,
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("calendar_events")
    .update({
      ...(patch.title !== undefined && { title: patch.title }),
      ...(patch.copy !== undefined && { copy: patch.copy }),
      ...(patch.caption !== undefined && { caption: patch.caption }),
      ...(patch.platform !== undefined && { platform: patch.platform }),
      ...(patch.content_type !== undefined && {
        content_type: patch.content_type,
      }),
      ...(patch.media_type !== undefined && { media_type: patch.media_type }),
      ...(patch.format_type !== undefined && { format_type: patch.format_type }),
      ...(patch.drive_link !== undefined && { drive_link: patch.drive_link }),
      ...(patch.status !== undefined && { status: patch.status }),
      ...(patch.ig_link !== undefined && { ig_link: patch.ig_link }),
      ...(patch.yt_link !== undefined && { yt_link: patch.yt_link }),
      ...(patch.attachments !== undefined && {
        attachments: JSON.stringify(patch.attachments),
      }),
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/projects");
  revalidatePath("/dashboard/client");
  return data;
}

export async function deleteCalendarEvent(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("calendar_events")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/projects");
}

export async function listCalendarEvents(projectId: string, monthISO: string) {
  noStore(); // Disable caching completely
  const supabase = await createClient();
  
  // Parse the month ISO string (YYYY-MM) and use UTC to avoid timezone issues
  const [year, month] = monthISO.split('-').map(Number);
  const startISO = `${year}-${String(month).padStart(2, '0')}-01`;
  
  // Calculate last day of month using UTC
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const lastDay = new Date(Date.UTC(nextYear, nextMonth - 1, 0)).getUTCDate();
  const endISO = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  
  console.log('[SERVER] Fetching calendar events for project:', projectId, 'from', startISO, 'to', endISO);
  
  // Revalidate path to clear cache before fetching
  revalidatePath("/dashboard/projects");
  
  try {
    // First check if there are ANY events in the table
    const { data: allEvents, error: allError } = await supabase
      .from("calendar_events")
      .select("*")
      .eq("project_id", projectId);
    
    if (allError) {
      console.error('[SERVER] Failed to fetch all events:', allError.message);
    } else {
      console.log('[SERVER] Total events for project:', allEvents?.length || 0);
    }
    
    // Now fetch the month range
    const { data, error } = await supabase
      .from("calendar_events")
      .select("*")
      .eq("project_id", projectId)
      .gte("event_date", startISO)
      .lte("event_date", endISO)
      .order("event_date", { ascending: true });
    
    if (error) {
      console.error('[SERVER] Calendar events fetch error:', error.message, error.code);
      throw new Error(error.message);
    }
    
    console.log('[SERVER] Calendar events fetched for range:', data?.length || 0, 'events');
    if (data && data.length > 0) {
      console.log('[SERVER] First event:', data[0]?.title, 'on', data[0]?.event_date);
    }
    return data;
  } catch (err: any) {
    console.error('[SERVER] List calendar events exception:', err.message);
    throw err;
  }
}
