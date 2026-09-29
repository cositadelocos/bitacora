import { useState } from "react";
import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { authClient, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/login")({
  component: Login,
});

function Login() {
  const { user, isPending } = useCurrentUserState();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  if (isPending) {
    return (
      <div className="desk-screen center-note">
        <p className="quiet-note">…</p>
      </div>
    );
  }
  if (user) return <Navigate to="/editar" />;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      if (mode === "up") {
        const result = await authClient.signUp.email({
          name: name.trim() || "Autor",
          email: email.trim(),
          password,
        });
        if (result.error) {
          setError(result.error.message ?? "No se pudo crear la cuenta");
          return;
        }
      } else {
        const result = await authClient.signIn.email({ email: email.trim(), password });
        if (result.error) {
          setError(result.error.message ?? "No se pudo entrar");
          return;
        }
      }
      window.location.assign("/editar");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo entrar");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="desk-screen center-note">
      <form className="paper-dialog static login-card" onSubmit={(event) => void onSubmit(event)}>
        <p className="quiet-note">Cuaderno</p>
        <h1>{mode === "up" ? "Crear cuenta de autor" : "Entrar al estudio"}</h1>
        <p className="dialog-copy">
          Esto es solo para quien edita. Quien abre el enlace del cuaderno no entra, no se registra y no usa X.
        </p>
        {mode === "up" ? (
          <label className="field">
            <span>Nombre</span>
            <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" />
          </label>
        ) : null}
        <label className="field">
          <span>Correo</span>
          <input
            type="email"
            required
            value={email}
            autoComplete="email"
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label className="field">
          <span>Contraseña</span>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            autoComplete={mode === "up" ? "new-password" : "current-password"}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        <button type="submit" className="ink-btn" disabled={pending}>
          {pending ? "Un momento…" : mode === "up" ? "Crear cuenta" : "Entrar"}
        </button>
        <button type="button" className="quiet-btn ghost" onClick={() => setMode(mode === "up" ? "in" : "up")}>
          {mode === "up" ? "Ya tengo cuenta" : "Crear la cuenta de autor"}
        </button>
        <button
          type="button"
          className="quiet-btn"
          onClick={() => void signIn("grok-google", { callbackURL: "/editar" })}
        >
          Entrar con Google
        </button>
        <Link to="/" className="quiet-btn view-link">
          Ver el cuaderno sin cuenta
        </Link>
      </form>
    </main>
  );
}
