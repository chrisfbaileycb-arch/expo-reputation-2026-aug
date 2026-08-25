import { createFileRoute, useNavigate, Link, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet";
import {
  Inbox,
  Flag,
  Send,
  BarChart3,
  Settings,
  LogOut,
  ShieldAlert,
  CheckCircle2,
  Link2,
  ScrollText,
  CreditCard,
  Menu,
  Users,
  HeartHandshake,
} from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [{ title: "Dashboard — Expo Proxy Reputation" }, { name: "robots", content: "noindex" }],
  }),
  component: DashboardLayout,
});

function DashboardLayout() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate({ to: "/auth", search: { next: window.location.pathname } });
      } else {
        setEmail(data.session.user.email ?? null);
        setLoading(false);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) navigate({ to: "/auth", search: { next: window.location.pathname } });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  const nav = [
    { to: "/dashboard", label: "Overview", icon: BarChart3 },
    { to: "/dashboard/inbox", label: "Review Inbox", icon: Inbox },
    { to: "/dashboard/community", label: "Community & Impact", icon: HeartHandshake },
    { to: "/dashboard/customers-import", label: "Import Customers", icon: Users },
    { to: "/dashboard/approvals", label: "Approval Queue", icon: CheckCircle2 },
    { to: "/dashboard/removals", label: "Removal Queue", icon: ShieldAlert },
    { to: "/dashboard/campaigns", label: "Request Campaigns", icon: Send },
    { to: "/dashboard/scorecard", label: "Public Scorecard", icon: Flag },
    { to: "/dashboard/connections", label: "Connections", icon: Link2 },
    { to: "/dashboard/posting-log", label: "Posting Log", icon: ScrollText },
    { to: "/dashboard/stripe-readiness", label: "Stripe Readiness", icon: CreditCard },
    { to: "/dashboard/settings", label: "Settings", icon: Settings },
  ];

  const NavList = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav className="flex-1 p-3 space-y-1" aria-label="Dashboard">
      {nav.map(({ to, label, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          onClick={onNavigate}
          className="flex items-center gap-3 px-3 min-h-11 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&.active]:bg-accent [&.active]:text-foreground"
          activeOptions={{ exact: to === "/dashboard" }}
        >
          <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span className="truncate">{label}</span>
        </Link>
      ))}
    </nav>
  );

  const SidebarFooter = () => (
    <div className="p-3 border-t border-border/40">
      <div className="px-3 py-2 text-xs text-muted-foreground truncate">{email}</div>
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start min-h-11"
        onClick={handleSignOut}
      >
        <LogOut className="w-4 h-4 mr-2" aria-hidden="true" /> Sign out
      </Button>
    </div>
  );

  return (
    <div className="min-h-dvh bg-background flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 border-r border-border/40 bg-card/40 flex-col shrink-0">
        <div className="px-6 py-5 border-b border-border/40">
          <Link to="/" className="font-display text-lg font-semibold">
            Expo Proxy <span className="text-primary">Reputation</span>
          </Link>
        </div>
        <NavList />
        <SidebarFooter />
      </aside>

      {/* Mobile top bar */}
      <div className="flex flex-1 flex-col min-w-0">
        <header className="md:hidden sticky top-0 z-30 flex items-center gap-2 border-b border-border/40 bg-background/95 backdrop-blur px-3 h-14">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Open navigation menu"
                className="min-h-11 min-w-11"
              >
                <Menu className="w-5 h-5" aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72 flex flex-col">
              <SheetHeader className="px-6 py-5 border-b border-border/40 text-left">
                <SheetTitle asChild>
                  <Link
                    to="/"
                    className="font-display text-lg font-semibold"
                    onClick={() => setMobileOpen(false)}
                  >
                    Expo Proxy <span className="text-primary">Reputation</span>
                  </Link>
                </SheetTitle>
              </SheetHeader>
              <NavList onNavigate={() => setMobileOpen(false)} />
              <SidebarFooter />
            </SheetContent>
          </Sheet>
          <Link to="/" className="font-display text-base font-semibold truncate">
            Expo Proxy <span className="text-primary">Reputation</span>
          </Link>
        </header>
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
