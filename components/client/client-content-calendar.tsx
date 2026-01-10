"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type CalendarEvent = {
  id: string;
  event_date: string;
  title: string;
  caption?: string;
  copy?: string;
  platform?: string;
  media_type?: string;
  format_type?: string;
  drive_link?: string;
  status?: string;
  created_at: string;
  project_id: string;
  projects?: { name: string };
};

interface ClientContentCalendarProps {
  clientId: string;
  projectIds: string[];
}

export function ClientContentCalendar({ clientId, projectIds }: ClientContentCalendarProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  
  const supabase = createClient();
  const toISODate = (date: Date) => date.toISOString().slice(0, 10);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Helper to convert Google Drive links to direct viewable URLs
  const getDirectImageUrl = (url: string): string => {
    if (!url) return url;
    
    // If it's a Google Drive link, convert to direct view URL
    if (url.includes('drive.google.com')) {
      // Extract file ID from various Google Drive URL formats
      let fileId = '';
      
      // Format: https://drive.google.com/file/d/FILE_ID/view
      const match1 = url.match(/\/file\/d\/([^\/\?]+)/);
      if (match1) fileId = match1[1];
      
      // Format: https://drive.google.com/open?id=FILE_ID
      const match2 = url.match(/[?&]id=([^&]+)/);
      if (match2) fileId = match2[1];
      
      // If we found a file ID, return direct view URL
      if (fileId) {
        // Use the thumbnail API for better compatibility
        return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
      }
    }
    
    // Return original URL if not a Google Drive link or couldn't extract ID
    return url;
  };

  // Helper to detect media type from drive link
  const getMediaType = (url: string): 'image' | 'video' | 'unknown' => {
    if (!url) return 'unknown';
    const lower = url.toLowerCase();
    if (lower.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/)) return 'image';
    if (lower.match(/\.(mp4|mov|avi|webm|mkv)$/)) return 'video';
    // Check for Google Drive image/video indicators
    if (lower.includes('drive.google.com')) {
      if (lower.includes('/file/d/') || lower.includes('export=view')) return 'image';
    }
    return 'unknown';
  };

  useEffect(() => {
    console.log('[ClientContentCalendar] projectIds:', projectIds);
    if (projectIds.length === 0) {
      console.log('[ClientContentCalendar] No projectIds, setting loading to false');
      setLoading(false);
      setEvents([]);
      return;
    }
    fetchEvents();
  }, [projectIds, currentMonth]);

  async function fetchEvents() {
    setLoading(true);
    try {
      const year = currentMonth.getUTCFullYear();
      const month = currentMonth.getUTCMonth();
      const startOfMonth = new Date(Date.UTC(year, month, 1));
      const endOfMonth = new Date(Date.UTC(year, month + 1, 0));
      const startDateStr = toISODate(startOfMonth);
      const endDateStr = toISODate(endOfMonth);

      console.log('[ClientContentCalendar] Fetching events:', {
        projectIds,
        startDate: startDateStr,
        endDate: endDateStr
      });

      const { data, error } = await supabase
        .from("calendar_events")
        .select("*")
        .in("project_id", projectIds)
        .gte("event_date", startDateStr)
        .lte("event_date", endDateStr)
        .order("event_date", { ascending: true });

      if (error) {
        console.error('[ClientContentCalendar] Error fetching events:', error);
        throw error;
      }
      console.log('[ClientContentCalendar] Events fetched:', data?.length || 0);
      setEvents((data as CalendarEvent[]) || []);
    } catch (err) {
      console.error("Error fetching calendar events:", err);
    } finally {
      setLoading(false);
    }
  }

  // Generate calendar grid
  const generateCalendar = () => {
    const year = currentMonth.getUTCFullYear();
    const month = currentMonth.getUTCMonth();
    const startOfMonth = new Date(Date.UTC(year, month, 1));
    const endOfMonth = new Date(Date.UTC(year, month + 1, 0));
    const startDay = startOfMonth.getUTCDay(); // 0-6
    const daysInMonth = endOfMonth.getUTCDate();

    const weeks: (Date | null)[][] = [];
    let currentWeek: (Date | null)[] = [];

    // Add empty slots for days before month starts
    for (let i = 0; i < startDay; i++) {
      currentWeek.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(Date.UTC(year, month, day));
      currentWeek.push(date);

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    // Add remaining empty slots
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weeks.push(currentWeek);
    }

    return weeks;
  };

  const getEventsForDate = (date: Date | null) => {
    if (!date) return [];
    const dateStr = toISODate(date);
    return events.filter((e) => {
      const eventDate = e.event_date?.slice(0, 10);
      const matchesDate = eventDate === dateStr;
      const matchesPlatform = platformFilter === "all" || e.platform === platformFilter;
      return matchesDate && matchesPlatform;
    });
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "published":
        return "bg-green-500 text-white";
      case "scheduled":
        return "bg-cyan-500 text-white";
      case "review":
        return "bg-yellow-500 text-black";
      case "editing":
        return "bg-orange-500 text-white";
      case "idea":
        return "bg-purple-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const getPlatformEmoji = (platform?: string) => {
    switch (platform) {
      case "instagram": return "📷";
      case "facebook": return "📘";
      case "youtube": return "▶️";
      case "linkedin": return "💼";
      case "twitter": return "🐦";
      case "tiktok": return "🎵";
      default: return "📱";
    }
  };

  const weeks = generateCalendar();
  const monthName = currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const today = new Date();
  const todayStr = toISODate(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())));

  if (projectIds.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">No projects available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Calendar className="h-6 w-6" />
                Content Calendar
              </CardTitle>
              <CardDescription>View your scheduled social media content</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={platformFilter} onValueChange={setPlatformFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All platforms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Platforms</SelectItem>
                  <SelectItem value="instagram">📷 Instagram</SelectItem>
                  <SelectItem value="facebook">📘 Facebook</SelectItem>
                  <SelectItem value="youtube">▶️ YouTube</SelectItem>
                  <SelectItem value="linkedin">💼 LinkedIn</SelectItem>
                  <SelectItem value="twitter">🐦 Twitter</SelectItem>
                  <SelectItem value="tiktok">🎵 TikTok</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={prevMonth}>
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <h3 className="font-semibold text-lg">{monthName}</h3>
        <Button variant="outline" size="sm" onClick={nextMonth}>
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-4">
          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading calendar...</p>
            </div>
          ) : isMobile ? (
            /* Mobile: Vertical Weekly Scrollable View */
            <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-2">
              {weeks.flat().filter(date => date !== null).map((date) => {
                if (!date) return null;
                const dayEvents = getEventsForDate(date);
                const isToday = toISODate(date) === todayStr;
                
                return (
                  <Card
                    key={toISODate(date)}
                    className={`p-3 ${isToday ? "border-primary border-2" : ""}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <div className="text-xs text-muted-foreground font-medium">
                          {date.toLocaleDateString("en-US", { weekday: "short" })}
                        </div>
                        <div className={`text-2xl font-bold ${isToday ? "text-primary" : ""}`}>
                          {date.getDate()}
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        {dayEvents.length === 0 ? (
                          <div className="text-sm text-muted-foreground py-2">
                            No content scheduled
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {dayEvents.map((event) => (
                              <div
                                key={event.id}
                                className="rounded-lg border overflow-hidden bg-card hover:shadow-sm transition-shadow cursor-pointer"
                                onClick={() => setSelectedEvent(event)}
                              >
                                <div className="flex gap-2">
                                  {event.drive_link && (
                                    <div className="w-20 h-20 flex-shrink-0 overflow-hidden bg-muted/30">
                                      {getMediaType(event.drive_link) === 'image' ? (
                                        <img
                                          src={getDirectImageUrl(event.drive_link)}
                                          alt={event.title}
                                          className="w-full h-full object-cover"
                                          loading="lazy"
                                          onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                          }}
                                        />
                                      ) : getMediaType(event.drive_link) === 'video' ? (
                                        <video
                                          src={getDirectImageUrl(event.drive_link)}
                                          className="w-full h-full object-cover"
                                          muted
                                          playsInline
                                        />
                                      ) : null}
                                    </div>
                                  )}
                                  <div className="flex-1 p-2">
                                    <div className="text-sm font-medium truncate mb-1">
                                      {getPlatformEmoji(event.platform)} {event.title}
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                      {event.status && (
                                        <Badge className={`text-[10px] px-1.5 py-0 h-5 ${getStatusColor(event.status)}`}>
                                          {event.status}
                                        </Badge>
                                      )}
                                      {event.format_type && (
                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                                          {event.format_type}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            /* Desktop: Calendar Grid View */
            <div className="space-y-2">
              {/* Weekday headers */}
              <div className="grid grid-cols-7 gap-2 mb-2">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day} className="text-center text-xs font-semibold text-muted-foreground">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar days */}
              <div className="grid grid-cols-7 gap-2">
                {weeks.map((week, weekIdx) => (
                  week.map((date, dayIdx) => {
                    const dayEvents = getEventsForDate(date);
                    const isToday = date ? toISODate(date) === todayStr : false;
                    
                    return (
                      <div
                        key={`${weekIdx}-${dayIdx}`}
                        className={`
                          min-h-[120px] rounded-lg border p-2 
                          ${date ? "bg-background" : "bg-muted/20"}
                          ${isToday ? "ring-2 ring-primary" : ""}
                        `}
                      >
                        {date ? (
                          <div className="flex flex-col gap-1 h-full">
                            <div className={`text-xs font-medium mb-1 ${isToday ? "text-primary font-bold" : ""}`}>
                              {date.getDate()}
                            </div>
                            <div className="flex-1 overflow-hidden space-y-1">
                              {dayEvents.slice(0, 2).map((event) => (
                                <div
                                  key={event.id}
                                  className="rounded-lg border overflow-hidden bg-card hover:shadow-md hover:scale-[1.02] transition-all cursor-pointer"
                                  onClick={() => setSelectedEvent(event)}
                                >
                                  {event.drive_link && (
                                    <div className="w-full h-16 overflow-hidden bg-muted/30">
                                      {getMediaType(event.drive_link) === 'image' ? (
                                        <img
                                          src={getDirectImageUrl(event.drive_link)}
                                          alt={event.title}
                                          className="w-full h-full object-cover"
                                          loading="lazy"
                                          onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                          }}
                                        />
                                      ) : getMediaType(event.drive_link) === 'video' ? (
                                        <video
                                          src={getDirectImageUrl(event.drive_link)}
                                          className="w-full h-full object-cover"
                                          muted
                                          playsInline
                                        />
                                      ) : null}
                                    </div>
                                  )}
                                  <div className="p-1.5">
                                    <div className="text-[10px] font-medium truncate mb-1">
                                      {getPlatformEmoji(event.platform)} {event.title}
                                    </div>
                                    {event.status && (
                                      <Badge className={`text-[8px] px-1 py-0 h-4 ${getStatusColor(event.status)}`}>
                                        {event.status}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              ))}
                              {dayEvents.length > 2 && (
                                <div 
                                  className="text-[9px] text-muted-foreground px-1 hover:text-primary cursor-pointer"
                                  onClick={() => setSelectedEvent(dayEvents[2])}
                                  title="Click to view more events"
                                >
                                  +{dayEvents.length - 2} more
                                </div>
                              )}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Event Detail Modal */}
      <Dialog open={!!selectedEvent} onOpenChange={(open) => { if (!open) setSelectedEvent(null); }}>
        <DialogContent className="sm:max-w-lg">
          {selectedEvent && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span>{getPlatformEmoji(selectedEvent.platform)}</span>
                  <span>{selectedEvent.title}</span>
                </DialogTitle>
                <DialogDescription>
                  Scheduled: {new Date(selectedEvent.event_date).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-wrap gap-2">
                {selectedEvent.platform && (
                  <Badge variant="secondary">{selectedEvent.platform}</Badge>
                )}
                {selectedEvent.media_type && (
                  <Badge variant="outline">{selectedEvent.media_type}</Badge>
                )}
                {selectedEvent.format_type && (
                  <Badge variant="outline">{selectedEvent.format_type}</Badge>
                )}
                {selectedEvent.status && (
                  <Badge className={getStatusColor(selectedEvent.status)}>
                    {selectedEvent.status}
                  </Badge>
                )}
              </div>

              {selectedEvent.drive_link && (
                <div className="rounded-lg overflow-hidden border">
                  {getMediaType(selectedEvent.drive_link) === 'image' ? (
                    <img
                      src={getDirectImageUrl(selectedEvent.drive_link)}
                      alt={selectedEvent.title}
                      className="w-full max-h-64 object-contain bg-muted/30"
                      loading="lazy"
                    />
                  ) : getMediaType(selectedEvent.drive_link) === 'video' ? (
                    <video
                      src={getDirectImageUrl(selectedEvent.drive_link)}
                      className="w-full max-h-64 object-contain bg-muted/30"
                      controls
                      playsInline
                    />
                  ) : null}
                </div>
              )}

              {selectedEvent.caption && (
                <div>
                  <h4 className="text-sm font-semibold mb-1">Caption:</h4>
                  <p className="text-sm whitespace-pre-wrap p-3 bg-muted/50 rounded-lg">
                    {selectedEvent.caption}
                  </p>
                </div>
              )}

              {selectedEvent.copy && (
                <div>
                  <h4 className="text-sm font-semibold mb-1">Internal Notes:</h4>
                  <p className="text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg">
                    {selectedEvent.copy}
                  </p>
                </div>
              )}

              {selectedEvent.drive_link && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Media:</h4>
                  <a
                    href={selectedEvent.drive_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                    View Media Link
                  </a>
                </div>
              )}

              {selectedEvent.projects && (
                <div>
                  <h4 className="text-sm font-semibold mb-1">Project:</h4>
                  <p className="text-sm text-muted-foreground">{selectedEvent.projects.name}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
