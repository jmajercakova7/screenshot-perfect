import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password — TUTORME." },
      { name: "description", content: "Choose a new password for your TUTORME. account." },
      { property: "og:title", content: "Set a new password — TUTORME." },
      { property: "og:description", content: "Choose a new password for your TUTORME. account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) return void toast.error("Password must be at least 8 characters");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return void toast.error(error.message);
    toast.success("Password updated");
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="mx-auto max-w-md px-5 py-20">
      <div className="rounded-[2rem] border bg-card p-8 shadow-lift">
        <h1 className="text-3xl font-semibold">Set a new password</h1>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="new-password">New password</Label>
            <Input id="new-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" maxLength={72} className="h-11 rounded-xl" />
          </div>
          <Button type="submit" variant="hero" size="lg" className="w-full" disabled={busy}>
            Save password
          </Button>
        </form>
      </div>
    </div>
  );
}
