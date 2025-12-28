'use client';

import { useEffect } from 'react';

// Audio context for notification sounds
const audioContext = typeof window !== 'undefined' 
  ? new (window.AudioContext || (window as any).webkitAudioContext)()
  : null;

/**
 * Play a notification sound using Web Audio API
 * Creates a pleasant notification beep
 */
export function playNotificationSound() {
  if (!audioContext) return;

  try {
    const now = audioContext.currentTime;
    
    // Create oscillators for a pleasant "ding" sound
    const osc1 = audioContext.createOscillator();
    const osc2 = audioContext.createOscillator();
    const gain = audioContext.createGain();
    
    // First tone (higher pitch)
    osc1.frequency.value = 800;
    osc1.type = 'sine';
    
    // Second tone (lower pitch)
    osc2.frequency.value = 600;
    osc2.type = 'sine';
    
    // Volume envelope
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    
    // Connect and play
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(audioContext.destination);
    
    osc1.start(now);
    osc2.start(now);
    
    osc1.stop(now + 0.3);
    osc2.stop(now + 0.2);
  } catch (err) {
    console.log('Could not play notification sound:', err);
  }
}

/**
 * Hook to play notification sound when chat messages arrive
 */
export function useNotificationSound() {
  useEffect(() => {
    // Listen for notification events
    const handleNotification = () => {
      playNotificationSound();
    };

    window.addEventListener('notification-received', handleNotification);
    return () => {
      window.removeEventListener('notification-received', handleNotification);
    };
  }, []);
}
