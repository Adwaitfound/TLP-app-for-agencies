'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, MousePointerClick, Trash2, Edit2, Plus } from 'lucide-react';

type MediaKind = 'image' | 'video';

const DEFAULT_MEDIA_SIZES: Record<string, { image: { width: string; height: string }; video: { width: string; height: string } }> = {
  top: {
    image: { width: '1200', height: '200' },
    video: { width: '1200', height: '200' },
  },
  bottom: {
    image: { width: '1200', height: '200' },
    video: { width: '1200', height: '200' },
  },
  sidebar: {
    image: { width: '300', height: '600' },
    video: { width: '300', height: '533' },
  },
};

export default function AdvertisementsPage() {
  const [ads, setAds] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>({});
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [setupNeeded, setSetupNeeded] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image_url: '', // stored value (may include size metadata via query params)
    cta_text: 'Learn More',
    cta_url: '',
    target_role: 'client',
    position: 'top',
    display_frequency: 'always',
    start_date: '',
    end_date: '',
  });
  const [mediaForm, setMediaForm] = useState({
    url: '',
    kind: 'image' as MediaKind,
    width: '',
    height: '',
  });
  const [mediaMeta, setMediaMeta] = useState<{
    fileName?: string;
    fileSizeBytes?: number;
    intrinsicWidth?: number;
    intrinsicHeight?: number;
    durationSec?: number;
  }>({});
  const [limitToClients, setLimitToClients] = useState(false);
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);

  const supabase = createClient();

  const inferKind = (url: string): MediaKind => {
    const lower = url.toLowerCase();
    if (!lower) return 'image';
    if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'video';
    if (lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.mov') || lower.endsWith('.m4v')) {
      return 'video';
    }
    return 'image';
  };

  const isYouTubeUrl = (url?: string) => {
    if (!url) return false;
    try {
      const u = new URL(url);
      return u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be');
    } catch (e) {
      return false;
    }
  };

  const toYouTubeEmbed = (url: string) => {
    try {
      const u = new URL(url);
      if (u.hostname.includes('youtu.be')) {
        const id = u.pathname.replace('/', '');
        return id ? `https://www.youtube.com/embed/${id}` : url;
      }
      if (u.hostname.includes('youtube.com')) {
        const id = u.searchParams.get('v');
        if (id) return `https://www.youtube.com/embed/${id}`;
        // Handle /embed/{id}
        if (u.pathname.startsWith('/embed/')) return url;
      }
    } catch (e) {
      return url;
    }
    return url;
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes || bytes <= 0) return undefined;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const val = bytes / Math.pow(1024, i);
    return `${val.toFixed(val >= 10 || i === 0 ? 0 : 1)} ${sizes[i]}`;
  };

  const formatDuration = (sec?: number) => {
    if (sec == null || isNaN(sec)) return undefined;
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    const m = Math.floor((sec / 60) % 60).toString().padStart(2, '0');
    const h = Math.floor(sec / 3600);
    return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
  };

  const gcd = (a: number, b: number): number => {
    if (!isFinite(a) || !isFinite(b)) return 1;
    a = Math.abs(a); b = Math.abs(b);
    while (b) [a, b] = [b, a % b];
    return a || 1;
  };

  const aspectRatio = (w?: string | number, h?: string | number) => {
    const iw = Number(w);
    const ih = Number(h);
    if (!iw || !ih) return undefined;
    const g = gcd(iw, ih);
    return `${Math.round(iw / g)}:${Math.round(ih / g)}`;
  };

  const toMegapixels = (w?: string | number, h?: string | number) => {
    const iw = Number(w);
    const ih = Number(h);
    if (!iw || !ih) return undefined;
    const mp = (iw * ih) / 1_000_000;
    return `${mp.toFixed(mp >= 10 ? 0 : 2)} MP`;
  };

  const probeMediaFromUrl = (url: string, kind: MediaKind) => {
    if (!url) return;
    if (kind === 'image') {
      const img = new Image();
      img.onload = () => {
        setMediaMeta((prev) => ({ ...prev, intrinsicWidth: img.naturalWidth, intrinsicHeight: img.naturalHeight }));
        if (!mediaForm.width || !mediaForm.height) {
          setMediaForm((prev) => ({ ...prev, width: prev.width || `${img.naturalWidth}`, height: prev.height || `${img.naturalHeight}` }));
        }
      };
      img.src = url;
    } else {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        const vw = (video as any).videoWidth as number;
        const vh = (video as any).videoHeight as number;
        const dur = Number(video.duration);
        setMediaMeta((prev) => ({ ...prev, intrinsicWidth: vw, intrinsicHeight: vh, durationSec: isFinite(dur) ? dur : undefined }));
        if (!mediaForm.width || !mediaForm.height) {
          setMediaForm((prev) => ({ ...prev, width: prev.width || `${vw}`, height: prev.height || `${vh}` }));
        }
        URL.revokeObjectURL(video.src);
      };
      video.src = url;
    }
  };

  const probeMediaFromFile = (file: File): Promise<{ intrinsicWidth?: number; intrinsicHeight?: number }> => {
    return new Promise((resolve) => {
      const fileUrl = URL.createObjectURL(file);
      const kind = inferKind(file.name);
      setMediaMeta((prev) => ({ ...prev, fileName: file.name, fileSizeBytes: file.size }));
      if (kind === 'image') {
        const img = new Image();
        img.onload = () => {
          const dims = { intrinsicWidth: img.naturalWidth, intrinsicHeight: img.naturalHeight };
          setMediaMeta((prev) => ({ ...prev, ...dims }));
          if (!mediaForm.width || !mediaForm.height) {
            setMediaForm((prev) => ({ ...prev, width: `${img.naturalWidth}`, height: `${img.naturalHeight}` }));
          }
          URL.revokeObjectURL(fileUrl);
          resolve(dims);
        };
        img.onerror = () => {
          URL.revokeObjectURL(fileUrl);
          resolve({});
        };
        img.src = fileUrl;
      } else {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
          const vw = (video as any).videoWidth as number;
          const vh = (video as any).videoHeight as number;
          const dur = Number(video.duration);
          const dims = { intrinsicWidth: vw, intrinsicHeight: vh };
          setMediaMeta((prev) => ({ ...prev, ...dims, durationSec: isFinite(dur) ? dur : undefined }));
          if (!mediaForm.width || !mediaForm.height) {
            setMediaForm((prev) => ({ ...prev, width: `${vw}`, height: `${vh}` }));
          }
          URL.revokeObjectURL(fileUrl);
          resolve(dims);
        };
        video.onerror = () => {
          URL.revokeObjectURL(fileUrl);
          resolve({});
        };
        video.src = fileUrl;
      }
    });
  };

  const parseMediaUrl = (raw: string) => {
    if (!raw) return { url: '', width: '', height: '', kind: 'image' as MediaKind };
    try {
      const u = new URL(raw);
      const width = u.searchParams.get('w') || '';
      const height = u.searchParams.get('h') || '';
      const typeParam = u.searchParams.get('type');
      const inferredKind = inferKind(u.toString());
      const kind: MediaKind = (typeParam === 'video' || typeParam === 'image') ? typeParam : inferredKind;
      return {
        url: `${u.origin}${u.pathname}`,
        width,
        height,
        kind,
      };
    } catch (err) {
      // If URL cannot be parsed, fall back to raw value
      return { url: raw, width: '', height: '', kind: inferKind(raw) };
    }
  };

  const buildStoredUrl = (url: string, width?: string, height?: string, kind?: MediaKind) => {
    if (!url) return null;
    try {
      const u = new URL(url);
      if (width) u.searchParams.set('w', width);
      if (height) u.searchParams.set('h', height);
      if (kind) u.searchParams.set('type', kind);
      return u.toString();
    } catch (err) {
      // If URL parsing fails, just append params manually
      const params = new URLSearchParams();
      if (width) params.set('w', width);
      if (height) params.set('h', height);
      if (kind) params.set('type', kind);
      const suffix = params.toString();
      return suffix ? `${url}${url.includes('?') ? '&' : '?'}${suffix}` : url;
    }
  };

  const getDefaultSize = (position: string, kind: MediaKind) => {
    const byPos = DEFAULT_MEDIA_SIZES[position] || DEFAULT_MEDIA_SIZES.top;
    return byPos[kind] || byPos.image;
  };

  // Fetch advertisements and analytics
  useEffect(() => {
    fetchAds();
    fetchClients();
  }, []);

  const fetchAds = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      // Fetch all advertisements
      const { data: adsData, error: adsError } = await supabase
        .from('advertisements')
        .select('*')
        .order('created_at', { ascending: false });

      if (adsError) throw adsError;
      setAds(adsData || []);

      // Fetch analytics for each ad
      if (adsData && adsData.length > 0) {
        const analyticsMap: any = {};
        for (const ad of adsData) {
          const { data: analyticsData, error: analyticsErr } = await supabase
            .from('ad_analytics')
            .select('event_type, client_id')
            .eq('ad_id', ad.id);

          const rows: any[] = Array.isArray(analyticsData) ? analyticsData : [];
          if (analyticsErr) {
            console.warn('Analytics fetch error for ad', ad.id, analyticsErr);
          }
          analyticsMap[ad.id] = {
            views: rows.filter((e: any) => e.event_type === 'view').length,
            clicks: rows.filter((e: any) => e.event_type === 'click').length,
            unique_clients: new Set(rows.map((e: any) => e.client_id).filter(Boolean)).size,
          };
        }
        setAnalytics(analyticsMap);
      }
    } catch (err: any) {
      // Handle missing table or RLS errors gracefully so UI still works
      const code = err?.code || err?.status;
      const rawMessage = err?.message || '';
      const message = rawMessage || 'Unknown error (Supabase returned empty error object)';
      const lowered = message.toLowerCase();
      const isMissingTable =
        code === 'PGRST116' || lowered.includes('relation') || lowered.includes('not exist');

      if (isMissingTable) {
        console.debug('ℹ️  Ads table missing. Run ADS_SETUP_INSTRUCTIONS.sql in Supabase.');
        setSetupNeeded(true);
        setAds([]);
      } else {
        setErrorMsg(message);
      }

      console.error('Error fetching ads:', { code, message, err });
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, company_name, email')
        .order('company_name', { ascending: true });
      if (error) throw error;
      setClients(data || []);
    } catch (err) {
      console.warn('Unable to fetch clients for targeting:', err);
    }
  };

  const handleSaveAd = async () => {
    setActionError(null);

    const trimmedTitle = formData.title?.trim();
    const mediaUrl = mediaForm.url || formData.image_url;
    if (!trimmedTitle) {
      setActionError('Title is required');
      return;
    }
    if (!mediaUrl) {
      setActionError('Please add an image or video before saving');
      return;
    }
    if (uploading) {
      setActionError('Please wait for the upload to finish');
      return;
    }

    setSaving(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes?.user?.id || null;

      const mediaUrlToStore = buildStoredUrl(
        mediaUrl,
        mediaForm.width,
        mediaForm.height,
        mediaForm.kind,
      );

      const toPayload = {
        title: formData.title?.trim() || null,
        description: formData.description?.trim() || null,
        image_url: mediaUrlToStore || null,
        cta_text: formData.cta_text?.trim() || 'Learn More',
        cta_url: formData.cta_url?.trim() || null,
        target_role: formData.target_role || 'client',
        position: formData.position || 'top',
        display_frequency: formData.display_frequency || 'always',
        start_date: formData.start_date ? new Date(formData.start_date).toISOString() : null,
        end_date: formData.end_date ? new Date(formData.end_date).toISOString() : null,
        created_by: userId,
      } as any;

      // Use admin API for both create and update so RLS cannot block admins editing ads
      const res = await fetch('/api/admin/ads', {
        method: editingAd ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingAd?.id, ...toPayload, targets: limitToClients ? selectedClientIds : [] }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || `${editingAd ? 'Update' : 'Create'} failed (${res.status})`);
      }

      console.log(`✅ Advertisement ${editingAd ? 'updated' : 'created'}`);

      setDialogOpen(false);
      setEditingAd(null);
      resetForm();
      await fetchAds();
    } catch (err: any) {
      const msg = err?.message || 'Failed to save advertisement';
      console.error('Error saving ad:', err);
      setActionError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAd = async (id: string) => {
    if (!confirm('Are you sure you want to delete this advertisement?')) return;

    try {
      const { error } = await supabase
        .from('advertisements')
        .delete()
        .eq('id', id);

      if (error) throw error;
      console.log('✅ Advertisement deleted');
      await fetchAds();
    } catch (err) {
      console.error('Error deleting ad:', err);
    }
  };

  const handleEditAd = (ad: any) => {
    setEditingAd(ad);
    const parsed = parseMediaUrl(ad.image_url || '');
    const defaults = getDefaultSize(ad.position || 'top', parsed.kind);
    setFormData({
      title: ad.title,
      description: ad.description || '',
      image_url: parsed.url || ad.image_url || '',
      cta_text: ad.cta_text || 'Learn More',
      cta_url: ad.cta_url || '',
      target_role: ad.target_role || 'client',
      position: ad.position || 'top',
      display_frequency: ad.display_frequency || 'always',
      start_date: ad.start_date ? new Date(ad.start_date).toISOString().slice(0, 16) : '',
      end_date: ad.end_date ? new Date(ad.end_date).toISOString().slice(0, 16) : '',
    });
    setMediaForm({
      url: parsed.url || ad.image_url || '',
      width: parsed.width || defaults.width,
      height: parsed.height || defaults.height,
      kind: parsed.kind,
    });
    // Load existing targets for this ad
    (async () => {
      try {
        const { data } = await supabase
          .from('ad_targets')
          .select('client_id')
          .eq('ad_id', ad.id);
        const ids = (data || []).map((r: any) => r.client_id).filter(Boolean);
        setSelectedClientIds(ids);
        setLimitToClients(ids.length > 0);
      } catch (e) {
        setSelectedClientIds([]);
        setLimitToClients(false);
      }
    })();
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      image_url: '',
      cta_text: 'Learn More',
      cta_url: '',
      target_role: 'client',
      position: 'top',
      display_frequency: 'always',
      start_date: '',
      end_date: '',
    });
    setMediaForm({ url: '', width: '', height: '', kind: 'image' });
    setLimitToClients(false);
    setSelectedClientIds([]);
  };

  const handleNewAd = () => {
    setEditingAd(null);
    resetForm();
    setDialogOpen(true);
  };

  const handleUploadMedia = async (file: File | null) => {
    if (!file) {
      setActionError('Please choose a file to upload');
      return;
    }
    setActionError(null);
    setUploading(true);
    try {
      // Probe file locally for dimensions/size before upload
      const dimensions = await probeMediaFromFile(file);
      
      // Validate dimensions match requirements
      const requiredSize = getDefaultSize(formData.position, mediaForm.kind);
      const requiredWidth = parseInt(requiredSize.width);
      const requiredHeight = parseInt(requiredSize.height);
      
      if (dimensions?.intrinsicWidth && dimensions?.intrinsicHeight) {
        if (dimensions.intrinsicWidth !== requiredWidth || dimensions.intrinsicHeight !== requiredHeight) {
          setActionError(
            `Image dimensions must be exactly ${requiredWidth}×${requiredHeight}px for ${formData.position} position. ` +
            `Your image is ${dimensions.intrinsicWidth}×${dimensions.intrinsicHeight}px. Please resize and try again.`
          );
          setUploading(false);
          return;
        }
      }

      const fd = new FormData();
      fd.append('file', file);

      const res = await fetch('/api/admin/ads/upload', {
        method: 'POST',
        body: fd,
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || `Upload failed (${res.status})`);
      }

      const j = await res.json();
      const uploadedUrl = j?.url as string;
      const inferredKind = inferKind(uploadedUrl);
      setMediaForm((prev) => ({ ...prev, url: uploadedUrl, kind: inferredKind }));
      setFormData((prev) => ({ ...prev, image_url: uploadedUrl }));
      // Also probe the uploaded URL (in case server transformed it)
      probeMediaFromUrl(uploadedUrl, inferredKind);
    } catch (err: any) {
      const msg = err?.message || 'Upload failed';
      setActionError(msg);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-96">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Advertisements Management</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleNewAd} className="gap-2">
              <Plus className="w-4 h-4" />
              New Advertisement
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingAd ? 'Edit Advertisement' : 'Create Advertisement'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <Input
                  placeholder="Ad title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                />
              </div>
              <div>
                <Textarea
                  placeholder="Ad description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Media (Image or Video)</label>
                <div className="flex flex-col gap-2">
                  <Input
                    type="url"
                    placeholder="https://... (image or video)"
                    value={mediaForm.url}
                    onChange={(e) => {
                      const url = e.target.value;
                      const kind = inferKind(url);
                      setMediaForm({ ...mediaForm, url, kind });
                      setFormData({ ...formData, image_url: url });
                      setMediaMeta((prev) => ({ ...prev, fileName: undefined, fileSizeBytes: undefined }));
                      // Probe dimensions/duration from URL
                      probeMediaFromUrl(url, kind);
                    }}
                  />
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <label className="flex items-center gap-1">
                      <input
                        type="radio"
                        name="media_kind"
                        value="image"
                        checked={mediaForm.kind === 'image'}
                        onChange={() => setMediaForm({ ...mediaForm, kind: 'image' })}
                      />
                      Image
                    </label>
                    <label className="flex items-center gap-1">
                      <input
                        type="radio"
                        name="media_kind"
                        value="video"
                        checked={mediaForm.kind === 'video'}
                        onChange={() => setMediaForm({ ...mediaForm, kind: 'video' })}
                      />
                      Video
                    </label>
                    <span className="text-[11px]">Supported: jpg, png, webp, mp4, webm, mov</span>
                  </div>
                  <div className="flex flex-col gap-2 rounded-md border p-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        accept="image/*,video/mp4,video/webm,video/quicktime"
                        onChange={(e) => handleUploadMedia(e.target.files?.[0] || null)}
                        disabled={uploading}
                        className="text-sm"
                      />
                      {uploading && <span className="text-xs text-muted-foreground">Uploading...</span>}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="number"
                        min="0"
                        placeholder="Width (px)"
                        value={mediaForm.width}
                        onChange={(e) => setMediaForm({ ...mediaForm, width: e.target.value })}
                      />
                      <Input
                        type="number"
                        min="0"
                        placeholder="Height (px)"
                        value={mediaForm.height}
                        onChange={(e) => setMediaForm({ ...mediaForm, height: e.target.value })}
                      />
                    </div>
                    {(() => {
                      const rec = getDefaultSize(formData.position, mediaForm.kind);
                      const ar = aspectRatio(rec.width, rec.height);
                      const mp = toMegapixels(rec.width, rec.height);
                      return (
                        <div className="text-xs text-muted-foreground">
                          Recommended for {mediaForm.kind} at "{formData.position}": {rec.width}×{rec.height}px{ar ? ` • AR ${ar}` : ''}{mp ? ` • ${mp}` : ''}
                        </div>
                      );
                    })()}
                    {(mediaMeta.intrinsicWidth && mediaMeta.intrinsicHeight) || mediaMeta.fileSizeBytes ? (
                      <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-2">
                        {mediaMeta.intrinsicWidth && mediaMeta.intrinsicHeight && (
                          <span>Detected: {mediaMeta.intrinsicWidth}×{mediaMeta.intrinsicHeight}px</span>
                        )}
                        {mediaMeta.durationSec != null && (
                          <span>Duration: {formatDuration(mediaMeta.durationSec)}</span>
                        )}
                        {mediaMeta.fileSizeBytes != null && (
                          <span>File: {formatBytes(mediaMeta.fileSizeBytes)}{mediaMeta.fileName ? ` (${mediaMeta.fileName})` : ''}</span>
                        )}
                      </div>
                    ) : null}
                    {mediaForm.url && (
                      <div className="text-xs text-muted-foreground">Stored as: {buildStoredUrl(mediaForm.url, mediaForm.width, mediaForm.height, mediaForm.kind)}</div>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">CTA Text</label>
                  <Input
                    placeholder="Button text"
                    value={formData.cta_text}
                    onChange={(e) =>
                      setFormData({ ...formData, cta_text: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">CTA URL</label>
                  <Input
                    placeholder="https://example.com"
                    value={formData.cta_url}
                    onChange={(e) =>
                      setFormData({ ...formData, cta_url: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Target Role</label>
                  <Select
                    value={formData.target_role}
                    onValueChange={(value) =>
                      setFormData({ ...formData, target_role: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="client">Clients</SelectItem>
                      <SelectItem value="all">All Users</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Position</label>
                  <Select
                    value={formData.position}
                    onValueChange={(value) => {
                      const defaults = getDefaultSize(value, mediaForm.kind);
                      setFormData({ ...formData, position: value });
                      setMediaForm((prev) => ({
                        ...prev,
                        width: prev.width || defaults.width,
                        height: prev.height || defaults.height,
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="top">Top</SelectItem>
                      <SelectItem value="bottom">Bottom</SelectItem>
                      <SelectItem value="sidebar">Sidebar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Frequency</label>
                  <Select
                    value={formData.display_frequency}
                    onValueChange={(value) =>
                      setFormData({ ...formData, display_frequency: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="always">Always</SelectItem>
                      <SelectItem value="once_per_session">Once Per Session</SelectItem>
                      <SelectItem value="once_per_day">Once Per Day</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {/* Targeting */}
              <div className="space-y-2">
                <label className="block text-sm font-medium">Targeting</label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={limitToClients}
                    onChange={(e) => setLimitToClients(e.target.checked)}
                  />
                  Limit to specific clients
                </label>
                {limitToClients && (
                  <div className="max-h-48 overflow-auto rounded border p-2">
                    <div className="mb-2 text-xs text-muted-foreground">Select one or more clients</div>
                    {clients.length === 0 ? (
                      <div className="text-xs text-muted-foreground">No clients available</div>
                    ) : (
                      <ul className="space-y-1">
                        {clients.map((c) => {
                          const id = c.id as string;
                          const checked = selectedClientIds.includes(id);
                          return (
                            <li key={id} className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  if (e.target.checked) setSelectedClientIds((prev) => Array.from(new Set([...prev, id])));
                                  else setSelectedClientIds((prev) => prev.filter((x) => x !== id));
                                }}
                              />
                              <span className="truncate">
                                {c.company_name || c.email}
                                <span className="text-xs text-muted-foreground ml-1">({c.email})</span>
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Start Date</label>
                  <Input
                    type="datetime-local"
                    value={formData.start_date}
                    onChange={(e) =>
                      setFormData({ ...formData, start_date: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End Date</label>
                  <Input
                    type="datetime-local"
                    value={formData.end_date}
                    onChange={(e) =>
                      setFormData({ ...formData, end_date: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              {actionError && (
                <div className="text-sm text-red-600 mr-auto">
                  {actionError}
                </div>
              )}
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving || uploading}>
                Cancel
              </Button>
              <Button onClick={handleSaveAd} disabled={saving || uploading}>
                {saving ? 'Saving…' : editingAd ? 'Update' : 'Create'} Advertisement
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Setup / error notices */}
      {setupNeeded && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 text-amber-900 p-4 text-sm">
          <p className="font-semibold">Ads tables are not created yet.</p>
          <p className="mt-1">
            Run the SQL in <a className="underline" href="/ADS_SETUP_INSTRUCTIONS.md" target="_blank" rel="noreferrer">ADS_SETUP_INSTRUCTIONS.md</a> in Supabase to create
            <code className="mx-1">advertisements</code> and <code className="mx-1">ad_analytics</code> tables, then refresh this page.
          </p>
        </div>
      )}

      {errorMsg && !setupNeeded && (
        <div className="rounded-lg border border-red-300 bg-red-50 text-red-900 p-4 text-sm">
          <p className="font-semibold">Error loading advertisements</p>
          <p className="mt-1">{errorMsg}</p>
        </div>
      )}

      {/* Ads List */}
      <div className="grid gap-4 md:grid-cols-2">
        {ads.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">No advertisements yet. Create one to get started!</p>
            </CardContent>
          </Card>
        ) : (
          ads.map((ad) => {
            const media = parseMediaUrl(ad.image_url || '');
            const isVideo = media.kind === 'video';
            const fallback = getDefaultSize(ad.position || 'top', media.kind);
            const mediaWrapperStyle = {
              aspectRatio: '16 / 9',
              width: '100%',
              maxHeight: '360px',
              backgroundColor: '#0f172a',
            } as const;
            const isYouTube = isYouTubeUrl(media.url);
            const videoSrc = isYouTube ? toYouTubeEmbed(media.url) : buildStoredUrl(media.url, media.width, media.height, media.kind) || media.url;
            const imgSrc = buildStoredUrl(media.url, media.width, media.height, media.kind) || media.url;

            return (
              <Card key={ad.id} className="h-full">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 gap-3">
                  <div className="flex-1">
                    <CardTitle>{ad.title}</CardTitle>
                    <div className="flex flex-wrap gap-2 mt-2 text-xs">
                      <Badge variant={ad.is_active ? 'default' : 'secondary'}>
                        {ad.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <Badge variant="outline">{ad.position}</Badge>
                      <Badge variant="outline">{ad.target_role}</Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditAd(ad)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteAd(ad.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {ad.description && <p className="text-sm text-muted-foreground">{ad.description}</p>}
                  {media.url && (
                    <div className="w-full overflow-hidden rounded-lg border bg-slate-900/40" style={mediaWrapperStyle}>
                      {isVideo ? (
                        isYouTube ? (
                          <iframe
                            src={videoSrc}
                            title={ad.title}
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        ) : (
                          <video
                            src={videoSrc}
                            controls
                            className="w-full h-full object-contain bg-black"
                          />
                        )
                      ) : (
                        <img
                          src={imgSrc}
                          alt={ad.title}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                  )}
                  <div className="flex gap-4">
                    <a
                      href={ad.cta_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm"
                    >
                      {ad.cta_text} →
                    </a>
                  </div>
                  {/* Analytics */}
                  <div className="bg-muted p-4 rounded-lg space-y-2">
                    <p className="font-semibold text-sm">Analytics</p>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4 text-blue-600" />
                        <div>
                          <p className="text-2xl font-bold">{analytics[ad.id]?.views || 0}</p>
                          <p className="text-xs text-muted-foreground">Views</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <MousePointerClick className="w-4 h-4 text-green-600" />
                        <div>
                          <p className="text-2xl font-bold">{analytics[ad.id]?.clicks || 0}</p>
                          <p className="text-xs text-muted-foreground">Clicks</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{analytics[ad.id]?.unique_clients || 0}</p>
                        <p className="text-xs text-muted-foreground">Unique Clients</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
