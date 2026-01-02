// Tauri bridge for native notifications
(function() {
  if (!window.__TAURI__) return;

  console.log('🔔 Tauri notification bridge loaded');
  
  // Override web Notification API to use native notifications
  const WebNotification = window.Notification;
  
  class TauriNotification {
    constructor(title, options = {}) {
      this.title = title;
      this.options = options;
      
      // Send to Tauri native notification
      if (window.__TAURI__?.notification) {
        window.__TAURI__.notification.sendNotification({
          title: title,
          body: options.body || '',
          icon: options.icon || ''
        }).then(() => {
          console.log('🔔 Native notification sent:', title);
          if (this.options.onclick) {
            // Focus window when notification clicked
            window.__TAURI__.window.getCurrent().setFocus();
          }
        }).catch(err => {
          console.error('🔔 Failed to send native notification:', err);
        });
      }
    }
    
    close() {
      // Native notifications auto-close
    }
    
    static requestPermission() {
      return Promise.resolve('granted');
    }
    
    static get permission() {
      return 'granted';
    }
  }
  
  // Replace web Notification with Tauri version
  window.Notification = TauriNotification;
  
  // Listen for messages from service worker
  if (navigator.serviceWorker) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data.type === 'SHOW_NOTIFICATION') {
        new TauriNotification(event.data.title, event.data.options);
      }
    });
  }
})();
