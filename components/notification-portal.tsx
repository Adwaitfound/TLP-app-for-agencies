"use client";

import { useEffect } from "react";

/**
 * Notification Portal - Creates and manages the notification container
 * Must be rendered in the root layout for notifications to work
 */
export function NotificationPortal() {
  useEffect(() => {
    console.log("🎯 NotificationPortal mounted, creating container...");
    // Ensure notification container exists
    let container = document.getElementById("notification-container");
    
    if (!container) {
      console.log("🎯 Creating new notification container");
      container = document.createElement("div");
      container.id = "notification-container";
      container.className = "fixed inset-0 pointer-events-none top-0 left-0 right-0 z-[999]";
      document.body.appendChild(container);
      console.log("🎯 Notification container created and appended to body");
    } else {
      console.log("🎯 Notification container already exists");
    }

    return () => {
      console.log("🎯 NotificationPortal cleanup");
      // Clean up empty container on unmount
      if (container && container.children.length === 0) {
        container.remove();
      }
    };
  }, []);

  return null;
}
