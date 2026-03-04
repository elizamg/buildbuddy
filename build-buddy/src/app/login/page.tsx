"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSubmitted(true);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm rounded-xl border border-border bg-panel p-8 shadow-sm">
        <h1 className="mb-2 text-2xl font-bold bg-gradient-to-r from-header-from to-header-to bg-clip-text text-transparent">
          BuildBuddy
        </h1>
        <p className="mb-6 text-sm text-foreground/60">Sign in to continue</p>

        {submitted ? (
          <p className="text-sm text-foreground">
            Check your email for a magic link to sign in.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-foreground/50 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg px-4 py-2.5 text-sm font-medium bg-accent text-white hover:bg-accent/90 active:scale-[0.98] transition-colors disabled:opacity-50"
            >
              {loading ? "Sending…" : "Send magic link"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
