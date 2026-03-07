"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");

  const login = async () => {
    await supabase.auth.signInWithOtp({
      email,
    });
    alert("Check your email for login link");
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>PatchMap Login</h1>

      <input
        type="email"
        placeholder="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <button onClick={login}>Login</button>
    </div>
  );
}
