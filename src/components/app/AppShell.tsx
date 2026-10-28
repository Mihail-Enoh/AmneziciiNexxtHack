import { Link } from "@tanstack/react-router";
import { HeartHandshake, LayoutDashboard, SlidersHorizontal, Users, ClipboardCheck } from "lucide-react";
import type { ReactNode } from "react";
import { usePlan } from "@/lib/store";

const NAV = [
  { to: "/plan", label: "Planul meu", short: "Plan", icon: LayoutDashboard },
  { to: "/scenarii", label: "Scenarii", short: "Scenarii", icon: SlidersHorizontal },
  { to: "/familie", label: "Familie", short: "Familie", icon: Users },
  { to: "/rezumat", label: "Planul final", short: "Final", icon: ClipboardCheck },
] as const;

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 font-display text-xl font-semibold">
      <span className="grid size-8 place-items-center rounded-xl bg-primary text-primary-foreground"><HeartHandshake className="size-4.5" /></span>
      Prototype123
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const plan = usePlan();
  return (
    <div className="min-h-screen pb-24 md:pb-0">
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex" aria-label="Navigare principală">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground" activeProps={{ className: "bg-primary-soft text-primary" }}>
                {n.label}
              </Link>
            ))}
            <Link to="/cum-functioneaza" className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground" activeProps={{ className: "bg-primary-soft text-primary" }}>Cum funcționează</Link>
          </nav>
          <div className="flex items-center gap-2">
            <span className="hidden rounded-full border px-2 py-1 text-xs font-semibold sm:inline" title="Versiunea în engleză urmează">RO</span>
            <span className="grid size-9 place-items-center rounded-full bg-care-soft text-sm font-bold text-care" aria-label={`Profil: ${plan.user.name}`}>{plan.user.name.charAt(0)}</span>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-10">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t bg-card md:hidden" aria-label="Navigare mobilă">
        {NAV.map((n) => (
          <Link key={n.to} to={n.to} className="flex flex-col items-center gap-1 py-2.5 text-xs font-medium text-muted-foreground" activeProps={{ className: "text-primary" }}>
            <n.icon className="size-5" aria-hidden />{n.short}
          </Link>
        ))}
      </nav>
    </div>
  );
}
