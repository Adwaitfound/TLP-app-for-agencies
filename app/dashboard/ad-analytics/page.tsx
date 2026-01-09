'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Eye, 
  MousePointerClick, 
  Users, 
  TrendingUp,
  Monitor,
  Smartphone,
  Globe,
  Clock,
  Download,
  Filter
} from 'lucide-react';

interface AnalyticsEvent {
  id: string;
  ad_id: string;
  client_id: string;
  user_id: string | null;
  event_type: 'view' | 'click';
  created_at: string;
  session_id: string | null;
  user_agent: string | null;
  ip_address: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  country: string | null;
  city: string | null;
  referrer: string | null;
  clients?: { company_name: string } | null;
  users?: { email: string; full_name: string } | null;
}

interface AdWithStats {
  id: string;
  title: string;
  is_active: boolean;
  views: number;
  clicks: number;
  unique_clients: number;
  unique_users: number;
  click_through_rate: number;
  avg_time_to_click: number | null;
}

interface ClientEngagement {
  client_id: string;
  company_name: string;
  total_views: number;
  total_clicks: number;
  last_viewed: string;
  last_clicked: string | null;
  devices_used: string[];
}

export default function EnhancedAdAnalyticsPage() {
  const { user } = useAuth();
  const [ads, setAds] = useState<AdWithStats[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsEvent[]>([]);
  const [clientEngagement, setClientEngagement] = useState<ClientEngagement[]>([]);
  const [selectedAd, setSelectedAd] = useState<string>('');
  const [selectedEventType, setSelectedEventType] = useState<string>('');
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const supabase = createClient();

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  useEffect(() => {
    if (isAdmin) {
      fetchAdsList();
    }
  }, [isAdmin]);

  useEffect(() => {
    if (ads.length > 0 && !selectedAd) {
      setSelectedAd('all');
    }
  }, [ads]);

  useEffect(() => {
    if (isAdmin) {
      fetchAnalytics();
      fetchClientEngagement();
    }
  }, [selectedAd, selectedEventType, selectedClient, selectedDevice, dateRange, isAdmin]);

  const fetchAdsList = async () => {
    try {
      const { data: adsData, error } = await supabase
        .from('advertisements')
        .select('id, title, is_active')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const adsWithStats: AdWithStats[] = [];
      for (const ad of adsData || []) {
        const { data: analyticsData } = await supabase
          .from('ad_analytics')
          .select('event_type, client_id, user_id, created_at')
          .eq('ad_id', ad.id);

        const views = analyticsData?.filter((e) => e.event_type === 'view').length || 0;
        const clicks = analyticsData?.filter((e) => e.event_type === 'click').length || 0;
        const unique_clients = new Set(analyticsData?.map((e) => e.client_id).filter(Boolean)).size;
        const unique_users = new Set(analyticsData?.map((e) => e.user_id).filter(Boolean)).size;
        const ctr = views > 0 ? ((clicks / views) * 100) : 0;

        adsWithStats.push({
          ...ad,
          views,
          clicks,
          unique_clients,
          unique_users,
          click_through_rate: parseFloat(ctr.toFixed(2)),
          avg_time_to_click: null,
        });
      }

      setAds(adsWithStats);
    } catch (err) {
      console.error('Error fetching ads:', err);
    }
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('ad_analytics')
        .select('*');

      if (selectedAd && selectedAd !== 'all') {
        query = query.eq('ad_id', selectedAd);
      }

      if (selectedEventType) {
        query = query.eq('event_type', selectedEventType);
      }

      if (selectedClient) {
        query = query.eq('client_id', selectedClient);
      }

      if (selectedDevice) {
        query = query.eq('device_type', selectedDevice);
      }

      if (dateRange.start) {
        query = query.gte('created_at', `${dateRange.start}T00:00:00Z`);
      }

      if (dateRange.end) {
        query = query.lte('created_at', `${dateRange.end}T23:59:59Z`);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      // Fetch client names separately
      const clientIds = [...new Set((data || []).map(d => d.client_id).filter(Boolean))];
      let clientMap: Record<string, string> = {};
      
      if (clientIds.length > 0) {
        const { data: clientsData } = await supabase
          .from('clients')
          .select('id, company_name')
          .in('id', clientIds);
        
        clientsData?.forEach(c => {
          clientMap[c.id] = c.company_name;
        });
      }

      // Enrich analytics data with client names
      const enrichedData = (data || []).map(event => ({
        ...event,
        clients: event.client_id ? { company_name: clientMap[event.client_id] || 'Unknown' } : null
      }));

      setAnalytics(enrichedData as any);
    } catch (err: any) {
      console.error('Error fetching analytics:', err);
      console.error('Error details:', err.message, err.details, err.hint);
    } finally {
      setLoading(false);
    }
  };

  const fetchClientEngagement = async () => {
    try {
      let query = supabase.from('ad_analytics').select('*');
      
      if (selectedAd && selectedAd !== 'all') {
        query = query.eq('ad_id', selectedAd);
      }

      const { data, error } = await query;
      if (error) throw error;

      const clientMap = new Map<string, any>();
      
      (data || []).forEach((event: any) => {
        if (!event.client_id) return;

        if (!clientMap.has(event.client_id)) {
          clientMap.set(event.client_id, {
            client_id: event.client_id,
            company_name: 'Unknown',
            total_views: 0,
            total_clicks: 0,
            last_viewed: event.created_at,
            last_clicked: null,
            devices_used: new Set(),
          });
        }

        const clientData = clientMap.get(event.client_id);
        if (event.event_type === 'view') {
          clientData.total_views++;
          if (new Date(event.created_at) > new Date(clientData.last_viewed)) {
            clientData.last_viewed = event.created_at;
          }
        } else if (event.event_type === 'click') {
          clientData.total_clicks++;
          if (!clientData.last_clicked || new Date(event.created_at) > new Date(clientData.last_clicked)) {
            clientData.last_clicked = event.created_at;
          }
        }

        if (event.device_type) {
          clientData.devices_used.add(event.device_type);
        }
      });

      // Fetch client names
      const clientIds = Array.from(clientMap.keys());
      if (clientIds.length > 0) {
        const { data: clientsData } = await supabase
          .from('clients')
          .select('id, company_name')
          .in('id', clientIds);

        clientsData?.forEach((client) => {
          const clientData = clientMap.get(client.id);
          if (clientData) {
            clientData.company_name = client.company_name;
          }
        });
      }

      const engagement: ClientEngagement[] = Array.from(clientMap.values()).map((c) => ({
        ...c,
        devices_used: Array.from(c.devices_used),
      }));

      engagement.sort((a, b) => b.total_views - a.total_views);
      setClientEngagement(engagement);
    } catch (err) {
      console.error('Error fetching client engagement:', err);
    }
  };

  const exportToCSV = () => {
    const headers = ['Client', 'Event', 'Date', 'Time', 'Device', 'Browser', 'OS', 'Location'];
    const rows = analytics.map((event) => [
      (event.clients as any)?.company_name || 'Unknown',
      event.event_type,
      new Date(event.created_at).toLocaleDateString(),
      new Date(event.created_at).toLocaleTimeString(),
      event.device_type || 'N/A',
      event.browser || 'N/A',
      event.os || 'N/A',
      event.city && event.country ? `${event.city}, ${event.country}` : 'N/A',
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ad-analytics-${new Date().toISOString()}.csv`;
    a.click();
  };

  if (!isAdmin) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="max-w-md space-y-2 text-center">
          <h2 className="text-xl font-semibold">Access Restricted</h2>
          <p className="text-muted-foreground text-sm">
            Only admins and super admins can view analytics.
          </p>
        </div>
      </div>
    );
  }

  const selectedAdData = selectedAd === 'all' 
    ? {
        title: 'All Ads',
        views: ads.reduce((sum, ad) => sum + ad.views, 0),
        clicks: ads.reduce((sum, ad) => sum + ad.clicks, 0),
        unique_clients: new Set(analytics.map(a => a.client_id).filter(Boolean)).size,
        click_through_rate: ads.reduce((sum, ad) => sum + ad.views, 0) > 0
          ? ((ads.reduce((sum, ad) => sum + ad.clicks, 0) / ads.reduce((sum, ad) => sum + ad.views, 0)) * 100).toFixed(2)
          : '0.00'
      }
    : ads.find((ad) => ad.id === selectedAd);

  const deviceBreakdown = analytics.reduce((acc, event) => {
    const device = event.device_type || 'Unknown';
    acc[device] = (acc[device] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const countryBreakdown = analytics.reduce((acc, event) => {
    const country = event.country || 'Unknown';
    acc[country] = (acc[country] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Enhanced Ad Analytics</h1>
          <p className="text-muted-foreground mt-1">Detailed tracking, insights, and engagement metrics</p>
        </div>
        <Button onClick={exportToCSV} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Key Metrics Cards */}
      {selectedAdData && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Views</CardTitle>
              <Eye className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{selectedAdData.views}</div>
              <p className="text-xs text-muted-foreground">Impressions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
              <MousePointerClick className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{selectedAdData.clicks}</div>
              <p className="text-xs text-muted-foreground">Click events</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unique Clients</CardTitle>
              <Users className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{selectedAdData.unique_clients}</div>
              <p className="text-xs text-muted-foreground">Engaged clients</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Click-through Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{selectedAdData.click_through_rate}%</div>
              <p className="text-xs text-muted-foreground">Clicks / Views</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Advertisement</label>
              <Select value={selectedAd} onValueChange={setSelectedAd}>
                <SelectTrigger>
                  <SelectValue placeholder="Select ad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Ads</SelectItem>
                  {ads.map((ad) => (
                    <SelectItem key={ad.id} value={ad.id}>
                      {ad.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Event Type</label>
              <Select
                value={selectedEventType || 'all'}
                onValueChange={(v) => setSelectedEventType(v === 'all' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All events</SelectItem>
                  <SelectItem value="view">Views</SelectItem>
                  <SelectItem value="click">Clicks</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Device Type</label>
              <Select
                value={selectedDevice || 'all'}
                onValueChange={(v) => setSelectedDevice(v === 'all' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All devices</SelectItem>
                  <SelectItem value="desktop">Desktop</SelectItem>
                  <SelectItem value="mobile">Mobile</SelectItem>
                  <SelectItem value="tablet">Tablet</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Client</label>
              <Select
                value={selectedClient || 'all'}
                onValueChange={(v) => setSelectedClient(v === 'all' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All clients</SelectItem>
                  {clientEngagement.map((client) => (
                    <SelectItem key={client.client_id} value={client.client_id}>
                      {client.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Start Date</label>
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">End Date</label>
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabbed Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="clients">Client Engagement</TabsTrigger>
          <TabsTrigger value="events">Event Timeline</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* All Ads Performance */}
          <Card>
            <CardHeader>
              <CardTitle>All Advertisements Performance</CardTitle>
              <CardDescription>Summary of all active and inactive ads</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr className="text-left">
                      <th className="pb-3 font-medium">Title</th>
                      <th className="pb-3 font-medium text-right">Views</th>
                      <th className="pb-3 font-medium text-right">Clicks</th>
                      <th className="pb-3 font-medium text-right">CTR</th>
                      <th className="pb-3 font-medium text-right">Unique Clients</th>
                      <th className="pb-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ads.map((ad) => (
                      <tr
                        key={ad.id}
                        className="border-b hover:bg-muted/50 cursor-pointer"
                        onClick={() => setSelectedAd(ad.id)}
                      >
                        <td className="py-3">{ad.title}</td>
                        <td className="py-3 text-right">{ad.views}</td>
                        <td className="py-3 text-right">{ad.clicks}</td>
                        <td className="py-3 text-right">{ad.click_through_rate}%</td>
                        <td className="py-3 text-right">{ad.unique_clients}</td>
                        <td className="py-3">
                          <Badge variant={ad.is_active ? 'default' : 'secondary'}>
                            {ad.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clients" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Client Engagement Details</CardTitle>
              <CardDescription>See which clients viewed and clicked on ads</CardDescription>
            </CardHeader>
            <CardContent>
              {clientEngagement.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No engagement data yet</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b">
                      <tr className="text-left">
                        <th className="pb-3 font-medium">Client</th>
                        <th className="pb-3 font-medium text-right">Views</th>
                        <th className="pb-3 font-medium text-right">Clicks</th>
                        <th className="pb-3 font-medium">Last Viewed</th>
                        <th className="pb-3 font-medium">Last Clicked</th>
                        <th className="pb-3 font-medium">Devices</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clientEngagement.map((client) => (
                        <tr key={client.client_id} className="border-b hover:bg-muted/50">
                          <td className="py-3 font-medium">{client.company_name}</td>
                          <td className="py-3 text-right">{client.total_views}</td>
                          <td className="py-3 text-right">{client.total_clicks}</td>
                          <td className="py-3">
                            <div className="flex items-center gap-1 text-xs">
                              <Clock className="h-3 w-3" />
                              {new Date(client.last_viewed).toLocaleString()}
                            </div>
                          </td>
                          <td className="py-3">
                            {client.last_clicked ? (
                              <div className="flex items-center gap-1 text-xs">
                                <Clock className="h-3 w-3" />
                                {new Date(client.last_clicked).toLocaleString()}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">Never</span>
                            )}
                          </td>
                          <td className="py-3">
                            <div className="flex gap-1">
                              {client.devices_used.map((device, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {device === 'desktop' ? <Monitor className="h-3 w-3" /> : <Smartphone className="h-3 w-3" />}
                                </Badge>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Event Timeline</CardTitle>
              <CardDescription>Detailed chronological view of all ad interactions</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : analytics.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No events yet</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b">
                      <tr className="text-left">
                        <th className="pb-3 font-medium">Client</th>
                        <th className="pb-3 font-medium">Event</th>
                        <th className="pb-3 font-medium">Date/Time</th>
                        <th className="pb-3 font-medium">Device</th>
                        <th className="pb-3 font-medium">Browser</th>
                        <th className="pb-3 font-medium">Location</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.map((event) => (
                        <tr key={event.id} className="border-b hover:bg-muted/50">
                          <td className="py-3">
                            {(event.clients as any)?.company_name || 'Unknown'}
                          </td>
                          <td className="py-3">
                            <Badge variant={event.event_type === 'view' ? 'outline' : 'default'}>
                              {event.event_type === 'view' ? '👁 View' : '🔗 Click'}
                            </Badge>
                          </td>
                          <td className="py-3 text-xs">
                            {new Date(event.created_at).toLocaleString()}
                          </td>
                          <td className="py-3">
                            <div className="flex items-center gap-1">
                              {event.device_type === 'desktop' ? <Monitor className="h-3 w-3" /> : <Smartphone className="h-3 w-3" />}
                              <span className="text-xs">{event.device_type || 'N/A'}</span>
                            </div>
                          </td>
                          <td className="py-3 text-xs">{event.browser || 'N/A'}</td>
                          <td className="py-3">
                            {event.city && event.country ? (
                              <div className="flex items-center gap-1 text-xs">
                                <Globe className="h-3 w-3" />
                                {event.city}, {event.country}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">N/A</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Device Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(deviceBreakdown).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No data</div>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(deviceBreakdown).map(([device, count]) => (
                      <div key={device} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {device === 'desktop' ? <Monitor className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}
                          <span className="capitalize">{device}</span>
                        </div>
                        <Badge>{count}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Geographic Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(countryBreakdown).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No data</div>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(countryBreakdown)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 10)
                      .map(([country, count]) => (
                        <div key={country} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4" />
                            <span>{country}</span>
                          </div>
                          <Badge>{count}</Badge>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
