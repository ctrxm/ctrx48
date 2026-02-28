import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import NewPost from "@/pages/NewPost";
import PostDetail from "@/pages/PostDetail";
import UserProfile from "@/pages/UserProfile";
import Admin from "@/pages/Admin";
import Groups from "@/pages/Groups";
import GroupDetail from "@/pages/GroupDetail";
import Notifications from "@/pages/Notifications";
import Bookmarks from "@/pages/Bookmarks";
import Premium from "@/pages/Premium";
import Leaderboard from "@/pages/Leaderboard";
import Achievements from "@/pages/Achievements";
import Tags from "@/pages/Tags";
import Whispers from "@/pages/Whispers";
import KarmaShop from "@/pages/KarmaShop";
import DailyRecap from "@/pages/DailyRecap";
import NotFound from "@/pages/not-found";
import { useEffect } from "react";
import { Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

function ThemeInit() {
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "light") {
      document.documentElement.classList.remove("dark");
    } else if (saved === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: light)").matches === false;
      if (prefersDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
    const chaosStored = localStorage.getItem("chaosMode");
    if (chaosStored === "on") {
      document.documentElement.classList.add("chaos");
    }
  }, []);
  return null;
}

function MaintenancePage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4" data-testid="maintenance-page">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-2xl bg-gradient-brand flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary/20">
          <Wrench className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gradient mb-2">Sedang Dalam Pemeliharaan</h1>
        <p className="text-muted-foreground mb-6">
          Situs sedang dalam proses pemeliharaan untuk meningkatkan layanan. Silakan kembali beberapa saat lagi.
        </p>
        <Link href="/login">
          <Button variant="outline" size="sm" data-testid="link-login-maintenance">
            Masuk sebagai Admin
          </Button>
        </Link>
      </div>
    </div>
  );
}

function Router() {
  const { user, isLoading: authLoading } = useAuth();
  const { data: maintenance } = useQuery<{ enabled: boolean }>({
    queryKey: ["/api/maintenance"],
    staleTime: 10000,
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-1.5" data-testid="loading-indicator">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse-soft" style={{ animationDelay: "0ms" }} />
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse-soft" style={{ animationDelay: "200ms" }} />
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse-soft" style={{ animationDelay: "400ms" }} />
        </div>
      </div>
    );
  }

  const isAdmin = user?.role === "admin";
  const isMaintenance = maintenance?.enabled === true;

  if (isMaintenance && !isAdmin) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route component={MaintenancePage} />
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/trending" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/new" component={NewPost} />
      <Route path="/post/:id" component={PostDetail} />
      <Route path="/u/:username" component={UserProfile} />
      <Route path="/admin" component={Admin} />
      <Route path="/groups" component={Groups} />
      <Route path="/groups/:slug" component={GroupDetail} />
      <Route path="/notifications" component={Notifications} />
      <Route path="/bookmarks" component={Bookmarks} />
      <Route path="/premium" component={Premium} />
      <Route path="/leaderboard" component={Leaderboard} />
      <Route path="/achievements" component={Achievements} />
      <Route path="/tags" component={Tags} />
      <Route path="/whispers" component={Whispers} />
      <Route path="/karma-shop" component={KarmaShop} />
      <Route path="/recap" component={DailyRecap} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <ThemeInit />
          <Toaster />
          <Router />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
