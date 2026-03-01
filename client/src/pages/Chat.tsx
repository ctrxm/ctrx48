import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Header } from "@/components/Header";
import { MessageCircle, Send, Clock, Hash } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";

type ChatMessage = {
  id: string;
  roomId: string;
  userId: string;
  content: string;
  createdAt: string;
  username: string;
  avatarUrl?: string;
};

type GroupRoom = {
  id: string;
  name: string;
  slug: string;
};

function timeAgo(dateStr: string) {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return "Baru saja";
  if (diff < 3600) {
    const mins = Math.floor(diff / 60);
    return `${mins} menit lalu`;
  }
  if (diff < 86400) {
    const hours = Math.floor(diff / 3600);
    return `${hours} jam lalu`;
  }
  const days = Math.floor(diff / 86400);
  return `${days} hari lalu`;
}

export default function Chat() {
  const { user, isLoading: authLoading } = useAuth();
  const [roomId, setRoomId] = useState("global");
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { data: messages, isLoading } = useQuery<ChatMessage[]>({
    queryKey: ["/api/chat", roomId, "messages"],
    queryFn: async () => {
      const res = await fetch(`/api/chat/${roomId}/messages`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
    refetchInterval: 5000,
    enabled: !!user,
  });

  const { data: groups } = useQuery<GroupRoom[]>({
    queryKey: ["/api/groups"],
    enabled: !!user,
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/chat/messages", {
        roomId,
        content: message,
      });
      return res.json();
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/chat", roomId, "messages"] });
    },
  });

  useEffect(() => {
    if (messages && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSend = () => {
    if (!message.trim() || sendMutation.isPending) return;
    sendMutation.mutate();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-[640px] mx-auto px-4 py-6">
          <div className="h-32 bg-muted/50 rounded-md animate-pulse" />
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-[640px] mx-auto px-4 py-6">
          <div className="flex flex-col items-center justify-center py-24 text-center" data-testid="login-prompt">
            <div className="w-14 h-14 rounded-full bg-muted/60 flex items-center justify-center mb-4">
              <MessageCircle className="w-7 h-7 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-semibold text-foreground mb-1">Masuk untuk menggunakan chat</p>
            <p className="text-xs text-muted-foreground mb-4">Kamu perlu login untuk mengirim dan membaca pesan</p>
            <Link href="/login">
              <Button size="sm" data-testid="button-login">Masuk</Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const rooms = [
    { id: "global", name: "Global" },
    ...(groups?.map((g) => ({ id: g.slug, name: g.name })) ?? []),
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col h-[calc(100vh-4rem)] max-w-[640px] w-full mx-auto" data-testid="chat-container">
        <div className="px-4 pt-3 pb-2 border-b border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-bold text-foreground" data-testid="text-chat-title">Live Chat</h1>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide" data-testid="room-selector">
            {rooms.map((room) => (
              <Button
                key={room.id}
                variant={roomId === room.id ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setRoomId(room.id)}
                className="gap-1.5 shrink-0"
                data-testid={`room-tab-${room.id}`}
              >
                <Hash className="w-3.5 h-3.5" />
                {room.name}
              </Button>
            ))}
          </div>
        </div>

        <div className="px-4 py-1.5 bg-muted/30 border-b border-border/30">
          <p className="text-xs text-muted-foreground flex items-center gap-1" data-testid="text-ephemeral-notice">
            <Clock className="w-3 h-3" />
            Pesan akan hilang dalam 6 jam
          </p>
        </div>

        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
          data-testid="messages-list"
        >
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted/50 animate-pulse shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-24 bg-muted/50 rounded animate-pulse" />
                    <div className="h-4 w-48 bg-muted/50 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : !messages || messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center" data-testid="empty-chat">
              <MessageCircle className="w-12 h-12 text-muted-foreground/20 mb-4" />
              <p className="text-sm font-medium text-muted-foreground">Belum ada pesan</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Jadilah yang pertama mengirim pesan</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className="flex items-start gap-3"
                data-testid={`message-${msg.id}`}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center text-white text-xs font-bold uppercase shrink-0" data-testid={`avatar-${msg.id}`}>
                  {msg.avatarUrl ? (
                    <img src={msg.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    msg.username[0]
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground" data-testid={`username-${msg.id}`}>
                      {msg.username}
                    </span>
                    <span className="text-[11px] text-muted-foreground" data-testid={`timestamp-${msg.id}`}>
                      {timeAgo(msg.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/90 break-words whitespace-pre-wrap" data-testid={`content-${msg.id}`}>
                    {msg.content}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="px-4 py-3 border-t border-border/50 bg-card/50 mobile-feed-padding" data-testid="chat-input-area">
          <div className="flex items-center gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tulis pesan..."
              maxLength={500}
              disabled={sendMutation.isPending}
              data-testid="input-message"
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!message.trim() || sendMutation.isPending}
              data-testid="button-send"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
