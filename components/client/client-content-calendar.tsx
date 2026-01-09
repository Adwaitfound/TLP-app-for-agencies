"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

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
  
  const supabase = createClient();
  const toISODate = (date: Date) => date.toISOString().slice(0, 10);

  useEffect(() => {
    if (projectIds.length === 0) return;
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

      const { data, error } = await supabase
        .from("calendar_events")
        .select("*, projects(name)")
        .in("project_id", projectIds)
        .gte("event_date", startDateStr)
        .lte("event_date", endDateStr)
        .order("event_date", { ascending: true });

      if (error) throw error;
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
        return "bg-green-500/20 text-green-700 border-green-500/50";
      case "scheduled":
        return "bg-blue-500/20 text-blue-700 border-blue-500/50";
      case "review":
        return "bg-yellow-500/20 text-yellow-700 border-yellow-500/50";
      case "editing":
        return "bg-orange-500/20 text-orange-700 border-orange-500/50";
      case "idea":
        return "bg-gray-500/20 text-gray-700 border-gray-500/50";
      default:
        return "bg-gray-500/20 text-gray-700 border-gray-500/50";
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
          ) : (
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
                          min-h-[100px] rounded-lg border p-2 
                          ${date ? "bg-background hover:bg-accent/50 transition-colors cursor-pointer" : "bg-muted/20"}
                          ${isToday ? "ring-2 ring-primary" : ""}
                        `}
                        onClick={() => {
                          if (dayEvents.length > 0) {
                            setSelectedEvent(dayEvents[0]);
                          }
                        }}
                      >
                        {date ? (
                          <div className="flex flex-col gap-1 h-full">
                            <div className={`text-xs font-medium ${isToday ? "text-primary font-bold" : ""}`}>
                              {date.getDate()}
                            </div>
                            <div className="flex-1 overflow-hidden space-y-1">
                              {dayEvents.slice(0, 2).map((event) => (
                                <div
                                  key={event.id}
                                  className={`text-[10px] px-1.5 py-0.5 rounded truncate border ${getStatusColor(event.status)}`}
                                  title={event.title}
                                >
                                  {getPlatformEmoji(event.platform)} {event.title}
                                </div>
                              ))}
                              {dayEvents.length > 2 && (
                                <div className="text-[9px] text-muted-foreground px-1">
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
      {selectedEvent && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2 mb-2">
                  <span>{getPlatformEmoji(selectedEvent.platform)}</span>
                  <span>{selectedEvent.title}</span>
                </CardTitle>
                <div className="flex flex-wrap gap-2 mb-2">
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
                <CardDescription>
                  Scheduled: {new Date(selectedEvent.event_date).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedEvent(null)}>
                ✕
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}
