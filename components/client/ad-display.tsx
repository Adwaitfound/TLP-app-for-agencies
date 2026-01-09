'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { X } from 'lucide-react';

type MediaKind = 'image' | 'video' | 'youtube';

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

export function AdDisplay({ position = 'top' }: { position?: 'top' | 'bottom' | 'sidebar' }) {
  const [ad, setAd] = useState<any>(null);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const isYouTubeUrl = (url: string) => {
    const lower = url.toLowerCase();
    return lower.includes('youtube.com/watch') || lower.includes('youtu.be/') || lower.includes('youtube.com/embed');
  };

  const toYouTubeEmbed = (url: string) => {
    try {
      const u = new URL(url);
      const host = u.hostname.toLowerCase();
      let id = '';
      if (host.includes('youtu.be')) {
        id = u.pathname.replace('/', '');
      } else if (u.pathname.startsWith('/embed/')) {
        id = u.pathname.replace('/embed/', '');
      } else {
        id = u.searchParams.get('v') || '';
      }
      if (!id) return url;
      return `https://www.youtube.com/embed/${id}?rel=0&playsinline=1`;
    } catch (err) {
      return url;
    }
  };

  const inferKind = (url: string): MediaKind => {
    if (isYouTubeUrl(url)) return 'youtube';
    const lower = url.toLowerCase();
    if (lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.mov') || lower.endsWith('.m4v')) {
      return 'video';
    }
    return 'image';
  };

  const parseMediaUrl = (raw: string) => {
    if (!raw) return { url: '', width: '', height: '', kind: 'image' as MediaKind };
    if (isYouTubeUrl(raw)) return { url: raw, width: '', height: '', kind: 'youtube' };
    try {
      const u = new URL(raw);
      const width = u.searchParams.get('w') || '';
      const height = u.searchParams.get('h') || '';
      const type = (u.searchParams.get('type') as MediaKind) || inferKind(u.pathname);
      const normalizedKind: MediaKind = type === 'youtube' ? 'youtube' : type === 'video' ? 'video' : 'image';

      // Preserve any existing query params (e.g., signed URLs), but strip sizing/type hints.
      const cleaned = new URL(raw);
      cleaned.searchParams.delete('w');
      cleaned.searchParams.delete('h');
      cleaned.searchParams.delete('type');

      return {
        url: `${cleaned.origin}${cleaned.pathname}${cleaned.search}`,
        width,
        height,
        kind: normalizedKind,
      };
    } catch (err) {
      return { url: raw, width: '', height: '', kind: inferKind(raw) };
    }
  };

  const buildStoredUrl = (url: string, width?: string, height?: string, kind?: MediaKind) => {
    if (!url) return url;
    if (kind === 'youtube' || isYouTubeUrl(url)) return toYouTubeEmbed(url);
    try {
      const u = new URL(url);
      if (width) u.searchParams.set('w', width);
      if (height) u.searchParams.set('h', height);
      if (kind) u.searchParams.set('type', kind);
      return u.toString();
    } catch (err) {
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
    // YouTube should use video defaults
    const effectiveKind: 'image' | 'video' = kind === 'youtube' ? 'video' : kind;
    return byPos[effectiveKind] || byPos.image;
  };

  useEffect(() => {
    fetchAndDisplayAd();
  }, []);

  const fetchAndDisplayAd = async () => {
    try {
      const now = new Date().toISOString();
      // Identify current client (if logged in)
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData?.user?.id || null;
      let clientId: string | null = null;
      if (uid) {
        const { data: c } = await supabase
          .from('clients')
          .select('id')
          .eq('user_id', uid)
          .single();
        clientId = c?.id || null;
      }

      // Get active ads for this position
      let { data: adsData, error } = await supabase
        .from('advertisements')
        .select('*, ad_targets(client_id)')
        .eq('is_active', true)
        .eq('position', position)
        .or(`start_date.is.null,start_date.lte.${now}`)
        .or(`end_date.is.null,end_date.gte.${now}`)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        // ad_targets might not exist yet; fallback to basic ads query
        const { data: fallbackAds, error: fbErr } = await supabase
          .from('advertisements')
          .select('*')
          .eq('is_active', true)
          .eq('position', position)
          .or(`start_date.is.null,start_date.lte.${now}`)
          .or(`end_date.is.null,end_date.gte.${now}`)
          .order('created_at', { ascending: false })
          .limit(10);
        if (fbErr) {
          console.debug('ℹ️  Ads table not yet set up or no active ads. Run SQL migration to enable ads.');
          setLoading(false);
          return;
        }
        adsData = fallbackAds as any;
      }

      if (adsData && adsData.length > 0) {
        const filtered = adsData.filter((a: any) => {
          const targets = Array.isArray(a.ad_targets) ? a.ad_targets : [];
          if (targets.length === 0) return true; // untargeted -> show to all
          if (!clientId) return false; // logged out or not a client
          return targets.some((t: any) => t.client_id === clientId);
        });
        const selectedAd = filtered[0];
        if (!selectedAd) {
          setAd(null);
          setLoading(false);
          return;
        }
        setAd(selectedAd);

        // Track view
        await trackEvent(selectedAd.id, 'view');

        // Check if we should show based on frequency
        const shouldShow = await checkDisplayFrequency(selectedAd);
        if (!shouldShow) {
          setAd(null);
        }
      }
    } catch (err: any) {
      // Table doesn't exist or other error - just don't show ads
      if (err?.code === 'PGRST116' || err?.message?.includes('not found')) {
        console.debug('ℹ️  Ads table setup required. See ADS_SETUP_INSTRUCTIONS.md');
      } else {
        console.debug('ℹ️  Ad system not yet initialized');
      }
    } finally {
      setLoading(false);
    }
  };

  const checkDisplayFrequency = async (ad: any): Promise<boolean> => {
    const sessionKey = `ad_shown_${ad.id}_session`;
    const dailyKey = `ad_shown_${ad.id}_daily`;
    const today = new Date().toDateString();

    switch (ad.display_frequency) {
      case 'once_per_session':
        if (sessionStorage.getItem(sessionKey)) return false;
        sessionStorage.setItem(sessionKey, 'true');
        return true;
      case 'once_per_day':
        const lastShown = localStorage.getItem(dailyKey);
        if (lastShown === today) return false;
        localStorage.setItem(dailyKey, today);
        return true;
      case 'always':
      default:
        return true;
    }
  };

  const trackEvent = async (adId: string, eventType: 'view' | 'click') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let clientId = null;

      // Get client ID if user is a client
      if (user) {
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (clientError) {
          console.warn('Could not fetch client ID:', clientError);
        }

        clientId = clientData?.id;
      }

      const analyticsData = {
        ad_id: adId,
        client_id: clientId,
        event_type: eventType,
        event_data: {
          timestamp: new Date().toISOString(),
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        },
      };

      console.log(`📊 Tracking ad ${eventType}:`, analyticsData);

      const { data, error } = await supabase
        .from('ad_analytics')
        .insert([analyticsData]);

      if (error) {
        console.error('Error inserting ad analytics:', error);
      } else {
        console.log(`✅ Ad ${eventType} tracked successfully:`, adId);
      }
    } catch (err) {
      console.error('Error tracking ad event:', err);
    }
  };

  const handleClick = () => {
    if (ad) {
      trackEvent(ad.id, 'click');
      if (ad.cta_url) {
        window.open(ad.cta_url, '_blank');
      }
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    setAd(null);
  };

  if (loading || !ad || dismissed) {
    return null;
  }

  const media = parseMediaUrl(ad.image_url || '');
  const isYouTube = media.kind === 'youtube';
  const isVideo = media.kind === 'video' || isYouTube;
  const effectiveKind: MediaKind = (media.kind === 'youtube' ? 'video' : media.kind) as MediaKind;
  const defaults = getDefaultSize(position, effectiveKind);
  const mediaSrc = isYouTube
    ? toYouTubeEmbed(media.url)
    : buildStoredUrl(
        media.url,
        media.width || defaults.width,
        media.height || defaults.height,
        effectiveKind,
      ) || media.url;
  const mediaWrapperStyle = {
    aspectRatio: '16 / 9',
    width: '100%',
    maxWidth: '100%',
    maxHeight: position === 'sidebar' ? '360px' : '480px',
    backgroundColor: '#000',
  } as const;
  const mediaWrapperClass = position === 'sidebar'
    ? 'w-full rounded-lg mb-3 overflow-hidden border border-indigo-100 shadow-sm'
    : 'w-full rounded-lg mb-3 overflow-hidden border border-indigo-200 shadow-sm';
  const imageStyle = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  } as const;

  // Different rendering based on position
  if (position === 'sidebar') {
    return (
      <Card className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-indigo-200 relative overflow-hidden group shadow-md">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 hover:bg-white rounded transition-colors"
        >
          <X className="w-4 h-4 text-gray-600" />
        </button>
        {media.url && (
          <div className={mediaWrapperClass} style={mediaWrapperStyle}>
            {isVideo ? (
              isYouTube ? (
                <iframe
                  src={mediaSrc}
                  title={ad.title || 'Ad video'}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              ) : (
                <video
                  src={mediaSrc}
                  controls
                  playsInline
                  className="w-full h-full object-contain bg-black"
                />
              )
            ) : (
              <img
                src={mediaSrc}
                alt={ad.title}
                className="w-full h-full"
                style={imageStyle}
              />
            )}
          </div>
        )}
        <h3 className="font-bold text-sm text-indigo-900 mb-1">{ad.title}</h3>
        {ad.description && (
          <p className="text-xs text-indigo-700 mb-3">{ad.description}</p>
        )}
        <Button
          onClick={handleClick}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9"
        >
          {ad.cta_text}
        </Button>
      </Card>
    );
  }

  if (position === 'top') {
    return (
      <div className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-xl mb-6 relative shadow-lg">
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1.5 hover:bg-white/20 rounded-full transition-colors z-10"
          aria-label="Dismiss ad"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="flex flex-col items-center text-center">
          <h3 className="font-bold text-xl sm:text-2xl leading-tight mb-2">{ad.title}</h3>
          {ad.description && <p className="text-sm text-blue-100 mb-4 max-w-md">{ad.description}</p>}
          {media.url && (
            <div className="relative w-full max-w-4xl mb-4">
              <div className={mediaWrapperClass} style={{ ...mediaWrapperStyle, maxHeight: '200px' }}>
                {isVideo ? (
                  isYouTube ? (
                    <iframe
                      src={mediaSrc}
                      title={ad.title || 'Ad video'}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full"
                    />
                  ) : (
                    <video
                      src={mediaSrc}
                      controls
                      playsInline
                      className="w-full h-full object-contain bg-black"
                    />
                  )
                ) : (
                  <img
                    src={mediaSrc}
                    alt={ad.title}
                    className="w-full h-full"
                    style={imageStyle}
                  />
                )}
              </div>
            </div>
          )}
          <Button
            onClick={handleClick}
            className="bg-white text-blue-600 hover:bg-blue-50 font-semibold px-8 py-2.5"
            size="lg"
          >
            {ad.cta_text}
          </Button>
        </div>
      </div>
    );
  }

  if (position === 'bottom') {
    return (
      <div className="w-full bg-gray-900 text-white p-6 rounded-xl mt-6 relative shadow-lg">
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1.5 hover:bg-gray-800 rounded-full transition-colors z-10"
          aria-label="Dismiss ad"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="flex flex-col items-center text-center">
          <h3 className="font-bold text-xl sm:text-2xl leading-tight mb-2">{ad.title}</h3>
          {ad.description && <p className="text-sm text-gray-300 mb-4 max-w-md">{ad.description}</p>}
          {media.url && (
            <div className="relative w-full max-w-4xl mb-4">
              <div className={mediaWrapperClass} style={{ ...mediaWrapperStyle, maxHeight: '200px' }}>
                {isVideo ? (
                  isYouTube ? (
                    <iframe
                      src={mediaSrc}
                      title={ad.title || 'Ad video'}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full"
                    />
                  ) : (
                    <video
                      src={mediaSrc}
                      controls
                      playsInline
                      className="w-full h-full object-contain bg-black"
                    />
                  )
                ) : (
                  <img
                    src={mediaSrc}
                    alt={ad.title}
                    className="w-full h-full"
                    style={imageStyle}
                  />
                )}
              </div>
            </div>
          )}
          <Button
            onClick={handleClick}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-2.5"
            size="lg"
          >
            {ad.cta_text}
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
