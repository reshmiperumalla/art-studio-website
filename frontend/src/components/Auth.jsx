import { useState } from "react";
import { api } from "../api";

export default function Auth({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function change(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const body =
        mode === "login" ? { email: form.email, password: form.password } : form;
      const data = await api(`/auth/${mode}`, { method: "POST", body });
      onLogin(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <h1>Art Studio</h1>
      <p className="muted">
        {mode === "login" ? "Log in to browse and order." : "Create a customer account."}
      </p>
      <form onSubmit={submit}>
        {mode === "register" && (
          <label>
            Name
            <input name="name" value={form.name} onChange={change} required />
          </label>
        )}
        <label>
          Email
          <input name="email" type="email" value={form.email} onChange={change} required />
        </label>
        <label>
          Password
          <input name="password" type="password" value={form.password} onChange={change} required />
        </label>
        {error && <p className="msg error">{error}</p>}
        <button type="submit" disabled={busy}>
          {busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
        </button>
      </form>
      <button className="link" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>
        {mode === "login" ? "New here? Create an account" : "Already have an account? Log in"}
      </button>
    </div>
  );
}
