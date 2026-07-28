import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { supabase, getCurrentUserId } from "./supabase";
import type { Profile } from "./supabase-types";
import { initializeUserCrypto } from "./crypto";

interface AuthUser {
  id: string;
  name: string;
  email: string;
  profile: Profile | null;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthUser | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from Supabase session on mount
  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        // Fetch the user's profile from the profiles table
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();

        const p = profile as any;
        setUser({
          id: session.user.id,
          name: p?.name ?? session.user.email?.split("@")[0] ?? "User",
          email: session.user.email ?? "",
          profile: p ?? null,
        });
      }

      setIsLoading(false);
    };

    init();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const { data: profileRaw } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();

        const p2 = profileRaw as any;
        setUser({
          id: session.user.id,
          name: p2?.name ?? session.user.email?.split("@")[0] ?? "User",
          email: session.user.email ?? "",
          profile: p2 ?? null,
        });
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const setUserFromSession = useCallback(async (session: any) => {
    if (!session?.user) {
      setUser(null);
      return;
    }
    const { data: profileRaw } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();
    const p = profileRaw as any;
    setUser({
      id: session.user.id,
      name: p?.name ?? session.user.email?.split("@")[0] ?? "User",
      email: session.user.email ?? "",
      profile: p ?? null,
    });
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    // Immediately set user from response so isAuthenticated is true right away
    await setUserFromSession(data?.session);
  }, [setUserFromSession]);

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
        },
      });
      if (error) throw error;
      // Set user from the session response immediately
      await setUserFromSession(data?.session);

      // Initialize crypto for the new user (key pair + shadow friends)
      if (data?.session?.user?.id) {
        initializeUserCrypto(data.session.user.id);
      }
    },
    [setUserFromSession]
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: user !== null,
        isLoading,
        user,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
