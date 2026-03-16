"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { supabase } from "@/lib/supabase";

function LoginContent() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/register";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function buildRedirectTo() {
    if (typeof window === "undefined") return undefined;

    const callbackUrl = new URL("/auth/callback", window.location.origin);
    callbackUrl.searchParams.set("next", next);
    return callbackUrl.toString();
  }

  async function loginWithOtp() {
    setBusy(true);
    setBusyAction("otp");
    setStatus(null);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: buildRedirectTo() },
    });

    if (signInError) {
      setError(signInError.message);
    } else {
      setStatus("Magic link sent. Check your email to complete sign-in.");
    }

    setBusy(false);
    setBusyAction(null);
  }

  async function loginWithPassword() {
    setBusy(true);
    setBusyAction("password-signin");
    setStatus(null);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
    } else if (typeof window !== "undefined") {
      window.location.href = next;
    }

    setBusy(false);
    setBusyAction(null);
  }

  async function signUpWithPassword() {
    setBusy(true);
    setBusyAction("password-signup");
    setStatus(null);
    setError(null);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: buildRedirectTo(),
      },
    });

    if (signUpError) {
      setError(signUpError.message);
    } else if (data.session && typeof window !== "undefined") {
      window.location.href = next;
    } else {
      setStatus("Account created. Check your email to verify the address before signing in.");
    }

    setBusy(false);
    setBusyAction(null);
  }

  async function loginWithOAuth(provider: "google" | "github") {
    setBusy(true);
    setBusyAction(provider);
    setStatus(null);
    setError(null);

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: buildRedirectTo(),
      },
    });

    if (oauthError) {
      setError(oauthError.message);
      setBusy(false);
      setBusyAction(null);
    }
  }

  return (
    <main className="pm-shell">
      <section className="pm-page-intro pm-card mx-auto max-w-3xl p-6 md:p-8">
        <div className="pm-card-header">
          <div>
            <div className="pm-context-kicker">Secure workspace authentication</div>
            <h1 className="pm-hero-title mt-2 text-[2rem]">PatchMap Login</h1>
            <p className="pm-hero-subtitle">
              Use email + password, Google, GitHub, or a magic link to access workspace-linked PR
              registrations and review drafts.
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
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

            <label className="pm-label" htmlFor="password">
              Password
              <input
                id="password"
                className="pm-input"
                type="password"
                placeholder="Enter a password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>

            {error ? <div className="pm-alert pm-alert-error">{error}</div> : null}
            {status ? <div className="pm-alert pm-alert-success">{status}</div> : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                className="pm-button pm-button-primary w-full"
                type="button"
                onClick={loginWithPassword}
                disabled={busy || !email.trim() || !password.trim()}
              >
                {busyAction === "password-signin" ? "Signing In..." : "Sign In With Password"}
              </button>

              <button
                className="pm-button pm-button-secondary w-full"
                type="button"
                onClick={signUpWithPassword}
                disabled={busy || !email.trim() || password.length < 8}
              >
                {busyAction === "password-signup" ? "Creating Account..." : "Create Account"}
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                className="pm-button pm-button-secondary w-full"
                type="button"
                onClick={() => loginWithOAuth("google")}
                disabled={busy}
              >
                {busyAction === "google" ? "Redirecting..." : "Continue With Google"}
              </button>

              <button
                className="pm-button pm-button-secondary w-full"
                type="button"
                onClick={() => loginWithOAuth("github")}
                disabled={busy}
              >
                {busyAction === "github" ? "Redirecting..." : "Continue With GitHub"}
              </button>
            </div>
          </div>

          <aside className="rounded-[14px] border border-[var(--pm-border)] bg-[var(--pm-surface-muted)] p-4">
            <div className="pm-context-kicker">Fallback Access</div>
            <h2 className="pm-card-title mt-2">Magic Link</h2>
            <p className="pm-card-subtitle">
              Keep OTP available for teammates who are not ready for passwords or social login yet.
            </p>

            <button
              className="pm-button pm-button-secondary mt-4 w-full"
              type="button"
              onClick={loginWithOtp}
              disabled={busy || !email.trim()}
            >
              {busyAction === "otp" ? "Sending Link..." : "Send Magic Link"}
            </button>

            <p className="mt-4 text-sm text-[var(--pm-text-soft)]">
              Password accounts use email as the login identifier. If you want a separate username later,
              that needs a profile field and a custom sign-in lookup.
            </p>

            <Link className="pm-button pm-button-secondary mt-4 w-full" href="/">
              Back To Home
            </Link>
          </aside>
        </div>
      </section>
    </main>
  );
}

export default function Login() {
  return (
    <Suspense
      fallback={
        <main className="pm-shell">
          <section className="pm-page-intro pm-card mx-auto max-w-3xl p-6 md:p-8">
            Loading login...
          </section>
        </main>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
