'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { createClient } from '@/lib/supabase/client';

export function BadgeManager() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const supabase = createClient();

    // Fetch initial unread count
    async function fetchUnreadCount() {
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);

      setUnreadCount(count || 0);
      updateBadges(count || 0);
    }

    fetchUnreadCount();

    // Subscribe to notification changes
    const channel = supabase
      .channel('notifications_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        async () => {
          // Refetch count on any notification change
          const { count } = await supabase
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('read', false);

          const newCount = count || 0;
          setUnreadCount(newCount);
          updateBadges(newCount);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    // Update document title with count
    const baseTitle = 'Video Production App';
    if (unreadCount > 0) {
      document.title = `(${unreadCount}) ${baseTitle}`;
    } else {
      document.title = baseTitle;
    }
  }, [unreadCount]);

  return null;
}

function updateBadges(count: number) {
  // Update app icon badge if Badge API is supported
  if ('setAppBadge' in navigator) {
    if (count > 0) {
      (navigator as any).setAppBadge(count).catch((err: any) => {
        console.log('Badge API error:', err);
      });
    } else {
      (navigator as any).clearAppBadge?.().catch((err: any) => {
        console.log('Clear badge error:', err);
      });
    }
  }
}
