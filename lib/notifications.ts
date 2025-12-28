/**
 * Comprehensive notification system for local, browser, and mobile notifications
 */

export interface NotificationOptions {
  title: string;
  body?: string;
  icon?: string;
  tag?: string;
  badge?: string;
  timestamp?: number;
  onClose?: () => void;
  onClick?: () => void;
}

/**
 * Request browser notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    console.warn("Notifications not supported in this browser");
    return "denied";
  }

  if (Notification.permission === "granted") {
    return "granted";
  }

  if (Notification.permission !== "denied") {
    return await Notification.requestPermission();
  }

  return "denied";
}

/**
 * Send browser notification
 */
export async function sendBrowserNotification(options: NotificationOptions): Promise<Notification | null> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return null;
  }

  if (Notification.permission !== "granted") {
    const permission = await requestNotificationPermission();
    if (permission !== "granted") {
      return null;
    }
  }

  try {
    const notificationConfig: any = {
      body: options.body,
      icon: options.icon || "/icons/icon-192x192.png",
      badge: options.badge || "/icons/icon-192x192.png",
      tag: options.tag || "default",
      requireInteraction: false,
    };

    if (options.timestamp) {
      notificationConfig.timestamp = options.timestamp;
    }

    const notification = new Notification(options.title, notificationConfig);

    notification.addEventListener("close", () => {
      options.onClose?.();
    });

    notification.addEventListener("click", () => {
      window.focus();
      options.onClick?.();
    });

    return notification;
  } catch (error) {
    console.error("Failed to send browser notification:", error);
    return null;
  }
}

/**
 * Show local in-app toast notification
 */
export function showLocalNotification(options: NotificationOptions): HTMLDivElement {
  console.log("🎨 showLocalNotification called:", options);
  
  const container = document.getElementById("notification-container") || createNotificationContainer();
  console.log("🎨 Container found/created:", container);

  const notificationEl = document.createElement("div");
  // Use inline styles for better reliability
  notificationEl.style.cssText = `
    position: fixed;
    top: 1rem;
    left: 50%;
    transform: translateX(-50%);
    z-index: 9999;
    max-width: 24rem;
    width: calc(100% - 2rem);
    padding: 0.75rem 1rem;
    background-color: hsl(var(--primary));
    color: hsl(var(--primary-foreground));
    border-radius: 0.5rem;
    box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
    border: 1px solid hsla(var(--primary), 0.2);
    display: flex;
    gap: 0.75rem;
    align-items: flex-start;
    animation: slideInFromTop 0.3s ease-out;
    pointer-events: auto;
  `;

  notificationEl.innerHTML = `
    <div style="flex: 1; min-width: 0;">
      <p style="font-weight: 600; font-size: 0.875rem; margin: 0;">${escapeHtml(options.title)}</p>
      ${options.body ? `<p style="font-size: 0.75rem; color: hsla(var(--primary-foreground), 0.8); margin-top: 0.25rem;">${escapeHtml(options.body)}</p>` : ""}
    </div>
    <button style="flex-shrink: 0; color: hsl(var(--primary-foreground)); cursor: pointer; background: none; border: none; padding: 0; line-height: 1;" aria-label="Dismiss notification">
      <svg style="width: 1rem; height: 1rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
      </svg>
    </button>
  `;

  // Add keyframe animation if not already present
  if (!document.getElementById("notification-styles")) {
    const style = document.createElement("style");
    style.id = "notification-styles";
    style.textContent = `
      @keyframes slideInFromTop {
        from {
          opacity: 0;
          transform: translateX(-50%) translateY(-1rem);
        }
        to {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
      }
      @keyframes slideOutToTop {
        from {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
        to {
          opacity: 0;
          transform: translateX(-50%) translateY(-1rem);
        }
      }
    `;
    document.head.appendChild(style);
  }

  const dismissBtn = notificationEl.querySelector("button");
  dismissBtn?.addEventListener("click", () => {
    removeNotification(notificationEl);
    options.onClose?.();
  });

  notificationEl.addEventListener("click", () => {
    options.onClick?.();
  });

  container.appendChild(notificationEl);
  console.log("✅ Notification element appended to container");

  // Auto-dismiss after 5 seconds
  const timeout = setTimeout(() => {
    removeNotification(notificationEl);
  }, 5000);

  notificationEl.addEventListener("mouseenter", () => clearTimeout(timeout));
  notificationEl.addEventListener("mouseleave", () => {
    setTimeout(() => removeNotification(notificationEl), 5000);
  });

  return notificationEl;
}

/**
 * Create notification container if it doesn't exist
 */
function createNotificationContainer(): HTMLDivElement {
  const container = document.createElement("div");
  container.id = "notification-container";
  container.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    pointer-events: none;
    z-index: 999;
  `;
  document.body.appendChild(container);
  return container;
}

/**
 * Remove notification element
 */
function removeNotification(element: HTMLDivElement): void {
  element.style.animation = "slideOutToTop 0.3s ease-out forwards";
  setTimeout(() => {
    element.remove();
  }, 300);
}

/**
 * Vibrate device (mobile status bar notifications)
 */
export function vibrateDevice(pattern: number | number[] = 200): void {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch (error) {
      console.warn("Vibration API not available or blocked");
    }
  }
}

/**
 * Send comprehensive notification (all types)
 */
export async function sendNotification(options: NotificationOptions & { vibrate?: boolean }): Promise<void> {
  console.log("🔔 sendNotification called with:", options);
  
  const { vibrate = true, ...notifOptions } = options;

  // Send local notification
  console.log("🔔 Showing local notification...");
  showLocalNotification(notifOptions);

  // Send browser notification
  console.log("🔔 Sending browser notification...");
  await sendBrowserNotification(notifOptions);

  // Trigger device vibration
  if (vibrate) {
    console.log("🔔 Triggering vibration...");
    vibrateDevice(200);
  }
  
  console.log("✅ All notification methods called");
}

/**
 * Send chat message notification with all channels
 */
export async function sendChatNotification(
  senderName: string,
  message: string,
  senderAvatar?: string
): Promise<void> {
  console.log("📢 sendChatNotification called:", { senderName, message, senderAvatar });
  
  const body = message.length > 100 ? message.substring(0, 97) + "..." : message;

  console.log("📢 Calling sendNotification...");
  await sendNotification({
    title: `New message from ${senderName}`,
    body,
    icon: senderAvatar || "/icons/icon-192x192.png",
    tag: "chat-notification",
    onClick: () => {
      // Focus window and scroll to chat
      window.focus();
      document.getElementById("chat-widget")?.scrollIntoView({ behavior: "smooth" });
    },
    vibrate: true,
  });
  console.log("✅ sendNotification complete");
}

/**
 * Escape HTML special characters for security
 */
function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Request microphone access for audio notifications (optional)
 */
export async function playNotificationSound(soundUrl: string = "/sounds/notification.mp3"): Promise<void> {
  try {
    const audio = new Audio(soundUrl);
    audio.play().catch((error) => {
      console.warn("Failed to play notification sound:", error);
    });
  } catch (error) {
    console.warn("Audio notification not supported:", error);
  }
}
