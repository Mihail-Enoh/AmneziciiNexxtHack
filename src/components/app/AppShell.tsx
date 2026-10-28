import { IntakeBanner } from "./IntakeBanner";
import { Link, useLocation } from "@tanstack/react-router";
import { HeartHandshake, HeartPulse, LayoutDashboard, SlidersHorizontal, Users, ClipboardCheck, BookOpen, LogIn, LogOut, Menu, ArrowUpRight, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { LanguageSwitch, SettingsMenu } from "./Preferences";
import { t, useT } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";

const NAV = [
  { to: "/plan", label: "Planul meu", short: "Plan", icon: LayoutDashboard },
  { to: "/scenarii", label: "Scenarii", short: "Scenarii", icon: SlidersHorizontal },
  { to: "/familie", label: "Familie", short: "Familie", icon: Users },
  { to: "/rezumat", label: "Planul final", short: "Final", icon: ClipboardCheck },
  { to: "/sanatate", label: "Sănătate și obiceiuri", short: "Sănătate", icon: HeartPulse },
  { to: "/cum-functioneaza", label: "Cum funcționează", short: "Cum funcționează", icon: BookOpen },
] as const;

export function Logo() {
  return <Link to="/" className="flex min-w-0 items-center gap-2.5 font-sans text-lg font-extrabold"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground"><HeartHandshake className="size-5" /></span><span className="truncate">Prototype123</span></Link>;
}

export function AccountButton({ expanded = false }: { expanded?: boolean }) {
  const { user, name, signOut, loading } = useAuth();
  if (loading) return <span className="h-9 w-9 shrink-0 rounded-lg bg-muted" aria-hidden />;
  if (!user) return <Button asChild variant="outline" size={expanded ? "default" : "icon"} className={expanded ? "w-full justify-start rounded-lg px-3" : "rounded-lg"} title={"Autentificare"}><Link to="/auth" aria-label={"Autentificare"}><LogIn />{expanded && "Autentificare"}</Link></Button>;
  return <div className="flex min-w-0 items-center gap-2"><Button asChild variant="ghost" className="min-w-0 flex-1 justify-start rounded-lg px-2"><Link to="/auth"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-care-soft text-care">{(name || user.email || "U").charAt(0).toUpperCase()}</span>{expanded && <span className="truncate">{name || "Contul meu"}</span>}</Link></Button>{expanded && <Button variant="ghost" size="icon" onClick={() => void signOut()} title={"Deconectare"} aria-label={"Deconectare"}><LogOut /></Button>}</div>;
}

export function PublicHeader() {
  return <header className="border-b bg-card"><div className="mx-auto grid h-18 max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4"><Logo /><div className="flex shrink-0 items-center gap-2"><LanguageSwitch /><SettingsMenu /><span className="hidden sm:block"><AccountButton /></span></div></div></header>;
}

export function AppShell({ children }: { children: ReactNode }) {
  const t = useT();
  const [menu, setMenu] = useState(false);
  const location = useLocation();
  const page = NAV.find(n => n.to === location.pathname);
  useEffect(() => { setMenu(false); }, [location.pathname]);
  const navigation = <nav className="space-y-1.5" aria-label={"Navigare principală"}>{NAV.map(n => <Button key={n.to} variant="ghost" asChild className="h-12 w-full justify-start rounded-lg px-3 text-sm font-semibold text-muted-foreground"><Link to={n.to} onClick={() => setMenu(false)} activeProps={{ className: "bg-primary-soft text-primary" }}><n.icon className="size-5 shrink-0" /><span className="min-w-0 truncate">{t(n.label)}</span></Link></Button>)}</nav>;
  return <div className="min-h-screen pb-20 md:pb-0 md:pl-64">
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r bg-card px-5 py-7 md:flex"><Logo /><div className="mb-4 mt-10 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{"SPAȚIUL FAMILIEI"}</div>{navigation}<div className="mt-auto space-y-3 border-t pt-5"><SettingsMenu expanded /><AccountButton expanded /><div className="flex items-center justify-between px-3 pt-2"><span className="text-xs font-medium text-muted-foreground">{"Limba"}</span><LanguageSwitch /></div></div></aside>
    <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur"><div className="mx-auto grid h-18 max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 sm:px-7"><div className="flex min-w-0 items-center gap-3"><Button variant="ghost" size="icon" className="shrink-0 rounded-lg md:hidden" aria-label={"Deschide meniul"} onClick={() => setMenu(true)}><Menu /></Button><span className="truncate text-sm font-semibold text-muted-foreground">{page ? t(page.label) : "Prototype123"}</span></div><div className="flex shrink-0 items-center gap-2"><LanguageSwitch /><span className="md:hidden"><SettingsMenu /></span><span className="hidden sm:block"><Button asChild variant="ghost" size="sm"><Link to="/start">{"Actualizează datele"}<ArrowUpRight /></Link></Button></span></div></div></header>
    <main className="app-content mx-auto max-w-6xl px-4 py-7 sm:px-7 sm:py-10"><IntakeBanner />{children}</main>
    <nav className="mobile-nav fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t bg-card md:hidden" aria-label={"Navigare mobilă"}>{NAV.slice(0, 4).map(n => <Link key={n.to} to={n.to} className="flex min-w-0 flex-col items-center gap-1 py-3 text-[11px] font-semibold text-muted-foreground" activeProps={{ className: "text-primary bg-primary-soft/50" }}><n.icon className="size-5 shrink-0" />{t(n.short)}</Link>)}</nav>
    {menu && <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label={"Meniu"}>
      <button type="button" className="absolute inset-0 bg-overlay" aria-label={"Închide meniul"} onClick={() => setMenu(false)} />
      <aside className="absolute inset-y-0 left-0 flex w-[min(85vw,320px)] flex-col border-r bg-card px-5 py-6 shadow-lift">
        <div className="flex items-center justify-between gap-2"><Logo /><Button variant="ghost" size="icon" className="shrink-0 rounded-lg" aria-label={"Închide meniul"} onClick={() => setMenu(false)}><X /></Button></div>
        <div className="mt-8">{navigation}</div>
        <div className="mt-auto space-y-3 border-t pt-5"><SettingsMenu expanded /><AccountButton expanded /><div className="flex items-center justify-between px-3 pt-2"><span className="text-xs font-medium text-muted-foreground">{"Limba"}</span><LanguageSwitch /></div></div>
      </aside>
    </div>}
  </div>;
}
