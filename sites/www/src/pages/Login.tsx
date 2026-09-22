// Login.tsx — Supabase Auth against the agency URL configured in Settings.
// No password is compiled into the client; the user supplies both fields.

import { useState } from "react";
import type { FormEvent } from "react";

import { getSupabaseClient } from "../lib/supabaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setStatus(null);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setStatus("Signed in.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="scene prose-scene">
      <h1 className="page-title">Login</h1>
      <p className="page-lede">Auth runs against the Supabase URL in Settings — agency project only.</p>
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        <button id="login-submit" type="submit" className="btn-primary" disabled={busy}>
          {busy ? "Signing in\u2026" : "Sign in"}
        </button>
        {status && <p className="auth-status">{status}</p>}
      </form>
    </div>
  );
}
