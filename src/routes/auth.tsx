import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { BookOpen, GraduationCap, MailCheck } from "lucide-react";
import "@lovable.dev/cloud-auth-js/styles.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleIcon } from "@/components/tutorme/google-icon";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useSession } from "@/hooks/use-session";
import { safeRedirect } from "@/lib/safe-redirect";
import { cn } from "@/lib/utils";

type AuthSearch = {
  mode?: "signin" | "signup" | undefined;
  as?: "learner" | "tutor" | undefined;
  redirect?: string | undefined;
};

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): AuthSearch => ({
    mode: s["mode"] === "signup" ? "signup" : s["mode"] === "signin" ? "signin" : undefined,
    as: s["as"] === "tutor" ? "tutor" : s["as"] === "learner" ? "learner" : undefined,
    redirect: safeRedirect(s["redirect"]),
  }),
  head: () => ({
    meta: [
      { title: "Sign in or join — TUTORME." },
      { name: "description", content: "Create your free TUTORME. account as a learner or tutor." },
      { property: "og:title", content: "Join TUTORME." },
      { property: "og:description", content: "Create your free account as a learner or tutor." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

const signUpSchema = z.object({
  full_name: z.string().trim().min(2, "Please enter your name").max(100),
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
});

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { session, ready } = useSession();
  const [mode, setMode] = useState<"signin" | "signup">(search.mode ?? "signup");
  const [accountType, setAccountType] = useState<"learner" | "tutor">(search.as ?? "learner");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const destination = search.redirect ?? "/dashboard";

  useEffect(() => {
    if (ready && session) navigate({ to: destination, replace: true });
  }, [ready, session, destination, navigate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const parsed = signUpSchema.safeParse({ full_name: name, email, password });
        if (!parsed.success) return void toast.error(parsed.error.issues[0]?.message ?? "Please check the form");
        const { data, error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: `${window.location.origin}${destination}`,
            data: { full_name: parsed.data.full_name, account_type: accountType },
          },
        });
        if (error) return void toast.error(error.message);
        if (!data.session) setSentTo(parsed.data.email);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) return void toast.error(error.message);
      }
    } finally {
      setBusy(false);
    }
  }

  async function forgotPassword() {
    const parsed = z.string().trim().email().safeParse(email);
    if (!parsed.success) return void toast.error("Type your email above first.");
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) return void toast.error(error.message);
    toast.success("Check your inbox for a password reset link.");
  }

  async function social(provider: "google" | "lovable") {
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin,
    });
    if (result.error) toast.error("Sign-in didn't complete. Please try again.");
  }

  if (sentTo) {
    return (
      <div className="mx-auto max-w-md px-5 py-20 text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-3xl bg-accent text-accent-foreground">
          <MailCheck className="size-7" />
        </div>
        <h1 className="mt-6 text-4xl font-semibold">Check your email</h1>
        <p className="mt-3 text-muted-foreground">
          We sent a confirmation link to <b className="text-foreground">{sentTo}</b>. Click it to
          activate your account and you'll land straight in TUTORME.
        </p>
        <Button variant="outline" className="mt-8" onClick={() => { setSentTo(null); setMode("signin"); }}>
          Back to sign in
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-gradient-sky">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-14 md:py-20 lg:grid-cols-2">
        <div className="hidden lg:block">
          <h1 className="text-6xl leading-[1.05] font-semibold">
            {mode === "signup" ? (
              <>
                Your next lesson
                <br />
                starts <em className="font-normal text-leaf">here.</em>
              </>
            ) : (
              <>
                Welcome
                <br />
                <em className="font-normal text-leaf">back.</em>
              </>
            )}
          </h1>
          <p className="mt-5 max-w-md text-lg text-muted-foreground">
            Join a global community of learners and tutors. Free to join, free to learn with
            volunteers.
          </p>
        </div>

        <div className="mx-auto w-full max-w-md rounded-[2rem] border bg-card p-8 shadow-lift">
          <div className="flex rounded-full bg-muted p-1" role="tablist">
            {(["signup", "signin"] as const).map((m) => (
              <button
                key={m}
                role="tab"
                aria-selected={mode === m}
                onClick={() => setMode(m)}
                className={cn(
                  "flex-1 rounded-full py-2 text-sm font-semibold transition-colors",
                  mode === m ? "bg-card text-foreground shadow-soft" : "text-muted-foreground",
                )}
              >
                {m === "signup" ? "Create account" : "Sign in"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <>
                <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="I want to">
                  {(
                    [
                      { v: "learner", label: "Learn", sub: "Find a tutor", icon: BookOpen },
                      { v: "tutor", label: "Teach", sub: "Become a tutor", icon: GraduationCap },
                    ] as const
                  ).map((o) => (
                    <button
                      key={o.v}
                      type="button"
                      role="radio"
                      aria-checked={accountType === o.v}
                      onClick={() => setAccountType(o.v)}
                      className={cn(
                        "flex flex-col items-start gap-1 rounded-2xl border-2 p-4 text-left transition-colors",
                        accountType === o.v ? "border-primary bg-secondary/50" : "border-border hover:border-input",
                      )}
                    >
                      <o.icon className="size-5" />
                      <span className="font-bold">{o.label}</span>
                      <span className="text-xs text-muted-foreground">{o.sub}</span>
                    </button>
                  ))}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} autoComplete="name" className="h-11 rounded-xl" />
                </div>
              </>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} autoComplete="email" className="h-11 rounded-xl" required />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                {mode === "signin" && (
                  <button type="button" onClick={forgotPassword} className="text-xs font-semibold text-muted-foreground hover:text-foreground">
                    Forgot password?
                  </button>
                )}
              </div>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} maxLength={72} autoComplete={mode === "signup" ? "new-password" : "current-password"} className="h-11 rounded-xl" required />
            </div>
            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={busy}>
              {busy ? "Please wait…" : mode === "signup" ? "Create free account" : "Sign in"}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>
          <div className="space-y-2">
            <Button type="button" variant="google" className="h-11 w-full rounded-full" onClick={() => social("google")}>
              <GoogleIcon /> Continue with Google
            </Button>
            <button type="button" className="lovable-auth-button w-full" onClick={() => social("lovable")}>
              Continue with Lovable
            </button>
          </div>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            By continuing you agree to learn kindly and teach honestly. <Link to="/how-it-works" className="underline">How it works</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
