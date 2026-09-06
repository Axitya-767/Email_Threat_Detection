'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// # TODO: Real authentication (FastAPI + JWT) gets wired in during the backend round.
// Currently using mock authentication for presentation and demo evaluation.
const DEMO_EMAIL = "analyst@demo.com";
const DEMO_PASSWORD = "demo1234";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem("isAuthenticated") === "true") {
      router.replace("/");
    }
  }, [router]);

  const handleAutofill = () => {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setError("Please provide both email address and password.");
      return;
    }

    if (!trimmedEmail.includes("@") || !trimmedEmail.includes(".")) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsLoading(true);

    try {
      // Simulate brief network / cryptographic verification latency
      await new Promise((resolve) => setTimeout(resolve, 500));

      if (typeof window !== "undefined") {
        sessionStorage.setItem("isAuthenticated", "true");
        sessionStorage.setItem("userEmail", trimmedEmail);
        sessionStorage.setItem("loginTimestamp", new Date().toISOString());
      }

      router.push("/");
    } catch (err) {
      setError("An unexpected error occurred during sign-in. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div
      className="w-full max-w-[440px] shrink-0 rounded-xl border border-edge bg-surface p-6 shadow-2xl sm:p-8"
      style={{ width: "100%", maxWidth: "440px" }}
    >
      {/* Brand Header */}
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-edge bg-canvas text-accent shadow-inner">
          <svg
            className="h-6 w-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        </div>
        <h1 className="text-xl font-bold tracking-tight text-ink">
          Email Threat Forensics
        </h1>
        <p className="mt-1 text-xs text-dim">
          Threat Intelligence & Deep Header Forensic Platform
        </p>
      </div>

      {/* Demo Credentials Box */}
      <div className="mb-6 rounded-lg border border-edge bg-canvas/70 p-3.5 text-xs">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <svg
              className="mt-0.5 h-4 w-4 shrink-0 text-accent"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <div>
              <div className="font-semibold text-ink">Demo credentials:</div>
              <div className="mt-0.5 font-mono text-[11px] text-dim">
                <span className="text-ink">analyst@demo.com</span> /{" "}
                <span className="text-ink">demo1234</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleAutofill}
            className="rounded-md border border-edge bg-surface px-2.5 py-1 text-xs font-medium text-accent transition-colors hover:border-accent hover:bg-canvas"
          >
            Auto-fill
          </button>
        </div>
      </div>

      {/* Inline Error Message */}
      {error && (
        <div
          role="alert"
          className="mb-5 flex items-center gap-2.5 rounded-lg border border-risk-red/40 bg-risk-red/10 p-3 text-xs text-risk-red"
        >
          <svg
            className="h-4 w-4 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Sign In Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="login-email"
            className="block text-xs font-semibold uppercase tracking-wider text-ink"
          >
            Analyst Email
          </label>
          <div className="relative mt-1.5 w-full">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-dim">
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            </div>
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError("");
              }}
              placeholder="analyst@demo.com"
              disabled={isLoading}
              className="block w-full rounded-lg border border-edge bg-canvas py-2.5 pr-4 pl-10 text-sm text-ink placeholder:text-dim/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50"
              style={{ width: "100%", boxSizing: "border-box" }}
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="login-password"
            className="block text-xs font-semibold uppercase tracking-wider text-ink"
          >
            Password
          </label>
          <div className="relative mt-1.5 w-full">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-dim">
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <input
              id="login-password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError("");
              }}
              placeholder="••••••••"
              disabled={isLoading}
              className="block w-full rounded-lg border border-edge bg-canvas py-2.5 pr-10 pl-10 text-sm text-ink placeholder:text-dim/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50"
              style={{ width: "100%", boxSizing: "border-box" }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isLoading}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-dim hover:text-ink focus:outline-none"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                  <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                  <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                  <line x1="2" y1="2" x2="22" y2="22" />
                </svg>
              ) : (
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-canvas shadow-md shadow-accent/20 transition-all hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            style={{ width: "100%" }}
          >
            {isLoading ? (
              <>
                <svg
                  className="h-4 w-4 animate-spin text-canvas"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <span>Sign in to Platform</span>
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Security note / SOC disclaimer */}
      <div className="mt-6 border-t border-edge/60 pt-4 text-center text-[11px] text-dim">
        <p>Authorized analyst portal • All sessions logged to SOC telemetry</p>
      </div>
    </div>
  );
}
