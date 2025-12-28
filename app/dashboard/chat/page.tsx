"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/contexts/auth-context";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { notifyChatMessage } from "@/app/actions/notifications";

interface User {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  role: string;
}

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

export default function ChatPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (!user) return;

    async function fetchMessages() {
      setLoading(true);
      
      // Fetch all users for mentions
      const { data: usersData } = await supabase
        .from("users")
        .select("id, full_name, email, avatar_url, role")
        .in("role", ["admin", "project_manager", "employee"]);
      
      if (usersData) {
        setAllUsers(usersData);
      }

      // Fetch messages
      const { data: messagesData, error: messagesError } = await supabase
        .from("chat_messages")
        .select("id, user_id, message, created_at")
        .order("created_at", { ascending: true })
        .limit(200);

      if (messagesError || !messagesData) {
        console.error("Error fetching messages:", messagesError);
        setLoading(false);
        return;
      }

      // Fetch user data for all unique user IDs
      const userIds = [...new Set(messagesData.map(m => m.user_id))];
      const { data: msgUsersData } = await supabase
        .from("users")
        .select("id, full_name, email, avatar_url, role")
        .in("id", userIds);

      // Map users to messages
      const usersMap = new Map(msgUsersData?.map(u => [u.id, u]) || []);
      const messagesWithUsers = messagesData.map(msg => ({
        ...msg,
        user: usersMap.get(msg.user_id)
      }));

      setMessages(messagesWithUsers as any);
      setTimeout(scrollToBottom, 100);
      setLoading(false);
    }

    fetchMessages();

    // Subscribe to new messages - use broadcast for more reliable delivery
    const channel = supabase
      .channel("chat_room", {
        config: {
          broadcast: { self: false },
        },
      })
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
        },
        async (payload) => {
          console.log("📩 New message received:", payload);
          
          // Fetch the complete message with user data
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

            console.log("✅ Adding message to state:", messageWithUser);
            setMessages((prev) => [...prev, messageWithUser as any]);
            setTimeout(scrollToBottom, 100);
          }
        }
      )
      .subscribe((status, err) => {
        console.log("🔌 Realtime status:", status);
        if (err) console.error("❌ Realtime error:", err);
        if (status === "SUBSCRIBED") {
          console.log("✅ Successfully subscribed to chat_room");
        }
      });

    return () => {
      console.log("Unsubscribing from chat channel");
      supabase.removeChannel(channel);
    };
  }, [user]);

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
    // Replace @mentions with highlighted spans
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

    setSending(true);
    const messageText = newMessage.trim();
    
    const { data, error } = await supabase
      .from("chat_messages")
      .insert({
        user_id: user.id,
        message: messageText,
      })
      .select()
      .single();

    if (!error && data) {
      setNewMessage("");
      
      // Send notifications to all team members
      await notifyChatMessage(
        user.id,
        user.full_name || user.email,
        messageText,
        data.id
      );
    } else if (error) {
      alert("Failed to send message: " + error.message);
    }
    setSending(false);
  };

  if (!user || user.role === "client") {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            Chat is only available for admins, project managers, and employees.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)]">
      <Card className="flex-1 flex flex-col">
        <CardHeader>
          <CardTitle>Team Chat</CardTitle>
          <p className="text-sm text-muted-foreground">
            Internal chat for admins, PMs, and employees
          </p>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col gap-4">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-4">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-muted-foreground">
                  No messages yet. Start the conversation!
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isOwn = msg.user_id === user.id;
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${isOwn ? "flex-row-reverse" : ""}`}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={msg.user?.avatar_url} />
                      <AvatarFallback>
                        {msg.user?.full_name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`flex-1 ${isOwn ? "text-right" : ""}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <p className={`text-xs font-medium ${isOwn ? "order-2" : ""}`}>
                          {isOwn ? "You" : msg.user?.full_name}
                        </p>
                        <p className={`text-xs text-muted-foreground ${isOwn ? "order-1" : ""}`}>
                          {format(new Date(msg.created_at), "MMM d, h:mm a")}
                        </p>
                      </div>
                      <div
                        className={`inline-block max-w-[70%] p-3 rounded-lg ${
                          isOwn
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {renderMessage(msg.message)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="relative">
            {/* Mention suggestions */}
            {showMentions && filteredUsers.length > 0 && (
              <div className="absolute bottom-full mb-2 w-full bg-popover border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {filteredUsers.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => selectMention(u)}
                    className="w-full flex items-center gap-3 px-4 py-2 hover:bg-accent text-left"
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={u.avatar_url} />
                      <AvatarFallback>{u.full_name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{u.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {u.email}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={handleSend} className="flex gap-2">
              <Input
                ref={inputRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message... (use @ to mention someone)"
                disabled={sending}
                className="flex-1"
              />
              <Button type="submit" disabled={sending || !newMessage.trim()}>
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
