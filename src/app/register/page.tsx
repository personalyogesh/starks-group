"use client";

import { createUserWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";
import { auth } from "@/lib/firebaseClient";
import { ensureUserDoc } from "@/lib/firestore";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pw);

      await ensureUserDoc(cred.user.uid, {
        name,
        email,
        phone,
        status: "pending",
        role: "member",
      });

      setMsg("✅ Registered! Your account is pending admin approval.");
    } catch (err: any) {
      setMsg(err?.message ?? "Registration failed");
    }
  }

  return (
    <div style={{ maxWidth: 520 }}>
      <h1>Register</h1>
      <p>After registering, an admin must approve your account.</p>

      <form onSubmit={submit} style={{ display: "grid", gap: 10, marginTop: 12 }}>
        <input placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <input placeholder="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input placeholder="Password" type="password" value={pw} onChange={(e) => setPw(e.target.value)} required />

        <button type="submit">Create account</button>
      </form>

      {msg && <p style={{ marginTop: 12 }}>{msg}</p>}
    </div>
  );
}
