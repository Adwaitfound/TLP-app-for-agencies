'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Eye, MousePointerClick, Users, TrendingUp } from 'lucide-react';

interface AnalyticsData {
  id: string;
  ad_id: string;
  client_id: string;
  event_type: 'view' | 'click';
  created_at: string;
  clients: { company_name: string }[] | null;
}

interface AdWithStats {
  id: string;
  title: string;
  is_active: boolean;
  views: number;
  clicks: number;
  unique_clients: number;
  click_through_rate: number;
}

export default function AdAnalyticsPage() {
  const [ads, setAds] = useState<AdWithStats[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData[]>([]);
  const [selectedAd, setSelectedAd] = useState<string>('');
  const [selectedEventType, setSelectedEventType] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const supabase = createClient();

  useEffect(() => {
    fetchAdsList();
  }, []);

  useEffect(() => {
    if (ads.length > 0 && !selectedAd) {
      setSelectedAd(ads[0].id);
    }
  }, [ads]);

  useEffect(() => {
    if (selectedAd) {
      fetchAnalytics();
    }
  }, [selectedAd, selectedEventType, dateRange]);

  const fetchAdsList = async () => {
    try {
      const { data: adsData, error } = await supabase
        .from('advertisements')
        .select('id, title, is_active')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get analytics for each ad
      const adsWithStats: AdWithStats[] = [];
      for (const ad of adsData || []) {
        const { data: analyticsData } = await supabase
          .from('ad_analytics')
          .select('event_type, client_id')
          .eq('ad_id', ad.id);

        const views = analyticsData?.filter((e) => e.event_type === 'view').length || 0;
        const clicks = analyticsData?.filter((e) => e.event_type === 'click').length || 0;
        const unique_clients = new Set(analyticsData?.map((e) => e.client_id)).size || 0;
        const ctr = views > 0 ? ((clicks / views) * 100).toFixed(2) : '0.00';

        adsWithStats.push({
          ...ad,
          views,
          clicks,
          unique_clients,
          click_through_rate: parseFloat(ctr),
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
        .select('id, ad_id, client_id, event_type, created_at, clients(company_name)')
        .eq('ad_id', selectedAd);

      if (selectedEventType) {
        query = query.eq('event_type', selectedEventType);
      }

      if (dateRange.start) {
        query = query.gte('created_at', `${dateRange.start}T00:00:00Z`);
      }

      if (dateRange.end) {
        query = query.lte('created_at', `${dateRange.end}T23:59:59Z`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setAnalytics((data || []) as AnalyticsData[]);
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectedAdData = ads.find((ad) => ad.id === selectedAd);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Ad Analytics</h1>
        <p className="text-muted-foreground mt-1">Track views, clicks, and engagement</p>
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
              <p className="text-xs text-muted-foreground">Saw the ad</p>
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

      {/* Filters and Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Filter</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Select Ad */}
            <div>
              <label className="block text-sm font-medium mb-2">Advertisement</label>
              <Select value={selectedAd} onValueChange={setSelectedAd}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ads.map((ad) => (
                    <SelectItem key={ad.id} value={ad.id}>
                      {ad.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filter by Event Type */}
            <div>
              <label className="block text-sm font-medium mb-2">Event Type</label>
              <Select
                value={selectedEventType || 'all'}
                onValueChange={(v) => setSelectedEventType(v === 'all' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All events" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All events</SelectItem>
                  <SelectItem value="view">Views</SelectItem>
                  <SelectItem value="click">Clicks</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium mb-2">Start Date</label>
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              />
            </div>

            {/* End Date */}
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

      {/* All Ads Summary */}
      <Card>
        <CardHeader>
          <CardTitle>All Advertisements Performance</CardTitle>
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

      {/* Detailed Events */}
      {selectedAdData && (
        <Card>
          <CardHeader>
            <CardTitle>Detailed Events for "{selectedAdData.title}"</CardTitle>
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
                      <th className="pb-3 font-medium">Date</th>
                      <th className="pb-3 font-medium">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.map((event) => (
                      <tr key={event.id} className="border-b">
                        <td className="py-3">
                          {Array.isArray(event.clients) && event.clients.length > 0
                            ? event.clients[0].company_name
                            : 'Unknown'}
                        </td>
                        <td className="py-3">
                          <Badge
                            variant={event.event_type === 'view' ? 'outline' : 'default'}
                          >
                            {event.event_type === 'view' ? '👁 View' : '🔗 Click'}
                          </Badge>
                        </td>
                        <td className="py-3">
                          {new Date(event.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3">
                          {new Date(event.created_at).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
