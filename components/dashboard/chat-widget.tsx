"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/contexts/auth-context";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Loader2, X, Minus, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { sendChatNotification, requestNotificationPermission } from "@/lib/notifications";

interface ChatMessage {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  user?: {
    full_name: string;
    email: string;
    avatar_url?: string;
    role: string;
  };
}

interface User {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  role: string;
}

export function ChatWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  // Dedicated loader that can be triggered when chat opens
  const fetchMessages = async () => {
    if (!user) return;
    setLoading(true);
    setLoadError(null);
    try {
      // Fetch all users for mentions
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("id, full_name, email, avatar_url, role")
        .in("role", ["admin", "project_manager", "employee"]);

      if (usersError) {
        console.warn("Users fetch error:", usersError);
      }
      if (usersData) {
        setAllUsers(usersData);
      }

      // Fetch messages
      const { data: messagesData, error: messagesError } = await supabase
        .from("chat_messages")
        .select("id, user_id, message, created_at")
        .order("created_at", { ascending: true })
        .limit(100);

      if (messagesError || !messagesData) {
        console.error("Error fetching messages:", messagesError);
        setLoadError(messagesError?.message || "Failed to fetch messages");
        return;
      }

      // Fetch user data for all unique user IDs
      const userIds = [...new Set(messagesData.map((m) => m.user_id))];
      let usersMap = new Map<string, User>();
      if (userIds.length > 0) {
        const { data: msgUsersData, error: msgUsersError } = await supabase
          .from("users")
          .select("id, full_name, email, avatar_url, role")
          .in("id", userIds);

        if (msgUsersError) {
          console.warn("Message users fetch error:", msgUsersError);
        }
        usersMap = new Map((msgUsersData || []).map((u: User) => [u.id, u]));
      }

      // Map users to messages
      const messagesWithUsers = messagesData.map((msg) => ({
        ...msg,
        user: usersMap.get(msg.user_id),
      }));

      setMessages(messagesWithUsers as any);
      setUnreadCount(0);
      setTimeout(scrollToBottom, 100);
    } catch (err: any) {
      console.error("Unexpected error fetching messages:", err);
      setLoadError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  // Trigger loading when chat opens (and user is ready)
  useEffect(() => {
    if (isOpen && user) {
      fetchMessages();
    }
  }, [isOpen, user]);

  // Request notification permission on mount
  useEffect(() => {
    requestNotificationPermission().then(setNotificationPermission);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (!user) return;

    async function fetchMessages() {
      setLoading(true);
      setLoadError(null);
      try {
        // Fetch all users for mentions
        const { data: usersData, error: usersError } = await supabase
          .from("users")
          .select("id, full_name, email, avatar_url, role")
          .in("role", ["admin", "project_manager", "employee"]);

        if (usersError) {
          console.warn("Users fetch error:", usersError);
        }
        if (usersData) {
          setAllUsers(usersData);
        }

        // Fetch messages
        const { data: messagesData, error: messagesError } = await supabase
          .from("chat_messages")
          .select("id, user_id, message, created_at")
          .order("created_at", { ascending: true })
          .limit(100);

        if (messagesError || !messagesData) {
          console.error("Error fetching messages:", messagesError);
          setLoadError(messagesError?.message || "Failed to fetch messages");
          return;
        }

        // Fetch user data for all unique user IDs
        const userIds = [...new Set(messagesData.map((m) => m.user_id))];
        let usersMap = new Map<string, User>();
        if (userIds.length > 0) {
          const { data: msgUsersData, error: msgUsersError } = await supabase
            .from("users")
            .select("id, full_name, email, avatar_url, role")
            .in("id", userIds);

          if (msgUsersError) {
            console.warn("Message users fetch error:", msgUsersError);
          }
          usersMap = new Map((msgUsersData || []).map((u: User) => [u.id, u]));
        }

        // Map users to messages
        const messagesWithUsers = messagesData.map((msg) => ({
          ...msg,
          user: usersMap.get(msg.user_id),
        }));

        setMessages(messagesWithUsers as any);
        setUnreadCount(0);
        setTimeout(scrollToBottom, 100);
      } catch (err: any) {
        console.error("Unexpected error fetching messages:", err);
        setLoadError(err?.message || String(err));
      } finally {
        setLoading(false);
      }
    }

    // Only fetch messages when chat is opened
    if (isOpen) {
      fetchMessages();
    }

      // Subscribe to new messages (always active, even when closed)
    console.log("📡 Setting up real-time subscription...");
    const channel = supabase
      .channel("chat_widget_room")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
        },
        async (payload) => {
          console.log("📨 Real-time message received!", payload);
          // Fetch the message
          const { data: msgData } = await supabase
            .from("chat_messages")
            .select("id, user_id, message, created_at")
            .eq("id", payload.new.id)
            .single();

          if (msgData) {
            // Fetch user data
            const { data: userData } = await supabase
              .from("users")
              .select("id, full_name, email, avatar_url, role")
              .eq("id", msgData.user_id)
              .single();

            const messageWithUser = {
              ...msgData,
              user: userData
            };

            setMessages((prev) => [...prev, messageWithUser as any]);
            
            // Send notification if message is from another user and chat is closed
            if (msgData.user_id !== user?.id) {
              console.log("🔔 New message from another user:", userData?.full_name);
              
              if (!isOpen) {
                setUnreadCount((prev) => prev + 1);
              }
              
              // Send notifications to all channels
              console.log("🔔 Sending notification...");
              try {
                await sendChatNotification(
                  userData?.full_name || "Team Member",
                  msgData.message,
                  userData?.avatar_url
                );
                console.log("✅ Notification sent successfully");
              } catch (error) {
                console.error("❌ Notification failed:", error);
              }
            }
            
            setTimeout(scrollToBottom, 100);
          }
        }
      )
      .subscribe((status) => {
        console.log("📡 Subscription status:", status);
      });

    console.log("📡 Real-time subscription active");

    return () => {
      console.log("📡 Cleaning up real-time subscription");
      supabase.removeChannel(channel);
    };
  }, [user]); // Removed isOpen dependency so subscription stays active

  // Handle @ mention detection
  useEffect(() => {
    const lastWord = newMessage.split(" ").pop() || "";
    if (lastWord.startsWith("@")) {
      const search = lastWord.substring(1).toLowerCase();
      setMentionSearch(search);
      setFilteredUsers(
        allUsers.filter(
          (u) =>
            u.id !== user?.id &&
            (u.full_name.toLowerCase().includes(search) ||
              u.email.toLowerCase().includes(search))
        )
      );
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  }, [newMessage, allUsers, user]);

  const selectMention = (selectedUser: User) => {
    const words = newMessage.split(" ");
    words[words.length - 1] = `@${selectedUser.full_name.replace(/\s+/g, "")}`;
    setNewMessage(words.join(" ") + " ");
    setShowMentions(false);
    inputRef.current?.focus();
  };

  const renderMessage = (message: string) => {
    const parts = message.split(/(@\w+)/g);
    return parts.map((part, idx) => {
      if (part.startsWith("@")) {
        return (
          <span key={idx} className="font-semibold text-blue-500">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || sending) return;

    console.log("📤 Sending chat message:", newMessage.trim());
    setSending(true);
    const messageText = newMessage.trim();
    
    const { error } = await supabase
      .from("chat_messages")
      .insert({
        user_id: user.id,
        message: messageText,
      });

    console.log("📤 Message insert result:", error ? `ERROR: ${error.message}` : "SUCCESS");
    if (!error) {
      setNewMessage("");
    } else {
      alert("Failed to send message: " + error.message);
    }
    setSending(false);
  };

  return (
    <>
      {/* Only render if not a client */}
      {user && user?.role && user.role !== "client" && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 font-sans">
          {/* Chat Widget */}
          {isOpen && (
            <div className="bg-background border rounded-lg shadow-xl flex flex-col h-[500px] w-[360px] animate-in slide-in-from-bottom-4">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-4 py-3 flex items-center justify-between rounded-t-lg">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              <h3 className="font-semibold text-sm">Team Chat</h3>
            </div>
            <div className="flex gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-primary-foreground hover:bg-white/20"
                onClick={() => setIsOpen(false)}
              >
                <Minus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-3 p-3 bg-muted/30">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : loadError ? (
              <div className="flex flex-col items-center justify-center h-full gap-2">
                <p className="text-xs text-destructive">{loadError}</p>
                <Button size="sm" variant="outline" onClick={() => {
                  // Re-run fetch by toggling open state
                  setIsOpen(false);
                  setTimeout(() => setIsOpen(true), 50);
                }}>Retry</Button>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-xs text-muted-foreground">No messages yet</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isOwn = msg.user_id === user.id;
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-2 ${isOwn ? "flex-row-reverse" : ""}`}
                  >
                    <Avatar className="h-6 w-6 flex-shrink-0">
                      <AvatarImage src={msg.user?.avatar_url} />
                      <AvatarFallback className="text-xs">
                        {msg.user?.full_name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`flex-1 ${isOwn ? "text-right" : ""}`}>
                      <p className="text-xs font-medium text-muted-foreground">
                        {isOwn ? "You" : msg.user?.full_name}
                      </p>
                      <div
                        className={`inline-block max-w-[85%] p-2 rounded text-xs ${
                          isOwn
                            ? "bg-primary text-primary-foreground"
                            : "bg-background border"
                        }`}
                      >
                        <p className="break-words">{renderMessage(msg.message)}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(msg.created_at), "h:mm a")}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="relative border-t p-3 bg-background rounded-b-lg">
            {showMentions && filteredUsers.length > 0 && (
              <div className="absolute -top-48 left-0 right-0 bg-popover border rounded shadow-lg max-h-40 overflow-y-auto">
                {filteredUsers.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => selectMention(u)}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-accent text-left text-xs"
                  >
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={u.avatar_url} />
                      <AvatarFallback>{u.full_name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="truncate">{u.full_name}</span>
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={handleSend} className="flex gap-2">
              <Input
                ref={inputRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Message..."
                disabled={sending}
                className="h-8 text-xs"
              />
              <Button 
                type="submit" 
                disabled={sending || !newMessage.trim()}
                size="sm"
                className="h-8 w-8 p-0"
              >
                {sending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Send className="h-3 w-3" />
                )}
              </Button>
            </form>
          </div>
        </div>
          )}

          {/* Toggle Button - only show for non-clients */}
          <Button
          id="chat-widget"
          onClick={() => {
            setIsOpen(!isOpen);
            if (!isOpen) setUnreadCount(0);
          }}
          className="rounded-full h-14 px-8 py-3 relative flex items-center gap-3 whitespace-nowrap bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base"
          title={isOpen ? "Minimize chat" : "Open chat"}
        >
          <MessageCircle className="h-6 w-6" />
          <span>Chat</span>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 min-w-[1.25rem] rounded-full bg-red-500 text-[10px] font-semibold text-white flex items-center justify-center px-1">
              {unreadCount}
            </span>
          )}
        </Button>

        {/* Chat Widget Container - closed div */}
        </div>
      )}
    </>
  );
}
