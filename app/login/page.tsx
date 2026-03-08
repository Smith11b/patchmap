"use client";

import Link from "next/link";
import { useState } from "react";
import { BrandLockup } from "@/app/components/brand-lockup";
import { supabase } from "@/lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function login() {
    setBusy(true);
    setStatus(null);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithOtp({ email });

    if (signInError) {
      setError(signInError.message);
    } else {
      setStatus("Magic link sent. Check your email to complete sign-in.");
    }

    setBusy(false);
  }

  return (
    <main className="pm-shell">
      <section className="pm-page-intro pm-card mx-auto max-w-xl p-6 md:p-8">
        <div className="pm-card-header">
          <div>
            <BrandLockup subtitle="Secure workspace authentication" />
            <h1 className="pm-hero-title mt-4 text-[2rem]">PatchMap Login</h1>
            <p className="pm-hero-subtitle">
              Authenticate with your workspace email to access PR registrations and review drafts.
            </p>
          </div>
        </div>

        <div className="grid gap-4">
          <label className="pm-label" htmlFor="email">
            Work Email
            <input
              id="email"
              className="pm-input"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          {error ? <div className="pm-alert pm-alert-error">{error}</div> : null}
          {status ? <div className="pm-alert pm-alert-success">{status}</div> : null}

          <button
            className="pm-button pm-button-primary w-full"
            type="button"
            onClick={login}
            disabled={busy || !email.trim()}
          >
            {busy ? "Sending Link..." : "Send Magic Link"}
          </button>

          <Link className="pm-button pm-button-secondary w-full" href="/register">
            Go To PR Registration
          </Link>
        </div>
      </section>
    </main>
  );
}
