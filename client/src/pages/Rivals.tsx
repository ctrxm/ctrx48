import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Header } from "@/components/Header";
import { SidebarWidget } from "@/components/SidebarWidget";
import { Swords, Users, Timer, ThumbsUp, Plus, Trophy, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

type RivalDuel = {
  id: string;
  challengerId: string;
  opponentId: string;
  challengerUsername: string;
  opponentUsername: string;
  topic: string;
  challengerArgument: string | null;
  opponentArgument: string | null;
  challengerVotes: number;
  opponentVotes: number;
  status: string;
  winnerId: string | null;
  winnerUsername?: string | null;
  rewardKarma: number;
  expiresAt: string;
  createdAt: string;
  userVote?: string | null;
};

function timeRemaining(expiresAt: string) {
  const now = new Date();
  const expires = new Date(expiresAt);
  const diff = expires.getTime() - now.getTime();
  if (diff <= 0) return "Waktu habis";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 24) return `${Math.floor(hours / 24)}h ${hours % 24}j lagi`;
  if (hours > 0) return `${hours}j ${minutes}m lagi`;
  return `${minutes}m lagi`;
}

function statusBadge(status: string) {
  switch (status) {
    case "pending":
      return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30 no-default-active-elevate" data-testid="badge-status-pending">Menunggu</Badge>;
    case "active":
      return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30 no-default-active-elevate" data-testid="badge-status-active">Aktif</Badge>;
    case "completed":
      return <Badge variant="outline" className="bg-muted text-muted-foreground border-border no-default-active-elevate" data-testid="badge-status-completed">Selesai</Badge>;
    default:
      return <Badge variant="outline" className="no-default-active-elevate">{status}</Badge>;
  }
}

