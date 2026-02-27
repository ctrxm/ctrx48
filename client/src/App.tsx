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
import NotFound from "@/pages/not-found";
import { useEffect } from "react";
import { Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

function ThemeInit() {
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
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
        <h1 className="text-2xl font-bold text-foreground mb-2">Sedang Dalam Pemeliharaan</h1>
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
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
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
