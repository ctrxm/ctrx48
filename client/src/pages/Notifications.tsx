import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Bell, CheckCheck, MessageSquare, ThumbsUp, Reply, ArrowLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Link, useLocation } from "wouter";
import type { Notification } from "@shared/schema";

const TYPE_ICONS: Record<string, any> = {
  comment: MessageSquare,
  reply: Reply,
  vote: ThumbsUp,
};

export default function Notifications() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  const { data: notifications, isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    enabled: !!user,
  });

  if (!authLoading && !user) {
    setLocation("/login");
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

  const markReadMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/notifications/read/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/count"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/notifications/read-all"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/count"] });
    },
  });

  const unreadCount = notifications?.filter(n => !n.isRead).length ?? 0;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-[640px] mx-auto px-4 py-6 mobile-feed-padding">
        <Link href="/">
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground cursor-pointer mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </span>
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-foreground">Notifikasi</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{unreadCount} belum dibaca</p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 text-xs gap-1.5 rounded-xl"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              data-testid="button-mark-all-read"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Tandai semua dibaca
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-muted/50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : !notifications || notifications.length === 0 ? (
          <div className="text-center py-20">
            <Bell className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-sm font-medium text-muted-foreground">Belum ada notifikasi</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {notifications.map((notif) => {
              const Icon = TYPE_ICONS[notif.type] || Bell;
              return (
                <div
                  key={notif.id}
                  className={`flex items-start gap-3 p-3.5 rounded-xl transition-colors cursor-pointer ${
                    notif.isRead
                      ? "bg-card hover:bg-accent/50"
                      : "bg-primary/5 hover:bg-primary/8"
                  }`}
                  onClick={() => {
                    if (!notif.isRead) markReadMutation.mutate(notif.id);
                    if (notif.postId) setLocation(`/post/${notif.postId}`);
                  }}
                  data-testid={`notification-${notif.id}`}
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                    notif.isRead ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug ${notif.isRead ? "text-muted-foreground" : "text-foreground"}`}>
                      {notif.message}
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true, locale: idLocale })}
                    </p>
                  </div>
                  {!notif.isRead && (
                    <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
