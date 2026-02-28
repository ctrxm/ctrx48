import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Header } from "@/components/Header";
import { Ghost, ArrowLeft, Send, Eye, EyeOff, Clock } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

type WhisperItem = {
  id: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  direction: "received" | "sent";
  fromUsername?: string;
  toUsername?: string;
};

function timeAgo(dateStr: string) {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return "Baru saja";
  if (diff < 3600) return `${Math.floor(diff / 60)}m lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}j lalu`;
  return `${Math.floor(diff / 86400)}h lalu`;
}

export default function Whispers() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"received" | "sent">("received");
  const [showForm, setShowForm] = useState(false);
  const [toUsername, setToUsername] = useState("");
  const [content, setContent] = useState("");

  const { data: whispers, isLoading } = useQuery<WhisperItem[]>({
    queryKey: ["/api/whispers"],
    enabled: !!user,
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/whispers", { toUsername, content });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Bisikan terkirim", description: "Pesan anonim berhasil dikirim" });
      setToUsername("");
      setContent("");
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ["/api/whispers"] });
    },
    onError: (err: Error) => {
      toast({ title: "Gagal mengirim", description: err.message, variant: "destructive" });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PATCH", `/api/whispers/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/whispers"] });
    },
  });

  useEffect(() => {
    if (!authLoading && !user) {
      setLocation("/login");
    }
  }, [authLoading, user, setLocation]);

  if (!authLoading && !user) {
    return null;
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-[640px] mx-auto px-4 py-6">
          <div className="h-32 bg-muted/50 rounded-xl animate-pulse" />
        </main>
      </div>
    );
  }

  const received = whispers?.filter((w) => w.direction === "received") ?? [];
  const sent = whispers?.filter((w) => w.direction === "sent") ?? [];
  const activeList = activeTab === "received" ? received : sent;

  const handleMarkRead = (whisper: WhisperItem) => {
    if (whisper.direction === "received" && !whisper.isRead) {
      markReadMutation.mutate(whisper.id);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-[640px] mx-auto px-4 py-6 mobile-feed-padding">
        <Link href="/">
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground cursor-pointer mb-4 transition-colors" data-testid="link-back">
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </span>
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-brand flex items-center justify-center shadow-lg shadow-primary/20">
            <Ghost className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground" data-testid="text-page-title">Bisikan Anonim</h1>
            <p className="text-sm text-muted-foreground">Pesan rahasia antar pengguna</p>
          </div>
        </div>

        <Button
          onClick={() => setShowForm(!showForm)}
          className="w-full mb-4 gap-2"
          data-testid="button-toggle-form"
        >
          <Send className="w-4 h-4" />
          {showForm ? "Tutup Form" : "Kirim Bisikan"}
        </Button>

        {showForm && (
          <Card className="p-4 mb-4" data-testid="form-send-whisper">
            <div className="space-y-3">
              <div>
                <Input
                  placeholder="Username penerima"
                  value={toUsername}
                  onChange={(e) => setToUsername(e.target.value)}
                  data-testid="input-recipient"
                />
              </div>
              <div>
                <Textarea
                  placeholder="Tulis bisikan anonim..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  maxLength={280}
                  className="resize-none"
                  data-testid="input-content"
                />
                <p className="text-xs text-muted-foreground mt-1 text-right">
                  {content.length}/280
                </p>
              </div>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  1x per hari per orang
                </p>
                <Button
                  size="sm"
                  onClick={() => sendMutation.mutate()}
                  disabled={!toUsername.trim() || !content.trim() || sendMutation.isPending}
                  data-testid="button-send"
                >
                  {sendMutation.isPending ? "Mengirim..." : "Kirim"}
                </Button>
              </div>
            </div>
          </Card>
        )}

        <div className="flex gap-1 mb-4">
          <Button
            variant={activeTab === "received" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("received")}
            className="gap-1.5"
            data-testid="tab-received"
          >
            Diterima
            {received.filter((w) => !w.isRead).length > 0 && (
              <Badge variant="destructive" className="text-[10px] px-1.5 no-default-active-elevate">
                {received.filter((w) => !w.isRead).length}
              </Badge>
            )}
          </Button>
          <Button
            variant={activeTab === "sent" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("sent")}
            data-testid="tab-sent"
          >
            Terkirim
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-muted/50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : activeList.length === 0 ? (
          <div className="text-center py-20" data-testid="empty-state">
            <Ghost className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-sm font-medium text-muted-foreground">Belum ada bisikan...</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              {activeTab === "received"
                ? "Bisikan anonim yang diterima akan muncul di sini"
                : "Bisikan yang kamu kirim akan muncul di sini"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {activeList.map((whisper) => (
              <Card
                key={whisper.id}
                className={`p-4 cursor-pointer transition-colors ${
                  whisper.direction === "received" && !whisper.isRead
                    ? "border-primary/30 bg-primary/5"
                    : ""
                }`}
                onClick={() => handleMarkRead(whisper)}
                data-testid={`whisper-card-${whisper.id}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground whitespace-pre-wrap break-words" data-testid={`whisper-content-${whisper.id}`}>
                      {whisper.content}
                    </p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="text-xs text-muted-foreground" data-testid={`whisper-time-${whisper.id}`}>
                        {timeAgo(whisper.createdAt)}
                      </span>
                      {whisper.direction === "received" && whisper.fromUsername && (
                        <span className="text-xs text-muted-foreground/60">
                          dari seseorang
                        </span>
                      )}
                      {whisper.direction === "sent" && whisper.toUsername && (
                        <span className="text-xs text-muted-foreground/60">
                          ke @{whisper.toUsername}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0">
                    {whisper.direction === "received" ? (
                      whisper.isRead ? (
                        <Eye className="w-4 h-4 text-muted-foreground/40" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-primary" />
                      )
                    ) : (
                      <Send className="w-4 h-4 text-muted-foreground/40" />
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
