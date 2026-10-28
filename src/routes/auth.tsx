import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PublicHeader } from "@/components/app/AppShell";
import { useLanguage } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Contul tău — Prototype123" }, { name: "description", content: "Autentificare cu email și profilul tău Prototype123." }, { property: "og:title", content: "Contul tău — Prototype123" }, { property: "og:description", content: "Intră în contul tău Prototype123." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: AuthPage,
});

function AuthPage() {
  const ro = useLanguage() === "ro";
  const { user, name, signOut } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      if (mode === "forgot") {
        const result = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
        if (result.error) throw result.error;
        setSent(true);
      } else if (mode === "signup") {
        const result = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin, data: { display_name: displayName.trim() } } });
        if (result.error) throw result.error;
        if (result.data.session) await navigate({ to: "/plan" }); else setSent(true);
      } else {
        const result = await supabase.auth.signInWithPassword({ email, password });
        if (result.error) throw result.error;
        await navigate({ to: "/plan" });
      }
    } catch { setError(ro ? "Nu am putut continua. Verifică datele și încearcă din nou; confirmă emailul înainte de autentificare." : "We couldn’t continue. Check your details and try again; confirm your email before signing in."); }
    finally { setBusy(false); }
  };
  const switchMode = (next: typeof mode) => { setMode(next); setSent(false); setError(""); };
  return <div className="min-h-screen"><PublicHeader /><main className="mx-auto max-w-md px-5 py-12 sm:py-20">
    <Link to="/plan" className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground"><ArrowLeft className="size-4" />{ro ? "Înapoi la plan" : "Back to plan"}</Link>
    <span className="grid size-12 place-items-center rounded-lg bg-primary-soft text-primary"><Mail className="size-6" /></span>
    <h1 className="mt-5 text-3xl font-semibold">{user ? (ro ? "Contul tău" : "Your account") : sent ? (ro ? "Verifică emailul" : "Check your email") : mode === "signup" ? (ro ? "Bine ai venit" : "Welcome") : mode === "forgot" ? (ro ? "Ai uitat parola?" : "Forgot your password?") : (ro ? "Ne bucurăm să te revedem" : "Good to see you again")}</h1>
    {user ? <div className="mt-6 space-y-4"><p className="text-lg font-semibold">{name}</p><p className="break-all text-muted-foreground">{user.email}</p><Button variant="outline" onClick={() => void signOut()}>{ro ? "Deconectare" : "Sign out"}</Button></div> : sent ? <div className="mt-6 space-y-5"><Check className="size-8 text-success" /><p className="leading-relaxed text-muted-foreground">{ro ? "Dacă adresa este eligibilă, vei primi un email cu linkul pentru a continua. Verifică și folderul spam." : "If the address is eligible, you’ll receive an email with a link to continue. Check your spam folder too."}</p><Button variant="outline" onClick={() => switchMode("login")}>{ro ? "Înapoi la autentificare" : "Back to sign in"}</Button></div> : <>
      <p className="mt-3 text-muted-foreground">{mode === "forgot" ? (ro ? "Îți trimitem un link pentru o parolă nouă." : "We’ll send you a link to set a new password.") : (ro ? "Un cont pentru tine și familia ta." : "An account for you and your family.")}</p>
      <form onSubmit={submit} className="mt-8 space-y-5">
        {mode === "signup" && <div className="space-y-2"><Label htmlFor="display-name">{ro ? "Nume" : "Name"}</Label><Input id="display-name" autoComplete="name" required value={displayName} onChange={e => setDisplayName(e.target.value)} /></div>}
        <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></div>
        {mode !== "forgot" && <div className="space-y-2"><Label htmlFor="password">{ro ? "Parolă" : "Password"}</Label><div className="relative"><Input id="password" type={visible ? "text" : "password"} autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={8} required value={password} onChange={e => setPassword(e.target.value)} className="pr-12" /><Button type="button" size="icon" variant="ghost" className="absolute right-1 top-1" onClick={() => setVisible(!visible)} aria-label={ro ? "Arată sau ascunde parola" : "Show or hide password"}>{visible ? <EyeOff /> : <Eye />}</Button></div>{mode === "signup" && <p className="text-xs text-muted-foreground">{ro ? "Cel puțin 8 caractere." : "At least 8 characters."}</p>}</div>}
        {error && <p role="alert" className="rounded-lg bg-danger-soft p-3 text-sm text-danger">{error}</p>}
        <Button type="submit" size="lg" className="w-full rounded-lg" disabled={busy}>{busy ? (ro ? "Se procesează…" : "Please wait…") : mode === "signup" ? (ro ? "Creează cont" : "Create account") : mode === "forgot" ? (ro ? "Trimite linkul" : "Send link") : (ro ? "Autentificare" : "Sign in")}<ArrowRight /></Button>
      </form>
      <div className="mt-5 flex flex-col items-center gap-2">{mode === "login" && <Button variant="link" onClick={() => switchMode("forgot")}>{ro ? "Ai uitat parola?" : "Forgot password?"}</Button>}<Button variant="link" onClick={() => switchMode(mode === "signup" ? "login" : "signup")}>{mode === "signup" ? (ro ? "Ai deja cont? Autentifică-te" : "Already have an account? Sign in") : (ro ? "Nu ai cont? Creează unul" : "No account? Create one")}</Button></div>
    </>}
    <p className="mt-10 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"><ShieldCheck className="size-4 shrink-0" />{ro ? "Planul financiar rămâne în acest browser. Autentificarea nu îi schimbă valorile." : "Your financial plan stays in this browser. Signing in does not change its values."}</p>
  </main></div>;
}