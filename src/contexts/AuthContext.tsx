import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type ClientRole = "client" | "admin" | "fournisseur";

export interface ClientProfile {
  id: string;
  role: ClientRole;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  address: string;
  reminder_sms: boolean;
  reminder_email: boolean;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  clientProfile: ClientProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isFournisseur: boolean;
  signInWithOtp: (email: string, name?: { first_name?: string; last_name?: string }) => Promise<{ error: string | null }>;
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithPassword: (email: string, password: string, name?: { first_name?: string; last_name?: string }) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [clientProfile, setClientProfile] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string) => {
    const { data } = await supabase.from("client_profiles").select("*").eq("id", userId).maybeSingle();
    setClientProfile(data ? (data as unknown as ClientProfile) : null);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) loadProfile(data.session.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        setLoading(true);
        loadProfile(newSession.user.id).finally(() => setLoading(false));
      } else {
        setClientProfile(null);
        setLoading(false);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [loadProfile]);

  const signInWithOtp = useCallback(async (email: string, name?: { first_name?: string; last_name?: string }) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        data: name,
        emailRedirectTo: window.location.origin,
      },
    });
    return { error: error?.message || null };
  }, []);

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message || null };
  }, []);

  const signUpWithPassword = useCallback(async (email: string, password: string, name?: { first_name?: string; last_name?: string }) => {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: name, emailRedirectTo: window.location.origin },
    });
    if (error) return { error: error.message, needsConfirmation: false };
    // Si la confirmation par email est activée côté Supabase, la session n'est pas immédiate.
    return { error: null, needsConfirmation: !data.session };
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error: error?.message || null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user) await loadProfile(session.user.id);
  }, [session, loadProfile]);

  const role = clientProfile?.role;

  return (
    <AuthContext.Provider value={{
      session,
      user: session?.user || null,
      clientProfile,
      loading,
      isAdmin: role === "admin" || role === "fournisseur",
      isFournisseur: role === "fournisseur",
      signInWithOtp,
      signInWithPassword,
      signUpWithPassword,
      resetPassword,
      signOut,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
