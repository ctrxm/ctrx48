import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";
import {
  Wallet as WalletIcon,
  ArrowLeft,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  CheckCircle,
  XCircle,
  Banknote,
  CreditCard,
  Smartphone,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { WITHDRAWAL_METHODS } from "@shared/schema";

type WalletTransaction = {
  id: string;
  type: string;
  amount: number;
  metadata: any;
  createdAt: string;
};

type WithdrawalItem = {
  id: string;
  amount: number;
  method: string;
  accountName: string;
  accountNumber: string;
  status: string;
  adminNote: string | null;
  createdAt: string;
};

type WalletData = {
  balance: number;
  transactions: WalletTransaction[];
  withdrawals: WithdrawalItem[];
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

function getTransactionLabel(type: string) {
  switch (type) {
    case "tip_received": return "Tip Diterima";
    case "withdrawal": return "Penarikan";
    case "withdrawal_refund": return "Refund Penarikan";
    default: return type;
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case "pending":
      return <Badge variant="outline" className="gap-1 text-yellow-600 border-yellow-500/30 bg-yellow-500/10"><Clock className="w-3 h-3" />Menunggu</Badge>;
    case "approved":
      return <Badge variant="outline" className="gap-1 text-green-600 border-green-500/30 bg-green-500/10"><CheckCircle className="w-3 h-3" />Disetujui</Badge>;
    case "rejected":
      return <Badge variant="outline" className="gap-1 text-red-600 border-red-500/30 bg-red-500/10"><XCircle className="w-3 h-3" />Ditolak</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

const METHOD_ICONS: Record<string, typeof Banknote> = {
  BCA: CreditCard,
  Mandiri: CreditCard,
  BRI: CreditCard,
  BNI: CreditCard,
  GoPay: Smartphone,
  OVO: Smartphone,
  DANA: Smartphone,
  ShopeePay: Smartphone,
};

export default function Wallet() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [showWithdraw, setShowWithdraw] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [activeTab, setActiveTab] = useState<"transactions" | "withdrawals">("transactions");

  const { data: wallet, isLoading } = useQuery<WalletData>({
    queryKey: ["/api/wallet"],
    enabled: !!user,
  });

  const withdrawMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/wallet/withdraw", {
        amount: parseInt(amount, 10),
        method,
        accountName,
        accountNumber,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Berhasil", description: "Permintaan penarikan berhasil diajukan" });
      setShowWithdraw(false);
      setAmount("");
      setMethod("");
      setAccountName("");
      setAccountNumber("");
      queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
    onError: (err: Error) => {
      toast({ title: "Gagal", description: err.message, variant: "destructive" });
    },
  });

  useEffect(() => {
    if (!authLoading && !user) setLocation("/login");
  }, [authLoading, user, setLocation]);

  if (!authLoading && !user) return null;

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
            <WalletIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground" data-testid="text-page-title">Dompet</h1>
            <p className="text-sm text-muted-foreground">Saldo dan riwayat transaksi</p>
          </div>
        </div>

        {isLoading || authLoading ? (
          <div className="space-y-3">
            <div className="h-28 bg-card rounded-xl animate-pulse" />
            <div className="h-16 bg-card rounded-xl animate-pulse" />
            <div className="h-16 bg-card rounded-xl animate-pulse" />
          </div>
        ) : (
          <>
            <Card className="p-5 mb-4" data-testid="card-balance">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Saldo Dompet</p>
                  <p className="text-3xl font-bold text-foreground" data-testid="text-balance">
                    Rp {(wallet?.balance ?? 0).toLocaleString("id-ID")}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Banknote className="w-6 h-6 text-primary" />
                </div>
              </div>
              <Button
                className="w-full mt-4 gap-2"
                onClick={() => setShowWithdraw(!showWithdraw)}
                disabled={(wallet?.balance ?? 0) < 10000}
                data-testid="button-toggle-withdraw"
              >
                <ArrowUpRight className="w-4 h-4" />
                {showWithdraw ? "Tutup" : "Tarik Saldo"}
              </Button>
              {(wallet?.balance ?? 0) < 10000 && (
                <p className="text-xs text-muted-foreground text-center mt-2">Minimum penarikan Rp 10.000</p>
              )}
            </Card>

            {showWithdraw && (
              <Card className="p-4 mb-4" data-testid="form-withdraw">
                <h3 className="text-sm font-semibold text-foreground mb-3">Tarik Saldo</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Jumlah (Rp)</label>
                    <Input
                      type="number"
                      placeholder="10000"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      min={10000}
                      max={wallet?.balance ?? 0}
                      data-testid="input-amount"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Metode Penarikan</label>
                    <Select value={method} onValueChange={setMethod}>
                      <SelectTrigger data-testid="select-method">
                        <SelectValue placeholder="Pilih metode" />
                      </SelectTrigger>
                      <SelectContent>
                        {WITHDRAWAL_METHODS.map((m) => {
                          const Icon = METHOD_ICONS[m] || CreditCard;
                          return (
                            <SelectItem key={m} value={m} data-testid={`option-method-${m}`}>
                              <span className="flex items-center gap-2">
                                <Icon className="w-3.5 h-3.5" />
                                {m}
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Nama Pemilik Rekening</label>
                    <Input
                      placeholder="Nama lengkap"
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      data-testid="input-account-name"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Nomor Rekening / HP</label>
                    <Input
                      placeholder="08123456789"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      data-testid="input-account-number"
                    />
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        className="w-full"
                        disabled={
                          !amount || !method || !accountName || !accountNumber ||
                          parseInt(amount, 10) < 10000 ||
                          parseInt(amount, 10) > (wallet?.balance ?? 0) ||
                          withdrawMutation.isPending
                        }
                        data-testid="button-submit-withdraw"
                      >
                        {withdrawMutation.isPending ? "Memproses..." : "Ajukan Penarikan"}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Konfirmasi Penarikan</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tarik <strong>Rp {parseInt(amount || "0", 10).toLocaleString("id-ID")}</strong> ke <strong>{method}</strong> ({accountNumber})? Saldo akan dikurangi setelah diproses.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel data-testid="button-cancel-withdraw">Batal</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => withdrawMutation.mutate()}
                          data-testid="button-confirm-withdraw"
                        >
                          Tarik Sekarang
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </Card>
            )}

            <div className="flex gap-1 mb-4">
              <Button
                variant={activeTab === "transactions" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setActiveTab("transactions")}
                data-testid="tab-transactions"
              >
                Riwayat
              </Button>
              <Button
                variant={activeTab === "withdrawals" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setActiveTab("withdrawals")}
                className="gap-1.5"
                data-testid="tab-withdrawals"
              >
                Penarikan
                {(wallet?.withdrawals?.filter(w => w.status === "pending").length ?? 0) > 0 && (
                  <Badge variant="destructive" className="text-[10px] px-1.5 no-default-active-elevate">
                    {wallet!.withdrawals.filter(w => w.status === "pending").length}
                  </Badge>
                )}
              </Button>
            </div>

            {activeTab === "transactions" ? (
              (wallet?.transactions?.length ?? 0) === 0 ? (
                <div className="text-center py-16" data-testid="empty-transactions">
                  <WalletIcon className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Belum ada transaksi</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {wallet!.transactions.map((tx) => (
                    <Card key={tx.id} className="p-3" data-testid={`tx-card-${tx.id}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          tx.amount > 0 ? "bg-green-500/10" : "bg-red-500/10"
                        }`}>
                          {tx.amount > 0 ? (
                            <ArrowDownLeft className="w-4 h-4 text-green-500" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4 text-red-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground" data-testid={`tx-label-${tx.id}`}>
                            {getTransactionLabel(tx.type)}
                          </p>
                          <p className="text-xs text-muted-foreground">{timeAgo(tx.createdAt)}</p>
                        </div>
                        <span className={`text-sm font-bold ${tx.amount > 0 ? "text-green-600" : "text-red-500"}`} data-testid={`tx-amount-${tx.id}`}>
                          {tx.amount > 0 ? "+" : ""}Rp {Math.abs(tx.amount).toLocaleString("id-ID")}
                        </span>
                      </div>
                    </Card>
                  ))}
                </div>
              )
            ) : (
              (wallet?.withdrawals?.length ?? 0) === 0 ? (
                <div className="text-center py-16" data-testid="empty-withdrawals">
                  <Banknote className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Belum ada penarikan</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {wallet!.withdrawals.map((w) => (
                    <Card key={w.id} className="p-3" data-testid={`wd-card-${w.id}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-bold text-foreground" data-testid={`wd-amount-${w.id}`}>
                              Rp {w.amount.toLocaleString("id-ID")}
                            </span>
                            {getStatusBadge(w.status)}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {w.method} — {w.accountNumber}
                          </p>
                          <p className="text-xs text-muted-foreground">{timeAgo(w.createdAt)}</p>
                          {w.adminNote && (
                            <p className="text-xs text-muted-foreground mt-1 italic">Catatan: {w.adminNote}</p>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )
            )}
          </>
        )}
      </main>
    </div>
  );
}