export default function Rivals() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [opponentUsername, setOpponentUsername] = useState("");
  const [topic, setTopic] = useState("");
  const [argument, setArgument] = useState("");

  const { data: rivals, isLoading } = useQuery<RivalDuel[]>({
    queryKey: ["/api/rivals"],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/rivals", {
        opponentUsername,
        topic,
        challengerArgument: argument,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Duel dibuat!", description: "Tantangan duel berhasil dikirim" });
      setOpponentUsername("");
      setTopic("");
      setArgument("");
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/rivals"] });
    },
    onError: (err: Error) => {
      toast({ title: "Gagal membuat duel", description: err.message, variant: "destructive" });
    },
  });

  const voteMutation = useMutation({
    mutationFn: async ({ rivalId, votedFor }: { rivalId: string; votedFor: string }) => {
      const res = await apiRequest("POST", `/api/rivals/${rivalId}/vote`, { votedFor });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Vote berhasil!" });
      queryClient.invalidateQueries({ queryKey: ["/api/rivals"] });
    },
    onError: (err: Error) => {
      toast({ title: "Gagal vote", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-4 sm:py-6">
        <div className="flex gap-6">
          <div className="flex-1 min-w-0 max-w-[640px] mx-auto lg:mx-0">
            <Link href="/">
              <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground cursor-pointer mb-4 transition-colors" data-testid="link-back">
                <ArrowLeft className="w-4 h-4" />
                Kembali
              </span>
            </Link>

            <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-brand flex items-center justify-center shadow-lg shadow-primary/20">
                  <Swords className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground" data-testid="text-page-title">Arena Duel</h1>
                  <p className="text-sm text-muted-foreground">Duel opini antar pengguna</p>
                </div>
              </div>

              {user && (
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2" data-testid="button-create-duel">
                      <Plus className="w-4 h-4" />
                      Tantang Duel
                    </Button>
                  </DialogTrigger>
                  <DialogContent data-testid="dialog-create-duel">
                    <DialogHeader>
                      <DialogTitle>Tantang Duel Baru</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-2">
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1.5 block">Username Lawan</label>
                        <Input
                          placeholder="Masukkan username lawan"
                          value={opponentUsername}
                          onChange={(e) => setOpponentUsername(e.target.value)}
                          data-testid="input-opponent-username"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1.5 block">Topik Duel</label>
                        <Input
                          placeholder="Topik yang ingin didebatkan"
                          value={topic}
                          onChange={(e) => setTopic(e.target.value)}
                          data-testid="input-topic"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1.5 block">Argumen Kamu</label>
                        <Textarea
                          placeholder="Tulis argumen kamu tentang topik ini..."
                          value={argument}
                          onChange={(e) => setArgument(e.target.value)}
                          className="resize-none"
                          maxLength={500}
                          data-testid="input-argument"
                        />
                        <p className="text-xs text-muted-foreground mt-1 text-right">{argument.length}/500</p>
                      </div>
                      <Button
                        className="w-full gap-2"
                        onClick={() => createMutation.mutate()}
                        disabled={!opponentUsername.trim() || !topic.trim() || createMutation.isPending}
                        data-testid="button-submit-duel"
                      >
                        {createMutation.isPending ? "Mengirim..." : "Kirim Tantangan"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-40 bg-muted/50 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : !rivals || rivals.length === 0 ? (
              <div className="text-center py-20" data-testid="empty-state">
                <Swords className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
                <p className="text-sm font-medium text-muted-foreground">Belum ada duel...</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Tantang seseorang untuk memulai duel opini!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {rivals.map((duel) => {
                  const totalVotes = duel.challengerVotes + duel.opponentVotes;
                  const challengerPercent = totalVotes > 0 ? Math.round((duel.challengerVotes / totalVotes) * 100) : 50;
                  const opponentPercent = totalVotes > 0 ? 100 - challengerPercent : 50;
                  const isCompleted = duel.status === "completed";
                  const challengerWon = isCompleted && duel.winnerId === duel.challengerId;
                  const opponentWon = isCompleted && duel.winnerId === duel.opponentId;

                  return (
                    <Card key={duel.id} className="p-4" data-testid={`duel-card-${duel.id}`}>
                      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                        <h3 className="text-sm font-semibold text-foreground flex-1 min-w-0" data-testid={`duel-topic-${duel.id}`}>
                          {duel.topic}
                        </h3>
                        <div className="flex items-center gap-2 flex-wrap">
                          {statusBadge(duel.status)}
                          {!isCompleted && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1" data-testid={`duel-timer-${duel.id}`}>
                              <Timer className="w-3 h-3" />
                              {timeRemaining(duel.expiresAt)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 mb-3">
                        <div className={`flex-1 text-center p-3 rounded-lg border ${challengerWon ? "border-green-500/50 bg-green-500/5" : "border-border"}`}>
                          <div className="flex items-center justify-center gap-1 mb-1">
                            {challengerWon && <Trophy className="w-3.5 h-3.5 text-green-500" />}
                            <p className={`text-sm font-semibold ${challengerWon ? "text-green-600" : "text-foreground"}`} data-testid={`duel-challenger-${duel.id}`}>
                              @{duel.challengerUsername}
                            </p>
                          </div>
                          {duel.challengerArgument && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{duel.challengerArgument}</p>
                          )}
                          <div className="flex items-center justify-center gap-1 mt-2">
                            <ThumbsUp className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs font-medium text-muted-foreground" data-testid={`duel-challenger-votes-${duel.id}`}>
                              {duel.challengerVotes} ({challengerPercent}%)
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col items-center shrink-0">
                          <span className="text-xs font-bold text-muted-foreground">VS</span>
                        </div>

                        <div className={`flex-1 text-center p-3 rounded-lg border ${opponentWon ? "border-green-500/50 bg-green-500/5" : "border-border"}`}>
                          <div className="flex items-center justify-center gap-1 mb-1">
                            {opponentWon && <Trophy className="w-3.5 h-3.5 text-green-500" />}
                            <p className={`text-sm font-semibold ${opponentWon ? "text-green-600" : "text-foreground"}`} data-testid={`duel-opponent-${duel.id}`}>
                              @{duel.opponentUsername}
                            </p>
                          </div>
                          {duel.opponentArgument && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{duel.opponentArgument}</p>
                          )}
                          <div className="flex items-center justify-center gap-1 mt-2">
                            <ThumbsUp className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs font-medium text-muted-foreground" data-testid={`duel-opponent-votes-${duel.id}`}>
                              {duel.opponentVotes} ({opponentPercent}%)
                            </span>
                          </div>
                        </div>
                      </div>

                      {totalVotes > 0 && (
                        <div className="w-full h-1.5 bg-muted rounded-full mb-3 flex overflow-hidden" data-testid={`duel-progress-${duel.id}`}>
                          <div className="bg-primary h-full transition-all" style={{ width: `${challengerPercent}%` }} />
                          <div className="bg-muted-foreground/30 h-full transition-all" style={{ width: `${opponentPercent}%` }} />
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Users className="w-3 h-3" />
                          <span data-testid={`duel-total-votes-${duel.id}`}>{totalVotes} vote</span>
                          <span>|</span>
                          <span>{duel.rewardKarma} karma</span>
                        </div>

                        {user && duel.status === "active" && !duel.userVote && (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => voteMutation.mutate({ rivalId: duel.id, votedFor: duel.challengerId })}
                              disabled={voteMutation.isPending}
                              data-testid={`button-vote-challenger-${duel.id}`}
                            >
                              @{duel.challengerUsername}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => voteMutation.mutate({ rivalId: duel.id, votedFor: duel.opponentId })}
                              disabled={voteMutation.isPending}
                              data-testid={`button-vote-opponent-${duel.id}`}
                            >
                              @{duel.opponentUsername}
                            </Button>
                          </div>
                        )}

                        {duel.userVote && (
                          <Badge variant="secondary" className="text-xs no-default-active-elevate" data-testid={`badge-voted-${duel.id}`}>
                            Sudah vote
                          </Badge>
                        )}

                        {isCompleted && duel.winnerUsername && (
                          <Badge variant="default" className="text-xs no-default-active-elevate" data-testid={`badge-winner-${duel.id}`}>
                            <Trophy className="w-3 h-3 mr-1" />
                            Pemenang: @{duel.winnerUsername}
                          </Badge>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          <aside className="hidden lg:block w-80 shrink-0">
            <div className="sticky top-16">
              <SidebarWidget />
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
