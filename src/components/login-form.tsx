import { Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Loader2, Lock, ShieldCheck, Warehouse } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useStore } from "@/lib/store";
import { DEMO_USERS } from "@/lib/mock-data";
import type { Role } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

type Props = {
  role: Role;
  title: string;
  tagline: string;
  description: string;
  bullets: string[];
  redirect: string;
  accent: "primary" | "warning" | "info";
};

export function LoginScreen({ role, title, tagline, description, bullets, redirect, accent }: Props) {
  const { login } = useStore();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const accentClass = {
    primary: "text-primary border-primary/30 bg-primary/10",
    warning: "text-warning border-warning/30 bg-warning/10",
    info: "text-info border-info/30 bg-info/10",
  }[accent];

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) return setError("Email is required.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return setError("Enter a valid email address.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");

    setLoading(true);
    window.setTimeout(() => {
      const res = login(role, email, password, remember);
      setLoading(false);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      toast.success(`Welcome back, ${res.user.name}`);
      navigate({ to: redirect as never });
    }, 550);
  };

  const demo = DEMO_USERS[role];

  return (
    <div className="relative grid min-h-screen lg:grid-cols-2">
      <div className="absolute right-4 top-4 z-20">
        <ThemeToggle />
      </div>
      <div className="relative hidden flex-col justify-between overflow-hidden border-r border-border bg-sidebar p-10 lg:flex">
        <div className="grid-lines absolute inset-0 opacity-60" />
        <div className="relative">
          <Link to="/" className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Warehouse className="size-5" />
            </span>
            <span className="font-display text-lg font-bold">SmartFulfill</span>
          </Link>
        </div>
        <div className="relative max-w-md">
          <p className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]", accentClass)}>
            <ShieldCheck className="size-3.5" /> {tagline}
          </p>
          <h2 className="mt-5 font-display text-4xl font-bold leading-tight">{title}</h2>
          <p className="mt-3 text-sm text-muted-foreground">{description}</p>
          <ul className="mt-6 space-y-2.5">
            {bullets.map((b) => (
              <li key={b} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                {b}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-muted-foreground">Visibility → Decision → Action → Resolution → Analytics</p>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="mb-6 lg:hidden">
            <Link to="/" className="flex items-center gap-2">
              <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
                <Warehouse className="size-5" />
              </span>
              <span className="font-display text-base font-bold">SmartFulfill</span>
            </Link>
          </div>

          <h1 className="font-display text-2xl font-bold">Sign in · {role} portal</h1>
          <p className="mt-1 text-sm text-muted-foreground">{tagline}</p>

          <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email or username</Label>
              <Input id="email" value={email} autoComplete="username" onChange={(e) => setEmail(e.target.value)} placeholder={demo.email} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={show ? "text" : "password"}
                  value={password}
                  autoComplete="current-password"
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  aria-label={show ? "Hide password" : "Show password"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                >
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                <Checkbox checked={remember} onCheckedChange={(v) => setRemember(!!v)} /> Remember me
              </label>
              <Dialog>
                <DialogTrigger asChild>
                  <Button type="button" variant="link" size="sm" className="h-auto p-0">
                    Forgot password?
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Reset your password</DialogTitle>
                    <DialogDescription>
                      Password resets are handled by the warehouse IT desk. Use the access credentials below to continue, or contact
                      it-desk@smartfulfill.io.
                    </DialogDescription>
                  </DialogHeader>
                </DialogContent>
              </Dialog>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Verifying credentials…
                </>
              ) : (
                <>
                  <Lock className="size-4" /> Sign in
                </>
              )}
            </Button>
          </form>

          <Card className="mt-6 gap-2 border-dashed p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Access credentials</p>
            <p className="font-mono text-sm">{demo.email}</p>
            <p className="font-mono text-sm">{demo.password}</p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mt-2 w-fit"
              onClick={() => {
                setEmail(demo.email);
                setPassword(demo.password);
                setError(null);
              }}
            >
              Autofill credentials
            </Button>
          </Card>

          <div className="mt-6 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span>Other portals:</span>
            {(["admin", "worker", "customer"] as Role[])
              .filter((r) => r !== role)
              .map((r) => (
                <Link key={r} to={`/login/${r}` as never} className="font-medium capitalize text-primary hover:underline">
                  {r}
                </Link>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
