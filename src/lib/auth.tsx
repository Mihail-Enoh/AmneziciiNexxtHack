import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const AuthContext = createContext<{ user: User | null; name: string; loading: boolean; signOut: () => Promise<void> }>({ user: null, name: "", loading: true, signOut: async () => {} });
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();
  const router = useRouter();
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      const { data } = await supabase.auth.getUser();
      if (!active) return;
      setUser(data.user);
      setName("");
      setLoading(false);
      if (data.user) {
        const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", data.user.id).maybeSingle();
        if (active) setName(profile?.display_name ?? "");
      }
    };
    const { data: subscriber } = supabase.auth.onAuthStateChange(event => {
      if (!["SIGNED_IN", "SIGNED_OUT", "USER_UPDATED"].includes(event)) return;
      if (event === "SIGNED_OUT") { setUser(null); setName(""); }
      else { setTimeout(() => { void refresh(); }, 0); void queryClient.invalidateQueries(); }
      void router.invalidate();
    });
    void refresh();
    return () => { active = false; subscriber.subscription.unsubscribe(); };
  }, [queryClient, router]);
  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    await router.navigate({ to: "/auth", replace: true });
  };
  return <AuthContext.Provider value={{ user, name, loading, signOut }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);