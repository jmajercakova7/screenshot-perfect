import { Link } from "@tanstack/react-router";
import { Logo } from "./logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/70 bg-card">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 md:flex-row md:items-end md:justify-between">
        <div>
          <Logo />
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Making education more accessible, one connection at a time.
          </p>
        </div>
        <div className="flex gap-6 text-sm text-muted-foreground">
          <Link to="/tutors" className="hover:text-foreground">
            Find a tutor
          </Link>
          <Link to="/how-it-works" className="hover:text-foreground">
            How it works
          </Link>
          <Link to="/auth" search={{ mode: "signup" }} className="hover:text-foreground">
            Join
          </Link>
        </div>
      </div>
    </footer>
  );
}
