import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { api, demoMode, registerAccessTokenProvider } from "../lib/api";
import { supabase } from "../lib/supabase";
import type { Viewer } from "../lib/types";

interface SignUpInput {
  email: string;
  password: string;
  displayName: string;
  intent: "buyer" | "seller" | "supplier";
}
interface AuthContextValue {
  authUser: SupabaseUser | null;
  viewer: Viewer | null;
  loading: boolean;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: (intent?: SignUpInput["intent"]) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<{ confirmationRequired: boolean }>;
  signOut: () => Promise<void>;
  signOutEverywhere: () => Promise<void>;
  requestCapability: (
    capability: "SELLER" | "SUPPLIER",
    payload?: Record<string, unknown>,
  ) => Promise<void>;
  refreshViewer: () => Promise<void>;
}
const AuthContext = createContext<AuthContextValue | null>(null);
const demoUser = {
  id: "demo-user",
  email: "demo@buysell.ng",
  user_metadata: { display_name: "Ada Nwosu" },
} as unknown as SupabaseUser;
const demoViewer: Viewer = {
  id: "demo-user",
  email: "demo@buysell.ng",
  displayName: "Ada Nwosu",
  platformRoles: [],
  storeMemberships: [],
  capabilities: [{ capability: "BUYER", status: "ACTIVE" }],
  supplierProfile: null,
};
const capabilityIntentKey = "buysell:capability-intent";

function rememberIntent(intent: SignUpInput["intent"]) {
  if (intent === "buyer") sessionStorage.removeItem(capabilityIntentKey);
  else sessionStorage.setItem(capabilityIntentKey, intent.toUpperCase());
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [authUser, setAuthUser] = useState<SupabaseUser | null>(
    demoMode ? demoUser : null,
  );
  const [viewer, setViewer] = useState<Viewer | null>(
    demoMode ? demoViewer : null,
  );
  const [loading, setLoading] = useState(Boolean(supabase) && !demoMode);

  const refreshViewer = useCallback(async () => {
    if (demoMode) {
      setViewer(demoViewer);
      return;
    }
    try {
      setViewer(await api.get<Viewer>("/auth/me"));
    } catch {
      setViewer(null);
    }
  }, []);

  const requestCapability = useCallback(
    async (
      capability: "SELLER" | "SUPPLIER",
      payload: Record<string, unknown> = {},
    ) => {
      if (demoMode) {
        setViewer((current) =>
          current
            ? {
                ...current,
                capabilities: [
                  ...current.capabilities.filter(
                    (item) => item.capability !== capability,
                  ),
                  { capability, status: "PENDING" },
                ],
              }
            : current,
        );
        return;
      }
      await api.post(
        `/account/capabilities/${capability.toLowerCase()}/applications`,
        { payload },
      );
      sessionStorage.removeItem(capabilityIntentKey);
      await refreshViewer();
    },
    [refreshViewer],
  );

  useEffect(() => {
    if (demoMode || !supabase) return;
    const authClient = supabase;
    registerAccessTokenProvider(
      async () =>
        (await authClient.auth.getSession()).data.session?.access_token ?? null,
    );
    let active = true;
    void authClient.auth.getSession().then(({ data }) => {
      if (!active) return;
      const nextUser = data.session?.user ?? null;
      setAuthUser(nextUser);
      setLoading(false);
      if (nextUser) {
        void refreshViewer();
      } else setViewer(null);
    });
    const { data: listener } = authClient.auth.onAuthStateChange(
      (_event, session) => {
        if (!active) return;
        const nextUser = session?.user ?? null;
        setAuthUser(nextUser);
        setLoading(false);
        if (nextUser) setTimeout(() => void refreshViewer(), 0);
        else setViewer(null);
      },
    );
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [refreshViewer]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (demoMode) {
        setAuthUser({ ...demoUser, email } as SupabaseUser);
        setViewer({ ...demoViewer, email });
        setLoading(false);
        return;
      }
      if (!supabase)
        throw new Error(
          "Authentication is not configured. Add the Supabase URL and publishable key.",
        );
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      setAuthUser(data.user ?? null);
      setLoading(false);
      if (data.user) void refreshViewer();
    },
    [refreshViewer],
  );

  const signUp = useCallback(
    async ({ email, password, displayName, intent }: SignUpInput) => {
      if (demoMode) {
        setAuthUser({ ...demoUser, email } as SupabaseUser);
        setViewer({ ...demoViewer, email, displayName });
        setLoading(false);
        return { confirmationRequired: false };
      }
      if (!supabase)
        throw new Error(
          "Authentication is not configured. Add the Supabase URL and publishable key.",
        );
      rememberIntent(intent);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: { display_name: displayName },
        },
      });
      if (error) throw error;
      setAuthUser(data.user ?? null);
      setLoading(false);
      if (data.user) void refreshViewer();
      return { confirmationRequired: !data.session };
    },
    [refreshViewer],
  );

  const signInWithGoogle = useCallback(
    async (intent: SignUpInput["intent"] = "buyer") => {
      if (demoMode) return;
      if (!supabase)
        throw new Error(
          "Authentication is not configured. Add the Supabase URL and publishable key.",
        );
      rememberIntent(intent);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
    },
    [],
  );

  const signOut = useCallback(async () => {
    if (demoMode) {
      setAuthUser(null);
      setViewer(null);
      return;
    }
    if (!supabase) return;
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) throw error;
    setAuthUser(null);
    setViewer(null);
  }, []);

  const signOutEverywhere = useCallback(async () => {
    if (demoMode) {
      setAuthUser(null);
      setViewer(null);
      return;
    }
    if (!supabase) return;
    const { error } = await supabase.auth.signOut({ scope: "global" });
    if (error) throw error;
    setAuthUser(null);
    setViewer(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      authUser,
      viewer,
      loading,
      configured: Boolean(supabase) || demoMode,
      signIn,
      signInWithGoogle,
      signUp,
      signOut,
      signOutEverywhere,
      requestCapability,
      refreshViewer,
    }),
    [
      authUser,
      viewer,
      loading,
      signIn,
      signInWithGoogle,
      signUp,
      signOut,
      signOutEverywhere,
      requestCapability,
      refreshViewer,
    ],
  );
  return <AuthContext value={value}>{children}</AuthContext>;
}
export function useAuth() {
  const context = use(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
