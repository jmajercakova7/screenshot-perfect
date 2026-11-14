import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { Logo } from "./logo";

export function SiteHeader() {
  const { session, ready } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
            <Link
              to="/tutors"
              className="transition-colors hover:text-foreground"
              activeProps={{ className: "text-foreground" }}
            >
              Find a tutor
            </Link>
            <Link
              to="/how-it-works"
              className="transition-colors hover:text-foreground"
              activeProps={{ className: "text-foreground" }}
            >
              How it works
            </Link>
          </nav>
        </div>
        <div className="flex min-w-[10rem] items-center justify-end gap-2">
          {!ready ? null : session ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/dashboard">
                  <LayoutDashboard /> My learning
                </Link>
              </Button>
              <Button variant="outline" size="sm" onClick={signOut}>
                <LogOut /> Sign out
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/auth" search={{ mode: "signin" }}>
                  Sign in
                </Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/auth" search={{ mode: "signup" }}>
                  Join free
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
