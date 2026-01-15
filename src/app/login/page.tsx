"use client";

import { signInWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";
import { auth } from "@/lib/firebaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    try {
      await signInWithEmailAndPassword(auth, email, pw);
      setMsg("✅ Logged in.");
    } catch (err: any) {
      setMsg(err?.message ?? "Login failed");
    }
  }

  return (
    <div style={{ maxWidth: 520 }}>
      <h1>Login</h1>

      <form onSubmit={submit} style={{ display: "grid", gap: 10, marginTop: 12 }}>
        <input
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          placeholder="Password"
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          required
        />
        <button type="submit">Login</button>
      </form>

      {msg && <p style={{ marginTop: 12 }}>{msg}</p>}
    </div>
  );
}
