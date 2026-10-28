import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { PublicHeader } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
export const Route = createFileRoute("/reset-password")({ head: () => ({ meta: [{ title: "Parolă nouă — Prototype123" }, { name: "description", content: "Alege o parolă nouă pentru contul Prototype123." }, { property: "og:title", content: "Parolă nouă — Prototype123" }, { property: "og:description", content: "Recuperează accesul la contul tău." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }), component: ResetPassword });
function ResetPassword() {
  const ro = useLanguage() === "ro";
  const [valid, setValid] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { setValid(new URLSearchParams(window.location.hash.slice(1)).get("type") === "recovery"); }, []);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (password !== confirm) { setError(ro ? "Parolele nu coincid." : "Passwords don’t match."); return; }
    setBusy(true); setError("");
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) setError(ro ? "Linkul poate fi expirat. Solicită un link nou." : "The link may have expired. Request a new one."); else setDone(true);
  };
  return <><PublicHeader /><main className="mx-auto max-w-md px-5 py-14"><h1 className="text-3xl font-semibold">{ro ? "Parolă nouă" : "New password"}</h1>{done ? <p className="mt-6 text-success">{ro ? "Parola a fost actualizată." : "Your password has been updated."}</p> : valid ? <form onSubmit={submit} className="mt-8 space-y-5"><Label htmlFor="new-password">{ro ? "Parolă nouă" : "New password"}</Label><Input id="new-password" type="password" minLength={8} autoComplete="new-password" required value={password} onChange={e => setPassword(e.target.value)} /><Label htmlFor="confirm-password">{ro ? "Confirmă parola" : "Confirm password"}</Label><Input id="confirm-password" type="password" minLength={8} autoComplete="new-password" required value={confirm} onChange={e => setConfirm(e.target.value)} />{error && <p role="alert" className="text-sm text-danger">{error}</p>}<Button disabled={busy} className="w-full" type="submit">{ro ? "Salvează parola" : "Save password"}</Button></form> : <p className="mt-6 text-muted-foreground">{ro ? "Deschide linkul de recuperare primit prin email." : "Open the recovery link you received by email."}</p>}<Button asChild variant="link" className="mt-6"><Link to="/auth">{ro ? "Înapoi la cont" : "Back to account"}</Link></Button></main></>;
}