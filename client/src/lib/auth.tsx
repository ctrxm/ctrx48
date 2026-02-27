import { createContext, useContext, ReactNode } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "./queryClient";

type AuthUser = {
  id: string;
  username: string;
  role: string;
  reputation: number;
  isBanned: boolean;
  shadowBanned: boolean;
} | null;

const AuthContext = createContext<{
  user: AuthUser;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}>({
  user: null,
  isLoading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: user, isLoading } = useQuery<AuthUser>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (res.status === 401) return null;
        if (!res.ok) return null;
        return res.json();
      } catch {
        return null;
      }
    },
    staleTime: Infinity,
    retry: false,
  });

  const login = async (username: string, password: string) => {
    await apiRequest("POST", "/api/auth/login", { username, password });
    await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    await queryClient.refetchQueries({ queryKey: ["/api/auth/me"] });
  };

  const register = async (username: string, password: string) => {
    await apiRequest("POST", "/api/auth/register", { username, password });
    await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    await queryClient.refetchQueries({ queryKey: ["/api/auth/me"] });
  };

  const logout = async () => {
    await apiRequest("POST", "/api/auth/logout");
    await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    await queryClient.refetchQueries({ queryKey: ["/api/auth/me"] });
  };

  return (
    <AuthContext.Provider value={{ user: user ?? null, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
